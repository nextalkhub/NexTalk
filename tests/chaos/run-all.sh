#!/usr/bin/env bash
# Оркестратор chaos-тестирования NexTalk.
# Последовательность:
#   1. Pre-flight checks
#   2. Baseline k6 (5 min, 20 VU)
#   3. Chaos loop: companion k6 фоном + сценарии SC-01..SC-07
#   4. Spike k6 (финальный стресс)
#   5. Итоговый отчет

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.env"
source "${SCRIPT_DIR}/lib/assert.sh"
source "${SCRIPT_DIR}/lib/grafana.sh"

# ── Конфигурация ─────────────────────────────────────────────────────────────
SCENARIOS_DIR="${SCRIPT_DIR}/scenarios"
K6_DIR="${SCRIPT_DIR}/k6"
LOG_DIR="${SCRIPT_DIR}/logs/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LOG_DIR"

SKIP_BASELINE="${SKIP_BASELINE:-0}"
SKIP_SPIKE="${SKIP_SPIKE:-0}"
ONLY_SCENARIO="${ONLY_SCENARIO:-}"  # SC-01, SC-02, ...

K6_EXTRA_ARGS=(
    --out "experimental-prometheus-rw"
    -e "API_BASE=${API_BASE}"
    -e "TOKEN=${TEST_TOKEN}"
    -e "PROM_URL=${PROMETHEUS_REMOTE_WRITE}"
)

COMPANION_PID=""

# ── Cleanup ───────────────────────────────────────────────────────────────────
cleanup() {
    if [[ -n "$COMPANION_PID" ]]; then
        log "Останавливаем companion k6 (pid=$COMPANION_PID)..."
        kill "$COMPANION_PID" 2>/dev/null || true
        wait "$COMPANION_PID" 2>/dev/null || true
    fi
    grafana_annotate "Chaos run FINISHED" "chaos,run-all"
}
trap cleanup EXIT

