#!/usr/bin/env bash
# SC-07: rolling restart всех deployment'ов — zero downtime.
# Companion k6 должен быть запущен параллельно оркестратором.
# Ожидаемое поведение:
#   - каждый rollout завершается без ошибок
#   - /healthz остаётся зелёным на протяжении всего рестарта
#   - k6 companion_errors остаётся < 5%

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config.env"
source "${SCRIPT_DIR}/../lib/assert.sh"
source "${SCRIPT_DIR}/../lib/grafana.sh"

DEPLOYMENTS=(
    messaging-service
    guild-service
    voice-service
    websocket-gateway
)

log "=== SC-07: rolling restart (zero downtime) ==="

assert_http_status 200 "${API_BASE}/healthz"

grafana_region_start "SC-07: rolling restart all" "chaos,sc-07"

for deploy in "${DEPLOYMENTS[@]}"; do
    log "Rolling restart: $deploy..."
    grafana_annotate "SC-07: restart $deploy" "chaos,sc-07"

    kubectl rollout restart deployment/"$deploy" -n "$NAMESPACE"
    kubectl rollout status deployment/"$deploy" -n "$NAMESPACE" --timeout=120s

    log "Проверяем /healthz после рестарта $deploy..."
    assert_http_status 200 "${API_BASE}/healthz"

    sleep 3
done

grafana_region_end "SC-07: rolling restart all" "chaos,sc-07"

log "Все deployment'ы перезапущены, проверяем финальное состояние..."

for deploy in "${DEPLOYMENTS[@]}"; do
    wait_healthy "$deploy"
done

assert_http_status 200 "${API_BASE}/healthz"

scenario_pass
