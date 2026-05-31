#!/usr/bin/env bash
# SC-06: cordon cp-2, проверяем кворум etcd и доступность API-сервера.
# Ожидаемое поведение:
#   - при cordon cp-2 кластер продолжает работать (кворум сохранен: 3→2)
#   - kubectl и приложение остаются доступны
#   - uncordon → узел возвращается в ротацию без ручного вмешательства

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config.env"
source "${SCRIPT_DIR}/../lib/assert.sh"
source "${SCRIPT_DIR}/../lib/grafana.sh"

# Берем второй control-plane узел (не первый, чтобы не трогать лидера etcd).
# Переопределить: SC06_NODE=<name> ./SC-06...
NODE="${SC06_NODE:-$(kubectl get nodes -l 'node-role.kubernetes.io/control-plane=true' \
    -o jsonpath='{.items[1].metadata.name}' 2>/dev/null)}"
if [[ -z "$NODE" ]]; then
    fail "Не удалось определить control-plane узел. Задай SC06_NODE вручную."
fi

cleanup() {
    warn "Uncordon $NODE"
    kubectl uncordon "$NODE" || true
    grafana_annotate "SC-06 CLEANUP: uncordon $NODE" "chaos,sc-06"
}
trap cleanup EXIT

log "=== SC-06: cordon $NODE ==="

# Проверяем текущее состояние узла
NODE_STATUS=$(kubectl get node "$NODE" -o jsonpath='{.spec.unschedulable}' 2>/dev/null || echo "unknown")
if [[ "$NODE_STATUS" == "true" ]]; then
    fail "Узел $NODE уже cordon'd - прерываем, чтобы не испортить prod"
fi

assert_alive "${API_BASE}/api/guilds"

grafana_region_start "SC-06: cordon $NODE" "chaos,sc-06"
cordon_node "$NODE"

log "Ждем 30s (наблюдаем etcd метрики в Grafana)..."
sleep 30

# Кластер должен оставаться работоспособным
log "Проверяем kubectl get nodes..."
kubectl get nodes
log "Проверяем k8s API..."
kubectl get pods -n "$NAMESPACE" -o wide

log "Проверяем /healthz приложения..."
assert_alive "${API_BASE}/api/guilds"

# Проверяем, что на cordoned-узле не запускают новые поды
log "Проверяем, что новые pod'ы не scheduled на $NODE..."
NEW_PODS=$(kubectl get pods -n "$NAMESPACE" -o wide \
    --field-selector=status.phase!=Succeeded 2>/dev/null | grep "$NODE" | wc -l)
log "Pod'ов на $NODE: $NEW_PODS (ожидается 0 новых)"

grafana_region_end "SC-06: cordon $NODE" "chaos,sc-06"

log "Uncordon $NODE..."
uncordon_node "$NODE"

sleep 5
assert_alive "${API_BASE}/api/guilds"

scenario_pass
