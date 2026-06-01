#!/usr/bin/env bash
# SC-14: drain worker node (не CP).
# Ожидаемое поведение:
#   - поды эвакуируются на оставшиеся узлы
#   - все deployments остаются healthy после drain
#   - после uncordon узел возвращается в ротацию

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config.env"
source "${SCRIPT_DIR}/../lib/assert.sh"
source "${SCRIPT_DIR}/../lib/grafana.sh"

# Берем первый worker (не control-plane)
NODE="${SC14_NODE:-$(kubectl get nodes -l '!node-role.kubernetes.io/control-plane' \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)}"
if [[ -z "$NODE" ]]; then
    fail "Не удалось определить worker-узел. Задай SC14_NODE вручную."
fi

cleanup() {
    warn "Uncordon $NODE"
    kubectl uncordon "$NODE" || true
    grafana_annotate "SC-14 CLEANUP: uncordon $NODE" "chaos,sc-14"
}
trap cleanup EXIT

log "=== SC-14: drain worker node $NODE ==="

NODE_STATUS=$(kubectl get node "$NODE" -o jsonpath='{.spec.unschedulable}' 2>/dev/null || echo "unknown")
if [[ "$NODE_STATUS" == "true" ]]; then
    fail "Узел $NODE уже cordon'd - прерываем, чтобы не испортить prod"
fi

assert_alive "${API_BASE}/api/guilds"

grafana_region_start "SC-14: drain $NODE" "chaos,sc-14"

log "Drain $NODE (--ignore-daemonsets --delete-emptydir-data --timeout=120s)..."
kubectl drain "$NODE" --ignore-daemonsets --delete-emptydir-data --timeout=120s

log "Ждем 30s пока поды эвакуируются и переподнимаются на других узлах..."
sleep 30

assert_alive "${API_BASE}/api/guilds"

# Все 4 сервиса должны быть healthy после drain
for svc in guild-service messaging-service voice-service websocket-gateway; do
    wait_healthy "$svc" 120
done

grafana_region_end "SC-14: drain $NODE" "chaos,sc-14"

log "Uncordon $NODE..."
kubectl uncordon "$NODE"

sleep 10
kubectl get nodes
kubectl get pods -n "$NAMESPACE" -o wide

assert_alive "${API_BASE}/api/guilds"

for svc in guild-service messaging-service voice-service websocket-gateway; do
    wait_healthy "$svc" 60
done

scenario_pass
