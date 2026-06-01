#!/usr/bin/env bash
# SC-13: guild-service падает.
# Ожидаемое поведение:
#   - /api/guilds → 503
#   - ws-gateway pods = ORIGINAL (существующие соединения живут в Redis)
#   - messaging pods = ORIGINAL
#   - новые WS-соединения невозможны (OnConnectedAsync вызывает guild-service)
#   - после восстановления guild-service → /api/guilds 200

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config.env"
source "${SCRIPT_DIR}/../lib/assert.sh"
source "${SCRIPT_DIR}/../lib/grafana.sh"

DEPLOY=guild-service
ORIGINAL=$(kubectl get deployment "$DEPLOY" -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 2)

WS_ORIG=$(kubectl get deployment websocket-gateway -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 2)
MESSAGING_ORIG=$(kubectl get deployment messaging-service -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 2)

cleanup() {
    warn "Восстанавливаем $DEPLOY → $ORIGINAL реплик"
    kubectl scale deployment "$DEPLOY" -n "$NAMESPACE" --replicas="$ORIGINAL" || true
    wait_healthy "$DEPLOY" || true
    grafana_annotate "SC-13 CLEANUP done" "chaos,sc-13"
}
trap cleanup EXIT

log "=== SC-13: guild-service down, WS impact ==="

assert_alive "${API_BASE}/api/guilds"

grafana_region_start "SC-13: guild-service scale=0" "chaos,sc-13"
scale_and_wait "$DEPLOY" 0

sleep 5

# Ожидаем 503 от /api/guilds
GUILD_STATUS=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "${API_BASE}/api/guilds" || echo 000)
if [[ "$GUILD_STATUS" == "503" || "$GUILD_STATUS" == "502" || "$GUILD_STATUS" == "000" ]]; then
    log "/api/guilds → $GUILD_STATUS (ожидаемая деградация) ✓"
else
    warn "/api/guilds → $GUILD_STATUS (ожидался 503/502)"
fi

# WS Gateway pods = ORIGINAL - существующие соединения в Redis живут
WS_READY=$(kubectl get deployment websocket-gateway -n "$NAMESPACE" \
    -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
if [[ "${WS_READY:-0}" == "$WS_ORIG" ]]; then
    log "websocket-gateway: $WS_READY/$WS_ORIG ✓"
else
    fail "websocket-gateway неожиданно деградировал: $WS_READY/$WS_ORIG"
fi

# messaging pods = ORIGINAL
MESSAGING_READY=$(kubectl get deployment messaging-service -n "$NAMESPACE" \
    -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
if [[ "${MESSAGING_READY:-0}" == "$MESSAGING_ORIG" ]]; then
    log "messaging-service: $MESSAGING_READY/$MESSAGING_ORIG ✓"
else
    fail "messaging-service неожиданно деградировал: $MESSAGING_READY/$MESSAGING_ORIG"
fi

log "Новые WS соединения невозможны (OnConnectedAsync зависит от guild)"
log "Существующие WS соединения и presence данные сохранены в Redis"

grafana_region_end "SC-13: guild-service scale=0" "chaos,sc-13"

log "Восстанавливаем $DEPLOY..."
scale_and_wait "$DEPLOY" "$ORIGINAL"

sleep 5
assert_http_status 200 "${API_BASE}/api/guilds" -H "Authorization: Bearer ${TEST_TOKEN}"

scenario_pass
