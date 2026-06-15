#!/usr/bin/env bash
# SC-02: guild-service недоступен (scale=0).
# Ожидаемое поведение:
#   - SPA (/) остаётся доступной (ingress + web-spa живы)
#   - /api/guilds корректно деградирует (5xx/timeout от ingress, не 200)
#   - после восстановления /api/guilds снова отвечает 200

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

hypothesis "Падение guild-service: SPA (/) остаётся живой, /api/guilds честно деградирует в 5xx (а не отдаёт 200 или падает в необработанный 500)."
slo "SPA / доступна; /api/guilds → 5xx/timeout во время отказа; 200 после восстановления"

assert_alive "${API_BASE}/api/guilds"

grafana_region_start "SC-02: guild-service scale=0" "chaos,sc-02"
scale_and_wait "$DEPLOY" 0

sleep 5

log "Проверяем ingress во время отказа guild..."
assert_alive "${API_BASE}/"

log "Проверяем GET /guilds..."
STATUS=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 \
    -H "Authorization: Bearer ${TEST_TOKEN}" \
    "${API_BASE}/api/guilds" || echo 000)
log "GET /guilds при отказе guild-service: $STATUS"
# Ожидаем 5xx или timeout (000). Если guild down, а /api/guilds вернул 2xx/3xx/4xx —
# это неверная деградация (или сервис не опущен): проваливаем.
if [[ "$STATUS" == "000" || "$STATUS" -ge 500 ]]; then
    log "Получили ожидаемую деградацию: $STATUS ✓"
else
    fail "guild-service down, но /api/guilds вернул $STATUS (ожидалась деградация 5xx/timeout)"
fi

log "Восстанавливаем $DEPLOY..."
scale_and_wait "$DEPLOY" "$ORIGINAL_REPLICAS"
grafana_region_end "SC-02: guild-service scale=0" "chaos,sc-02"

sleep 5

log "Проверяем восстановление GET /guilds..."
assert_http_status 200 "${API_BASE}/api/guilds" \
    -H "Authorization: Bearer ${TEST_TOKEN}"

scenario_pass
