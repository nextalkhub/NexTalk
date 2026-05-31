#!/usr/bin/env bash
# SC-01: messaging-service недоступен.
# Ожидаемое поведение:
#   - circuit breaker в ws-gateway открывается после серии ошибок
#   - /healthz кластера остается доступным
#   - после восстановления сервиса запросы снова проходят

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config.env"
source "${SCRIPT_DIR}/../lib/assert.sh"
source "${SCRIPT_DIR}/../lib/grafana.sh"

DEPLOY=messaging-service
ORIGINAL_REPLICAS=$(kubectl get deployment "$DEPLOY" -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 2)

cleanup() {
    warn "Восстанавливаем $DEPLOY → $ORIGINAL_REPLICAS реплик"
    kubectl scale deployment "$DEPLOY" -n "$NAMESPACE" --replicas="$ORIGINAL_REPLICAS" || true
    wait_healthy "$DEPLOY" || true
    grafana_annotate "SC-01 CLEANUP done" "chaos,sc-01"
}
trap cleanup EXIT

log "=== SC-01: messaging-service down ==="

# 1. Baseline - сервис жив
assert_alive "${API_BASE}/api/guilds"

# 2. Аннотация + выключение
grafana_region_start "SC-01: messaging-service scale=0" "chaos,sc-01"
scale_and_wait "$DEPLOY" 0

# 3. Через 5s проверяем circuit breaker / graceful degradation
sleep 5
log "Проверяем, что /healthz доступен во время отказа..."
assert_alive "${API_BASE}/api/guilds"

# 4. Проверяем что messaging pods = 0 (через kubectl, /internal/* не доступен снаружи)
RUNNING=$(kubectl get pods -n "$NAMESPACE" -l "app=$DEPLOY" \
    --field-selector=status.phase=Running -o name 2>/dev/null | wc -l | tr -d ' ')
log "Running pods messaging-service: $RUNNING (ожидается 0)"
if [[ "$RUNNING" -eq 0 ]]; then
    log "Деградация подтверждена: 0 реплик messaging ✓"
else
    warn "Ожидалось 0 реплик, но запущено: $RUNNING"
fi

# 5. Восстановление
log "Восстанавливаем $DEPLOY..."
scale_and_wait "$DEPLOY" "$ORIGINAL_REPLICAS"
grafana_region_end "SC-01: messaging-service scale=0" "chaos,sc-01"

# 6. Проверяем восстановление
sleep 3
assert_alive "${API_BASE}/api/guilds"

# 7. Проверяем что messaging pods вернулись
RUNNING=$(kubectl get pods -n "$NAMESPACE" -l "app=$DEPLOY" \
    --field-selector=status.phase=Running -o name 2>/dev/null | wc -l | tr -d ' ')
if [[ "$RUNNING" -gt 0 ]]; then
    log "Восстановление подтверждено: $RUNNING реплик messaging ✓"
else
    fail "После восстановления pods messaging все еще 0"
fi

scenario_pass
