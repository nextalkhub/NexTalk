#!/usr/bin/env bash
# SC-08: перезапуск PostgreSQL на db-vps через SSH.
# Ожидаемое поведение:
#   - во время рестарта (~5-10s) запросы к guild/messaging деградируют
#   - после старта PostgreSQL сервисы автоматически переподключаются
#   - поды не рестартуют, /api/guilds восстанавливается самостоятельно

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config.env"
source "${SCRIPT_DIR}/../lib/assert.sh"
source "${SCRIPT_DIR}/../lib/grafana.sh"

log "=== SC-08: PostgreSQL restart (SSH → db-vps) ==="

SSH="ssh ${SSH_OPTS} ${SSH_USER}@${DB_VPS}"

if ! $SSH "echo ok" &>/dev/null; then
    fail "SSH к db-vps (${DB_VPS}) недоступен"
fi

assert_alive "${API_BASE}/api/guilds"

# pg_isready не требует пароля
PG_STATUS=$($SSH "pg_isready -h /var/run/postgresql" 2>/dev/null || echo "FAIL")
if [[ "$PG_STATUS" != *"accepting connections"* ]]; then
    fail "PostgreSQL на db-vps не готов: $PG_STATUS"
fi
log "PostgreSQL: $PG_STATUS ✓"

grafana_region_start "SC-08: PostgreSQL restart" "chaos,sc-08"

log "Перезапускаем postgresql на db-vps..."
$SSH "systemctl restart postgresql"
log "Команда restart отправлена, ждем 15s..."
sleep 15

PG_STATUS=$($SSH "pg_isready -h /var/run/postgresql" 2>/dev/null || echo "FAIL")
if [[ "$PG_STATUS" != *"accepting connections"* ]]; then
    fail "PostgreSQL не поднялся после restart: $PG_STATUS"
fi
log "PostgreSQL восстановлен: $PG_STATUS ✓"

grafana_region_end "SC-08: PostgreSQL restart" "chaos,sc-08"

# Даем сервисам время переподключиться к пулу соединений
sleep 10
assert_alive "${API_BASE}/api/guilds"

# Убеждаемся, что поды не упали (reconnect без рестарта)
for svc in messaging-service guild-service voice-service websocket-gateway; do
    READY=$(kubectl get deployment "$svc" -n "$NAMESPACE" \
        -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
    DESIRED=$(kubectl get deployment "$svc" -n "$NAMESPACE" \
        -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 1)
    if [[ "${READY:-0}" == "$DESIRED" ]]; then
        log "$svc: $READY/$DESIRED ✓"
    else
        fail "$svc не восстановился после рестарта PostgreSQL: $READY/$DESIRED"
    fi
done

scenario_pass
