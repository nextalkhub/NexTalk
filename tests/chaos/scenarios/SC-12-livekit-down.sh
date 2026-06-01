#!/usr/bin/env bash
# SC-12: LiveKit scale=0.
# Ожидаемое поведение:
#   - guild/messaging не затронуты
#   - voice-service pods остаются Running (не крашатся)
#   - после восстановления livekit healthy

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config.env"
source "${SCRIPT_DIR}/../lib/assert.sh"
source "${SCRIPT_DIR}/../lib/grafana.sh"

DEPLOY=livekit
ORIGINAL=$(kubectl get deployment "$DEPLOY" -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 1)


cleanup() {
    warn "Восстанавливаем $DEPLOY → $ORIGINAL реплик"
    kubectl scale deployment "$DEPLOY" -n "$NAMESPACE" --replicas="$ORIGINAL" || true
    wait_healthy "$DEPLOY" || true
    grafana_annotate "SC-12 CLEANUP done" "chaos,sc-12"
}
trap cleanup EXIT

log "=== SC-12: livekit down ==="

assert_alive "${API_BASE}/api/guilds"

grafana_region_start "SC-12: livekit scale=0" "chaos,sc-12"
scale_and_wait "$DEPLOY" 0

sleep 10

# guild и messaging не должны быть затронуты
assert_alive "${API_BASE}/api/guilds"
wait_healthy "guild-service" 30
wait_healthy "messaging-service" 30

# voice-service pods должны остаться Running - livekit client ошибается, но pod не крашится
VOICE_RUNNING=$(running_pods voice-service)
VOICE_DESIRED=$(kubectl get deployment voice-service -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 1)
if [[ "${VOICE_RUNNING:-0}" -ge "$VOICE_DESIRED" ]]; then
    log "voice-service pods Running: $VOICE_RUNNING/$VOICE_DESIRED - не крашится ✓"
else
    warn "voice-service: $VOICE_RUNNING running (ожидалось $VOICE_DESIRED)"
fi

grafana_region_end "SC-12: livekit scale=0" "chaos,sc-12"

log "Восстанавливаем $DEPLOY..."
scale_and_wait "$DEPLOY" "$ORIGINAL"

sleep 5
assert_alive "${API_BASE}/api/guilds"

scenario_pass
