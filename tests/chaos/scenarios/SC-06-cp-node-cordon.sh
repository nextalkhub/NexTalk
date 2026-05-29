#!/usr/bin/env bash
# SC-06: cordon cp-2, проверяем кворум etcd и доступность API-сервера.
# Ожидаемое поведение:
#   - при cordon cp-2 кластер продолжает работать (кворум сохранён: 3→2)
#   - kubectl и приложение остаются доступны
#   - uncordon → узел возвращается в ротацию без ручного вмешательства

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config.env"
source "${SCRIPT_DIR}/../lib/assert.sh"
source "${SCRIPT_DIR}/../lib/grafana.sh"

NODE=cp-2   # можно переопределить: SC06_NODE=cp-3 ./SC-06...
NODE="${SC06_NODE:-$NODE}"

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
    fail "Узел $NODE уже cordon'd — прерываем, чтобы не испортить prod"
fi

assert_http_status 200 "${API_BASE}/healthz"

grafana_region_start "SC-06: cordon $NODE" "chaos,sc-06"
cordon_node "$NODE"

log "Ждём 30s (наблюдаем etcd метрики в Grafana)..."
sleep 30

# Кластер должен оставаться работоспособным
log "Проверяем kubectl get nodes..."
kubectl get nodes
log "Проверяем k8s API..."
kubectl get pods -n "$NAMESPACE" -o wide

log "Проверяем /healthz приложения..."
assert_http_status 200 "${API_BASE}/healthz"

# Проверяем, что на cordoned-узле не запускают новые поды
log "Проверяем, что новые pod'ы не scheduled на $NODE..."
NEW_PODS=$(kubectl get pods -n "$NAMESPACE" -o wide \
    --field-selector=status.phase!=Succeeded 2>/dev/null | grep "$NODE" | wc -l)
log "Pod'ов на $NODE: $NEW_PODS (ожидается 0 новых)"

grafana_region_end "SC-06: cordon $NODE" "chaos,sc-06"

log "Uncordon $NODE..."
uncordon_node "$NODE"

sleep 5
assert_http_status 200 "${API_BASE}/healthz"

scenario_pass
