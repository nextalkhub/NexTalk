#!/usr/bin/env bash
# SC-15: демонстрация HPA-автоскейла под растущей нагрузкой.
# Это сценарий МАСШТАБИРУЕМОСТИ (в отличие от SC-05, который скейлит руками):
# нагрузку дает k6 ramp.js, а реплики добавляет сам HPA по метрикам CPU.
#
# Нагрузку запускать ОТДЕЛЬНО в соседней панели (видно на split-screen демо):
#   k6 run tests/chaos/k6/ramp.js -e API_BASE=https://nextalk.fun -e TOKEN=<jwt> \
#     --out experimental-prometheus-rw
# либо автоматически: AUTO_LOAD=1 (нужны K6_BIN и TOKEN в config.env).
#
# Что проверяет:
#   - под нагрузкой HPA desired растет, реплики догоняют (scale-up реально идет)
#   - witness-эндпоинт остается доступным (рост нагрузки не ломает сервис)
#   - в конце пик реплик > старта (гипотеза масштабирования подтверждена)
#
# ВАЖНО: ramp.js бьёт по /api/guilds, т.е. CPU-нагрузка идёт на guild-service -
# масштабируется в первую очередь ОН. Остальные 3 HPA в таблице - для контекста
# (их нагружает только косвенный трафик). Сумма реплик растёт за счёт guild-service.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config.env"
source "${SCRIPT_DIR}/../lib/assert.sh"
source "${SCRIPT_DIR}/../lib/grafana.sh"

HPAS=(guild-service messaging-service voice-service websocket-gateway)
WATCH_SECONDS="${WATCH_SECONDS:-600}"   # сколько наблюдать (по умолчанию 10 мин)
INTERVAL=15

K6_PID=""
cleanup() {
    [[ -n "$K6_PID" ]] && kill "$K6_PID" 2>/dev/null && warn "k6 ramp остановлен"
    grafana_region_end "SC-15: HPA autoscale" "scale,sc-15" || true
}
trap cleanup EXIT

log "=== SC-15: HPA autoscale под нагрузкой ==="

hypothesis "При росте нагрузки HPA добавит реплики (2 → max), а witness-эндпоинт останется доступным; при спаде реплики вернутся к 2."
slo "доступность witness ≥ 95%, пик реплик строго > стартовых"

assert_alive "${API_BASE}/api/guilds"

# Сумма стартовых реплик по 4 автоскейл-сервисам.
sum_replicas() {
    local total=0 d n
    for d in "${HPAS[@]}"; do
        n=$(kubectl get deployment "$d" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
        total=$(( total + ${n:-0} ))
    done
    echo "$total"
}

START_REPLICAS=$(sum_replicas)
PEAK_REPLICAS=$START_REPLICAS
log "Старт: суммарно $START_REPLICAS реплик по сервисам ${HPAS[*]}"

# Опциональный авто-запуск нагрузки.
if [[ "${AUTO_LOAD:-0}" == "1" ]]; then
    if [[ -x "${K6_BIN:-/usr/local/bin/k6}" && -n "${TOKEN:-}" ]]; then
        log "AUTO_LOAD=1 — запускаем k6 ramp в фоне"
        "${K6_BIN:-/usr/local/bin/k6}" run "${SCRIPT_DIR}/../k6/ramp.js" \
            -e API_BASE="${API_BASE}" -e TOKEN="${TOKEN}" \
            --out experimental-prometheus-rw >/tmp/sc15-ramp.log 2>&1 &
        K6_PID=$!
    else
        warn "AUTO_LOAD=1, но нет K6_BIN или TOKEN — запусти ramp.js вручную"
    fi
else
    warn "Нагрузку запусти отдельно: k6 run ramp.js (см. шапку сценария)"
fi

grafana_region_start "SC-15: HPA autoscale" "scale,sc-15"

# Наблюдаем HPA: каждые ${INTERVAL}s печатаем current/desired/max и проверяем witness.
log "Наблюдаем HPA ${WATCH_SECONDS}s (интервал ${INTERVAL}s)..."
samples=0; ok=0; elapsed=0
printf "%-9s | %-20s | %-8s | %-8s | %-4s | witness\n" "t,s" "hpa" "current" "desired" "max"
while (( elapsed < WATCH_SECONDS )); do
    for h in "${HPAS[@]}"; do
        cur=$(kubectl get hpa "$h" -n "$NAMESPACE" -o jsonpath='{.status.currentReplicas}' 2>/dev/null || echo 0)
        des=$(kubectl get hpa "$h" -n "$NAMESPACE" -o jsonpath='{.status.desiredReplicas}' 2>/dev/null || echo 0)
        mx=$(kubectl get hpa "$h" -n "$NAMESPACE" -o jsonpath='{.spec.maxReplicas}' 2>/dev/null || echo 0)
        printf "%-9s | %-20s | %-8s | %-8s | %-4s |\n" "$elapsed" "$h" "${cur:-0}" "${des:-0}" "${mx:-0}"
    done

    # Витнес-проба (доступность сервиса под растущей нагрузкой).
    code=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "${API_BASE}/api/guilds" || echo 000)
    samples=$((samples+1))
    if [[ "$code" -ge 200 && "$code" -lt 500 ]]; then ok=$((ok+1)); else warn "witness $code на t=${elapsed}s"; fi

    now=$(sum_replicas)
    (( now > PEAK_REPLICAS )) && PEAK_REPLICAS=$now

    sleep "$INTERVAL"
    (( elapsed += INTERVAL ))
done

# Вердикт: измеренная доступность + факт scale-up.
avail=$(( ok * 100 / (samples>0 ? samples : 1) ))
log "Измеренная доступность witness: ${avail}% (SLO ≥ 95%)"
log "Реплики: старт ${START_REPLICAS} → пик ${PEAK_REPLICAS}"

(( avail < 95 )) && fail "доступность ${avail}% < 95% под нагрузкой"
(( PEAK_REPLICAS <= START_REPLICAS )) && fail "HPA не масштабировал: пик ${PEAK_REPLICAS} ≤ старт ${START_REPLICAS} (мало нагрузки? проверь, что ramp.js запущен)"

log "Гипотеза подтверждена: HPA отмасштабировал ${START_REPLICAS} → ${PEAK_REPLICAS} реплик, доступность ${avail}%"
scenario_pass
