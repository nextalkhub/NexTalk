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

assert_http_status 200 "${API_BASE}/healthz"

# Проверяем, что Redis работает до рестарта
REDIS_PING=$($SSH "redis-cli ping" 2>/dev/null || echo "FAIL")
if [[ "$REDIS_PING" != "PONG" ]]; then
    fail "Redis на db-vps не отвечает на PING: $REDIS_PING"
fi
log "Redis PING: $REDIS_PING ✓"

grafana_region_start "SC-03: Redis restart" "chaos,sc-03"

log "Перезапускаем redis-server на db-vps..."
$SSH "systemctl restart redis-server"
log "Команда restart отправлена, ждём 10s..."
sleep 10

# Проверяем, что Redis снова работает
REDIS_PING=$($SSH "redis-cli ping" 2>/dev/null || echo "FAIL")
if [[ "$REDIS_PING" != "PONG" ]]; then
    fail "Redis не поднялся после restart: $REDIS_PING"
fi
log "Redis восстановлен: PING=$REDIS_PING ✓"

grafana_region_end "SC-03: Redis restart" "chaos,sc-03"

# Проверяем, что приложение пережило рестарт Redis
sleep 3
assert_http_status 200 "${API_BASE}/healthz"

# Проверяем idempotency (Redis-backed) — должна работать после восстановления
STATUS=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 \
    -X POST "${API_BASE}/internal/messages" \
    -H "Content-Type: application/json" \
    -H "X-Idempotency-Key: sc03-after-redis-$(date +%s)" \
    -d '{"channelId":"00000000-0000-0000-0000-000000000001","content":"after redis restart","authorId":"sc03"}' \
    || echo 000)

if [[ "$STATUS" == "201" || "$STATUS" == "200" ]]; then
    log "Idempotency-ключ принят после рестарта Redis: $STATUS ✓"
else
    fail "Messaging не работает после рестарта Redis: $STATUS"
fi

scenario_pass
