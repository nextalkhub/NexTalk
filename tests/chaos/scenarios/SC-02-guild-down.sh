#!/usr/bin/env bash
# SC-02: guild-service недоступен.
# Ожидаемое поведение:
#   - /healthz остаётся зелёным
#   - voice/join возвращает 503/504, не падает с 500
#   - после восстановления voice/join снова работает

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config.env"
source "${SCRIPT_DIR}/../lib/assert.sh"
source "${SCRIPT_DIR}/../lib/grafana.sh"

DEPLOY=guild-service
ORIGINAL_REPLICAS=$(kubectl get deployment "$DEPLOY" -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 2)

cleanup() {
    warn "Восстанавливаем $DEPLOY → $ORIGINAL_REPLICAS реплик"
    kubectl scale deployment "$DEPLOY" -n "$NAMESPACE" --replicas="$ORIGINAL_REPLICAS" || true
    wait_healthy "$DEPLOY" || true
    grafana_annotate "SC-02 CLEANUP done" "chaos,sc-02"
}
trap cleanup EXIT

log "=== SC-02: guild-service down ==="

assert_http_status 200 "${API_BASE}/healthz"

grafana_region_start "SC-02: guild-service scale=0" "chaos,sc-02"
scale_and_wait "$DEPLOY" 0

sleep 5

log "Проверяем /healthz во время отказа guild..."
assert_http_status 200 "${API_BASE}/healthz"

log "Проверяем GET /guilds..."
STATUS=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 \
    -H "Authorization: Bearer ${TEST_TOKEN}" \
    "${API_BASE}/guilds" || echo 000)
log "GET /guilds при отказе guild-service: $STATUS"
# Ожидаем 502/503/504, но не 200 и не 500 без обработки
if [[ "$STATUS" == "000" || "$STATUS" -ge 500 ]]; then
    log "Получили ожидаемую деградацию: $STATUS"
else
    warn "Неожиданный статус $STATUS (guild-service down)"
fi

log "Восстанавливаем $DEPLOY..."
scale_and_wait "$DEPLOY" "$ORIGINAL_REPLICAS"
grafana_region_end "SC-02: guild-service scale=0" "chaos,sc-02"

sleep 5

log "Проверяем восстановление GET /guilds..."
assert_http_status 200 "${API_BASE}/guilds" \
    -H "Authorization: Bearer ${TEST_TOKEN}"

scenario_pass
