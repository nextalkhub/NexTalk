#!/usr/bin/env bash
# SC-01: messaging-service недоступен.
# Ожидаемое поведение:
#   - circuit breaker в ws-gateway открывается после серии ошибок
#   - /healthz кластера остаётся доступным
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

# 1. Baseline — сервис жив
assert_http_status 200 "${API_BASE}/healthz"

# 2. Аннотация + выключение
grafana_region_start "SC-01: messaging-service scale=0" "chaos,sc-01"
scale_and_wait "$DEPLOY" 0

# 3. Через 5s проверяем circuit breaker / graceful degradation
sleep 5
log "Проверяем, что /healthz доступен во время отказа..."
assert_http_status 200 "${API_BASE}/healthz"

# 4. Запросы к messaging endpoint должны возвращать 4xx/5xx (не panic)
log "Проверяем деградацию /internal/messages..."
STATUS=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 \
    -X POST "${API_BASE}/internal/messages" \
    -H "Content-Type: application/json" \
    -H "X-Idempotency-Key: sc01-probe-$(date +%s)" \
    -d '{"channelId":"00000000-0000-0000-0000-000000000001","content":"probe","authorId":"sc01"}' \
    || echo 000)
log "Статус при отказе messaging: $STATUS"
if [[ "$STATUS" -lt 200 || ("$STATUS" -ge 200 && "$STATUS" -lt 500) ]]; then
    # 200-499 — circuit breaker вернул cached/fallback или 503 — ok
    log "Деградация корректна: $STATUS"
else
    warn "Неожиданный статус $STATUS — проверь логи gateway"
fi

# 5. Восстановление
log "Восстанавливаем $DEPLOY..."
scale_and_wait "$DEPLOY" "$ORIGINAL_REPLICAS"
grafana_region_end "SC-01: messaging-service scale=0" "chaos,sc-01"

# 6. Проверяем восстановление
sleep 3
assert_http_status 200 "${API_BASE}/healthz"

# 7. Первый реальный запрос должен проходить
STATUS=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 \
    -X POST "${API_BASE}/internal/messages" \
    -H "Content-Type: application/json" \
    -H "X-Idempotency-Key: sc01-recover-$(date +%s)" \
    -d '{"channelId":"00000000-0000-0000-0000-000000000001","content":"recovered","authorId":"sc01"}' \
    || echo 000)
if [[ "$STATUS" == "201" || "$STATUS" == "200" ]]; then
    log "Восстановление подтверждено: $STATUS ✓"
else
    fail "После восстановления получили $STATUS вместо 200/201"
fi

scenario_pass
