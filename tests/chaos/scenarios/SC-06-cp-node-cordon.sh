#!/usr/bin/env bash
# SC-06: cordon одной control-plane ноды.
# ВАЖНО: cordon лишь помечает ноду unschedulable - kubelet и etcd продолжают
# работать, поэтому это НЕ тест кворума etcd (для него нужен реальный node-down).
# Что проверяется: cordon применился (нода unschedulable), а API-сервер за HAProxy
# и приложение остаются доступны; uncordon возвращает ноду в ротацию.

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

hypothesis "Cordon одной CP-ноды не роняет кластер: нода становится unschedulable, но API-сервер (за HAProxy) и приложение остаются доступны."
slo "нода unschedulable=true; kubectl-API отвечает; witness /api/guilds жив"

# Проверяем текущее состояние узла
NODE_STATUS=$(kubectl get node "$NODE" -o jsonpath='{.spec.unschedulable}' 2>/dev/null || echo "unknown")
if [[ "$NODE_STATUS" == "true" ]]; then
    fail "Узел $NODE уже cordon'd - прерываем, чтобы не испортить prod"
fi

assert_alive "${API_BASE}/api/guilds"

grafana_region_start "SC-06: cordon $NODE" "chaos,sc-06"
cordon_node "$NODE"

log "Ждем 30s..."
sleep 30

# 1. Cordon действительно применился (нода unschedulable).
AFTER_CORDON=$(kubectl get node "$NODE" -o jsonpath='{.spec.unschedulable}' 2>/dev/null || echo "")
if [[ "$AFTER_CORDON" != "true" ]]; then
    fail "Cordon не применился: $NODE unschedulable=$AFTER_CORDON"
fi
log "$NODE unschedulable=true ✓"

# 2. API-сервер за HAProxy жив, несмотря на выбывшую из планирования CP-ноду.
if ! kubectl get --raw='/readyz' &>/dev/null; then
    fail "kube-apiserver не отвечает на /readyz при cordon одной CP-ноды"
fi
log "kube-apiserver /readyz отвечает ✓"

# 3. Приложение доступно.
assert_alive "${API_BASE}/api/guilds"

grafana_region_end "SC-06: cordon $NODE" "chaos,sc-06"

log "Uncordon $NODE..."
uncordon_node "$NODE"

sleep 5
assert_alive "${API_BASE}/api/guilds"

scenario_pass