# ── Pre-flight checks ─────────────────────────────────────────────────────────
preflight() {
    log "=== Pre-flight checks ==="

    if ! command -v kubectl &>/dev/null; then
        fail "kubectl не найден"
    fi
    if ! kubectl cluster-info &>/dev/null; then
        fail "kubectl не может подключиться к кластеру"
    fi

    if ! command -v "${K6_BIN}" &>/dev/null; then
        fail "k6 не найден по пути ${K6_BIN}. Установи k6 и перезапусти."
    fi

    # /api/guilds без токена → 401 = ingress жив и guild-service отвечает
    assert_http_status 401 "${API_BASE}/api/guilds"

    for deploy in messaging-service guild-service voice-service websocket-gateway; do
        READY=$(kubectl get deployment "$deploy" -n "$NAMESPACE" \
            -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
        DESIRED=$(kubectl get deployment "$deploy" -n "$NAMESPACE" \
            -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 0)
        if [[ "${READY:-0}" != "$DESIRED" ]]; then
            fail "Pre-flight FAIL: $deploy not ready ($READY/$DESIRED)"
        fi
        log "  $deploy: $READY/$DESIRED ✓"
    done

    log "Pre-flight: все проверки пройдены ✓"
}

# ── Baseline k6 ───────────────────────────────────────────────────────────────
run_baseline() {
    if [[ "$SKIP_BASELINE" == "1" ]]; then
        warn "Baseline пропущен (SKIP_BASELINE=1)"
        return
    fi
    log "=== Baseline k6 (${K6_DURATION_BASELINE}, ${K6_VUS_BASELINE} VU) ==="
    grafana_annotate "Baseline k6 START" "chaos,baseline"

    "${K6_BIN}" run "${K6_EXTRA_ARGS[@]}" \
        -e "VUS=${K6_VUS_BASELINE}" \
        -e "DURATION=${K6_DURATION_BASELINE}" \
        "${K6_DIR}/baseline.js" \
        2>&1 | tee "${LOG_DIR}/baseline.log"

    grafana_annotate "Baseline k6 DONE" "chaos,baseline"
    log "Baseline завершен ✓"
}

# ── Companion k6 (фон) ────────────────────────────────────────────────────────
start_companion() {
    log "Запускаем companion k6 в фоне..."
    "${K6_BIN}" run "${K6_EXTRA_ARGS[@]}" \
        -e "VUS=10" \
        -e "DURATION=60m" \
        "${K6_DIR}/companion.js" \
        >"${LOG_DIR}/companion.log" 2>&1 &
    COMPANION_PID=$!
    log "Companion PID: $COMPANION_PID"
    sleep 3  # дать время k6 стартовать
}

stop_companion() {
    if [[ -n "$COMPANION_PID" ]]; then
        log "Останавливаем companion (pid=$COMPANION_PID)..."
        kill -SIGINT "$COMPANION_PID" 2>/dev/null || true
        wait "$COMPANION_PID" 2>/dev/null || true
        COMPANION_PID=""
    fi
}

# ── Запуск одного сценария ────────────────────────────────────────────────────
run_scenario() {
    local script="$1"
    local name
    name=$(basename "$script" .sh)

    log ""
    log "══════════════════════════════════════════"
    log "  СЦЕНАРИЙ: $name"
    log "══════════════════════════════════════════"

    if ! kubectl cluster-info &>/dev/null; then
        warn "  ✗ $name ПРОПУЩЕН - kubectl недоступен (туннель упал?)"
        FAILED+=("$name")
        log "Пауза 15s между сценариями..."
        sleep 15
        return
    fi

    grafana_annotate "Scenario START: $name" "chaos,$name"

    local rc=0
    bash "$script" 2>&1 | tee "${LOG_DIR}/${name}.log" || rc=$?

    if (( rc == 0 )); then
        log "  ✓ $name ПРОЙДЕН"
        PASSED+=("$name")
    else
        warn "  ✗ $name ПРОВАЛЕН (exit $rc)"
        FAILED+=("$name")
    fi

    grafana_annotate "Scenario END: $name (rc=$rc)" "chaos,$name"

    log "Пауза 15s между сценариями..."
    sleep 15
}

# ── Spike k6 ─────────────────────────────────────────────────────────────────
run_spike() {
    if [[ "$SKIP_SPIKE" == "1" ]]; then
        warn "Spike пропущен (SKIP_SPIKE=1)"
        return
    fi
    log "=== Spike k6 (${K6_VUS_SPIKE} VU peak) ==="
    grafana_annotate "Spike k6 START" "chaos,spike"

    "${K6_BIN}" run "${K6_EXTRA_ARGS[@]}" \
        -e "VUS=${K6_VUS_SPIKE}" \
        "${K6_DIR}/spike.js" \
        2>&1 | tee "${LOG_DIR}/spike.log"

    grafana_annotate "Spike k6 DONE" "chaos,spike"
    log "Spike завершен ✓"
}

# ── Итоговый отчет ────────────────────────────────────────────────────────────
print_summary() {
    log ""
    log "══════════════════════════════════════════"
    log "              ИТОГ CHAOS-RUN"
    log "══════════════════════════════════════════"
    log "  Пройдено: ${#PASSED[@]}"
    for s in "${PASSED[@]:-}"; do [[ -n "$s" ]] && log "    ✓ $s"; done
    log "  Провалено: ${#FAILED[@]}"
    for s in "${FAILED[@]:-}"; do [[ -n "$s" ]] && warn "    ✗ $s"; done
    log "  Логи: $LOG_DIR"
    log "  Grafana: ${GRAFANA_URL}/d/${GRAFANA_DASHBOARD_UID}"
    log "══════════════════════════════════════════"
}

# ── MAIN ──────────────────────────────────────────────────────────────────────
PASSED=()
FAILED=()

grafana_annotate "Chaos run STARTED" "chaos,run-all"

preflight
run_baseline

start_companion

if [[ -n "$ONLY_SCENARIO" ]]; then
    # Запустить один конкретный сценарий
    SCRIPT="${SCENARIOS_DIR}/${ONLY_SCENARIO}-*.sh"
    for f in $SCRIPT; do
        [[ -f "$f" ]] && run_scenario "$f"
    done
else
    # Все сценарии по порядку
    for script in "${SCENARIOS_DIR}"/SC-*.sh; do
        [[ -f "$script" ]] && run_scenario "$script"
    done
fi

stop_companion
run_spike

print_summary

if [[ "${#FAILED[@]}" -gt 0 ]]; then
    exit 1
fi
