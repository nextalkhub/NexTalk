#!/usr/bin/env bash
# SC-05: масштабирование messaging-service под нагрузкой (0→1→3→1).
# Companion k6 должен быть уже запущен оркестратором.
# Ожидаемое поведение:
#   - при scale=0 запросы деградируют (circuit breaker)
#   - при scale=1 сервис принимает трафик
#   - при scale=3 latency снижается, throughput растет
#   - при scale=1 снова - без провалов

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config.env"
source "${SCRIPT_DIR}/../lib/assert.sh"
source "${SCRIPT_DIR}/../lib/grafana.sh"

DEPLOY=messaging-service
ORIGINAL=$(kubectl get deployment "$DEPLOY" -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 2)

cleanup() {
    warn "Восстанавливаем $DEPLOY → $ORIGINAL"
    kubectl scale deployment "$DEPLOY" -n "$NAMESPACE" --replicas="$ORIGINAL" || true
    wait_healthy "$DEPLOY" || true
}
trap cleanup EXIT

log "=== SC-05: scale messaging under load ==="

assert_alive "${API_BASE}/api/guilds"
log "Текущие реплики: $ORIGINAL"

# Scale 0
grafana_annotate "SC-05: scale=0 start" "chaos,sc-05"
scale_and_wait "$DEPLOY" 0
log "Ждем 15s при scale=0 (наблюдаем деградацию в Grafana)..."
sleep 15

# Scale 1
grafana_annotate "SC-05: scale=1" "chaos,sc-05"
scale_and_wait "$DEPLOY" 1
sleep 10
assert_alive "${API_BASE}/api/guilds"

# Scale 3
grafana_annotate "SC-05: scale=3 (burst)" "chaos,sc-05"
scale_and_wait "$DEPLOY" 3
log "Держим 3 реплики 30s..."
sleep 30
assert_alive "${API_BASE}/api/guilds"

# Scale 1 (обратно)
grafana_annotate "SC-05: scale back to 1" "chaos,sc-05"
scale_and_wait "$DEPLOY" 1
sleep 10
assert_alive "${API_BASE}/api/guilds"

# Restore to original
grafana_annotate "SC-05: restore to original ($ORIGINAL)" "chaos,sc-05"
scale_and_wait "$DEPLOY" "$ORIGINAL"

scenario_pass
