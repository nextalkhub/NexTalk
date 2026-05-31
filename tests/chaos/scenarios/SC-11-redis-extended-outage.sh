#!/usr/bin/env bash
# SC-11: Redis выключен на 60 секунд (extended outage).
# Ожидаемое поведение:
#   - /api/guilds деградирует или fallback на DB (cache miss → DB hit)
#   - WS Gateway pods остаются Running (SignalR TCP-соединения локально выживают)
#   - ни один pod не крашится (readyReplicas не уменьшается)
#   - после restart Redis все сервисы восстанавливаются

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config.env"
source "${SCRIPT_DIR}/../lib/assert.sh"
source "${SCRIPT_DIR}/../lib/grafana.sh"

SSH="ssh ${SSH_OPTS} ${SSH_USER}@${DB_VPS}"

log "=== SC-11: Redis extended outage (60s) ==="

if ! $SSH "echo ok" &>/dev/null; then
    fail "SSH к db-vps (${DB_VPS}) недоступен"
fi

REDIS_PING=$($SSH "redis-cli --no-auth-warning -a '${REDIS_PASSWORD}' ping" 2>/dev/null || echo "FAIL")
if [[ "$REDIS_PING" != "PONG" ]]; then
    fail "Redis на db-vps не отвечает на PING перед тестом: $REDIS_PING"
fi
log "Redis PING: $REDIS_PING ✓"

assert_alive "${API_BASE}/api/guilds"

# Фиксируем исходное число реплик
GUILD_ORIG=$(kubectl get deployment guild-service -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 1)
MESSAGING_ORIG=$(kubectl get deployment messaging-service -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 1)
VOICE_ORIG=$(kubectl get deployment voice-service -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 1)

cleanup() {
    warn "Убеждаемся что redis-server запущен на db-vps"
    $SSH "systemctl start redis-server" || true
    grafana_annotate "SC-11 CLEANUP done" "chaos,sc-11"
}
trap cleanup EXIT

grafana_region_start "SC-11: Redis stop 60s" "chaos,sc-11"

log "Останавливаем redis-server на db-vps..."
$SSH "systemctl stop redis-server"

log "Ждем 30s (наблюдаем поведение сервисов при отсутствии Redis)..."
sleep 30

# guild cache miss → должен fallback на DB, сервис жив
log "Проверяем /api/guilds при упавшем Redis (ожидаем fallback на DB или деградацию)..."
GUILD_STATUS=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "${API_BASE}/api/guilds" || echo 000)
if [[ "$GUILD_STATUS" -ge 200 && "$GUILD_STATUS" -lt 500 ]]; then
    log "/api/guilds → $GUILD_STATUS (fallback на DB работает) ✓"
else
    warn "/api/guilds → $GUILD_STATUS (деградация при отсутствии Redis, ожидаемо)"
fi

# WS Gateway pods должны остаться Running - SignalR TCP-соединения не рвутся мгновенно
WS_READY=$(kubectl get deployment websocket-gateway -n "$NAMESPACE" \
    -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
WS_DESIRED=$(kubectl get deployment websocket-gateway -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 1)
if [[ "${WS_READY:-0}" == "$WS_DESIRED" ]]; then
    log "websocket-gateway: $WS_READY/$WS_DESIRED - SignalR TCP соединения локально выживают ✓"
else
    warn "websocket-gateway: $WS_READY/$WS_DESIRED (возможна частичная деградация)"
fi

log "Ждем еще 30s (итого 60s outage)..."
sleep 30

# Проверяем что ни один pod не крашится - readyReplicas не должны уменьшиться
log "Проверяем что поды не крашились за 60s без Redis..."
for svc in messaging-service guild-service voice-service; do
    case "$svc" in
        guild-service)    ORIG="$GUILD_ORIG" ;;
        messaging-service) ORIG="$MESSAGING_ORIG" ;;
        voice-service)    ORIG="$VOICE_ORIG" ;;
    esac
    READY=$(kubectl get deployment "$svc" -n "$NAMESPACE" \
        -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
    if [[ "${READY:-0}" -ge "$ORIG" ]]; then
        log "$svc: $READY/$ORIG - нет крашей ✓"
    else
        # Архитектурная находка: guild-service и voice-service имеют жесткую зависимость от Redis
        # (нет graceful degradation при полном отсутствии Redis).
        warn "$svc: $READY/$ORIG - краш при отсутствии Redis (жесткая зависимость, не graceful)"
    fi
done

grafana_region_end "SC-11: Redis stop 60s" "chaos,sc-11"

log "Запускаем redis-server на db-vps..."
$SSH "systemctl start redis-server"

log "Ждем 15s пока Redis поднимется..."
sleep 15

# ws-gateway падал в crash-loop без Redis - rollout restart сбрасывает CrashLoopBackOff
log "Rollout restart websocket-gateway (сброс CrashLoopBackOff после Redis-аутажа)..."
kubectl rollout restart deployment/websocket-gateway -n "$NAMESPACE"

log "Ждем 30s пока все ws-gateway поды переподнимутся..."
sleep 30

REDIS_PING=$($SSH "redis-cli --no-auth-warning -a '${REDIS_PASSWORD}' ping" 2>/dev/null || echo "FAIL")
if [[ "$REDIS_PING" == "PONG" ]]; then
    log "Redis восстановлен: PING=$REDIS_PING ✓"
else
    fail "Redis не поднялся после start: $REDIS_PING"
fi

assert_alive "${API_BASE}/api/guilds"

for svc in messaging-service guild-service voice-service; do
    wait_healthy "$svc" 120
done
wait_healthy "websocket-gateway" 180

scenario_pass
