#!/usr/bin/env bash
# SC-03: перезапуск Redis на db-vps через SSH.
# Ожидаемое поведение:
#   - во время рестарта (~2-5s) кэш-зависимые операции могут ошибиться
#   - после старта Redis сервисы автоматически переподключаются
#   - /healthz восстанавливается без рестарта pod'ов

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config.env"
source "${SCRIPT_DIR}/../lib/assert.sh"
source "${SCRIPT_DIR}/../lib/grafana.sh"

log "=== SC-03: Redis restart (SSH → db-vps) ==="

SSH="ssh ${SSH_OPTS} ${SSH_USER}@${DB_VPS}"

# Проверяем SSH-доступ
if ! $SSH "echo ok" &>/dev/null; then
    fail "SSH к db-vps (${DB_VPS}) недоступен"
fi

assert_alive "${API_BASE}/api/guilds"

# Проверяем, что Redis работает до рестарта
REDIS_PING=$($SSH "redis-cli --no-auth-warning -a '${REDIS_PASSWORD}' ping" 2>/dev/null || echo "FAIL")
if [[ "$REDIS_PING" != "PONG" ]]; then
    fail "Redis на db-vps не отвечает на PING: $REDIS_PING"
fi
log "Redis PING: $REDIS_PING ✓"

grafana_region_start "SC-03: Redis restart" "chaos,sc-03"

log "Перезапускаем redis-server на db-vps..."
$SSH "systemctl restart redis-server"
log "Команда restart отправлена, ждем 10s..."
sleep 10

# Проверяем, что Redis снова работает
REDIS_PING=$($SSH "redis-cli --no-auth-warning -a '${REDIS_PASSWORD}' ping" 2>/dev/null || echo "FAIL")
if [[ "$REDIS_PING" != "PONG" ]]; then
    fail "Redis не поднялся после restart: $REDIS_PING"
fi
log "Redis восстановлен: PING=$REDIS_PING ✓"

grafana_region_end "SC-03: Redis restart" "chaos,sc-03"

# Проверяем, что приложение пережило рестарт Redis
sleep 3
assert_alive "${API_BASE}/api/guilds"

# Проверяем что все поды живы после рестарта Redis
for svc in messaging-service guild-service voice-service websocket-gateway; do
    READY=$(kubectl get deployment "$svc" -n "$NAMESPACE" \
        -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
    DESIRED=$(kubectl get deployment "$svc" -n "$NAMESPACE" \
        -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 1)
    if [[ "${READY:-0}" == "$DESIRED" ]]; then
        log "$svc: $READY/$DESIRED ✓"
    else
        fail "$svc не восстановился после рестарта Redis: $READY/$DESIRED"
    fi
done

scenario_pass
