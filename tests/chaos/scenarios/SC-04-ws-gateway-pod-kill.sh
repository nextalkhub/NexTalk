#!/usr/bin/env bash
# SC-04: убийство одного pod'а websocket-gateway (из 2 реплик).
# Ожидаемое поведение:
#   - k8s мгновенно перемаршрутирует трафик на вторую реплику
#   - убитый pod пересоздается автоматически
#   - /healthz не прерывается (допустима 1-2s пауза при переключении)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config.env"
source "${SCRIPT_DIR}/../lib/assert.sh"
source "${SCRIPT_DIR}/../lib/grafana.sh"

DEPLOY=websocket-gateway

log "=== SC-04: ws-gateway pod kill ==="

hypothesis "Убийство одного пода из 2: трафик уйдёт на живую реплику, k8s пересоздаст убитый под — пользователь не заметит."
slo "witness /api/guilds доступен ≥ 99%; реплики восстановлены до исходных"

# Проверяем наличие ≥ 2 реплик
CURRENT=$(running_pods "$DEPLOY")
if (( CURRENT < 2 )); then
    fail "Нужно ≥ 2 running pod'ов $DEPLOY, текущих: $CURRENT"
fi
log "Running pods перед тестом: $CURRENT"

assert_alive "${API_BASE}/api/guilds"

grafana_region_start "SC-04: ws-gateway pod kill" "chaos,sc-04"

kill_one_pod "$DEPLOY"

# Даем 2s на перемаршрутизацию kube-proxy
sleep 2

log "Проверяем доступность после убийства pod..."
assert_alive "${API_BASE}/api/guilds"

# Ждем пересоздания убитого pod'а
wait_healthy "$DEPLOY"

grafana_region_end "SC-04: ws-gateway pod kill" "chaos,sc-04"

AFTER=$(running_pods "$DEPLOY")
log "Running pods после восстановления: $AFTER"

if (( AFTER < CURRENT )); then
    fail "Кластер не восстановил pod: $AFTER < $CURRENT"
fi

assert_alive "${API_BASE}/api/guilds"

scenario_pass
