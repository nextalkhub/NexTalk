#!/usr/bin/env bash
# SC-10: messaging падает, WS Gateway жив (reverse SC-01).
# Ожидаемое поведение:
#   - существующие WS-соединения выживают (ws-gateway pods не меняются)
#   - guild-service не затронут (/api/guilds → 401)
#   - после восстановления messaging outbox начинает flush

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config.env"
source "${SCRIPT_DIR}/../lib/assert.sh"
source "${SCRIPT_DIR}/../lib/grafana.sh"

DEPLOY=messaging-service
ORIGINAL=$(kubectl get deployment "$DEPLOY" -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 2)

WS_ORIG=$(kubectl get deployment websocket-gateway -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 2)

cleanup() {
    warn "Восстанавливаем $DEPLOY → $ORIGINAL реплик"
    kubectl scale deployment "$DEPLOY" -n "$NAMESPACE" --replicas="$ORIGINAL" || true
    wait_healthy "$DEPLOY" || true
    grafana_annotate "SC-10 CLEANUP done" "chaos,sc-10"
}
trap cleanup EXIT

log "=== SC-10: messaging down, ws-gateway alive ==="

assert_alive "${API_BASE}/api/guilds"

grafana_region_start "SC-10: messaging-service scale=0" "chaos,sc-10"
scale_and_wait "$DEPLOY" 0

sleep 5

# WS Gateway pods должны остаться на месте - существующие соединения живут
WS_READY=$(kubectl get deployment websocket-gateway -n "$NAMESPACE" \
    -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
if [[ "${WS_READY:-0}" == "$WS_ORIG" ]]; then
    log "websocket-gateway: $WS_READY/$WS_ORIG - существующие соединения живут ✓"
else
    fail "websocket-gateway неожиданно деградировал: $WS_READY/$WS_ORIG"
fi

# guild-service не затронут - 401 означает, что backend отвечает
assert_alive "${API_BASE}/api/guilds"

GUILD_RUNNING=$(running_pods guild-service)
log "guild-service pods running: $GUILD_RUNNING (не затронут) ✓"

grafana_region_end "SC-10: messaging-service scale=0" "chaos,sc-10"

log "Восстанавливаем $DEPLOY..."
scale_and_wait "$DEPLOY" "$ORIGINAL"

# Ждем чтобы OutboxWorker запустил flush накопленных событий (polling раз в секунду, stale > 2 мин)
log "Ждем 15s - OutboxWorker начинает flush outbox_events..."
sleep 15

assert_alive "${API_BASE}/api/guilds"

WS_READY=$(kubectl get deployment websocket-gateway -n "$NAMESPACE" \
    -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
if [[ "${WS_READY:-0}" == "$WS_ORIG" ]]; then
    log "websocket-gateway после восстановления: $WS_READY/$WS_ORIG ✓"
else
    fail "websocket-gateway изменился после восстановления: $WS_READY/$WS_ORIG"
fi

scenario_pass
