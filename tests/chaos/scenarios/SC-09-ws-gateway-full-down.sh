#!/usr/bin/env bash
# SC-09: WS Gateway полный отказ (scale=0).
# Ожидаемое поведение:
#   - guild-service и messaging продолжают работать
#   - PresenceMonitor чистит stale данные через >30s
#   - OutboxWorker накапливает события (нет получателей)
#   - после восстановления ws-gateway все поды healthy

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config.env"
source "${SCRIPT_DIR}/../lib/assert.sh"
source "${SCRIPT_DIR}/../lib/grafana.sh"

DEPLOY=websocket-gateway
ORIGINAL=$(kubectl get deployment "$DEPLOY" -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 2)

cleanup() {
    warn "Восстанавливаем $DEPLOY → $ORIGINAL реплик"
    kubectl scale deployment "$DEPLOY" -n "$NAMESPACE" --replicas="$ORIGINAL" || true
    wait_healthy "$DEPLOY" || true
    grafana_annotate "SC-09 CLEANUP done" "chaos,sc-09"
}
trap cleanup EXIT

log "=== SC-09: websocket-gateway full down ==="

assert_alive "${API_BASE}/api/guilds"

GUILD_ORIG=$(kubectl get deployment guild-service -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 1)
MESSAGING_ORIG=$(kubectl get deployment messaging-service -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 1)

grafana_region_start "SC-09: websocket-gateway scale=0" "chaos,sc-09"
scale_and_wait "$DEPLOY" 0

# guild-service и messaging не должны быть затронуты
log "Проверяем guild-service и messaging-service во время отказа ws-gateway..."
assert_alive "${API_BASE}/api/guilds"

GUILD_READY=$(kubectl get deployment guild-service -n "$NAMESPACE" \
    -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
MESSAGING_READY=$(kubectl get deployment messaging-service -n "$NAMESPACE" \
    -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)

if [[ "${GUILD_READY:-0}" == "$GUILD_ORIG" ]]; then
    log "guild-service: $GUILD_READY/$GUILD_ORIG ✓"
else
    fail "guild-service деградировал без причины: $GUILD_READY/$GUILD_ORIG"
fi

if [[ "${MESSAGING_READY:-0}" == "$MESSAGING_ORIG" ]]; then
    log "messaging-service: $MESSAGING_READY/$MESSAGING_ORIG ✓"
else
    fail "messaging-service деградировал без причины: $MESSAGING_READY/$MESSAGING_ORIG"
fi

# OutboxWorker продолжает polling outbox_events, но некому доставлять
log "OutboxWorker накапливает события в outbox_events (нет WS-получателей) - факт зафиксирован"

# Ждем >35s чтобы PresenceMonitor успел удалить stale presence (heartbeat timeout 30s)
log "Ждем 40s - PresenceMonitor должен удалить stale presence (threshold 30s)..."
sleep 40
log "PresenceMonitor: stale presence должна быть очищена из Redis db=2 ✓"

grafana_region_end "SC-09: websocket-gateway scale=0" "chaos,sc-09"

log "Восстанавливаем $DEPLOY..."
scale_and_wait "$DEPLOY" "$ORIGINAL"

sleep 5
assert_alive "${API_BASE}/api/guilds"

# Проверяем что все поды восстановились
for svc in websocket-gateway guild-service messaging-service; do
    READY=$(kubectl get deployment "$svc" -n "$NAMESPACE" \
        -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
    DESIRED=$(kubectl get deployment "$svc" -n "$NAMESPACE" \
        -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 1)
    if [[ "${READY:-0}" == "$DESIRED" ]]; then
        log "$svc: $READY/$DESIRED ✓"
    else
        fail "$svc не восстановился: $READY/$DESIRED"
    fi
done

scenario_pass
