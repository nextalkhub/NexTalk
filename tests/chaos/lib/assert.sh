#!/usr/bin/env bash
# Утилиты для chaos-сценариев: ожидание, проверки, вывод.

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log()  { echo -e "${GREEN}[$(date +%T)]${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date +%T)] WARN${NC} $*"; }
fail() { echo -e "${RED}[$(date +%T)] FAIL${NC} $*" >&2; exit 1; }

# Ждет, пока deployment не наберет нужное число ready-реплик.
# Использование: wait_healthy <deployment> [timeout_sec]
wait_healthy() {
    local deploy="$1"
    local timeout="${2:-${WAIT_HEALTHY_TIMEOUT:-120}}"
    local interval="${WAIT_HEALTHY_INTERVAL:-5}"
    local elapsed=0

    log "Ожидаем готовности $deploy (таймаут ${timeout}s)..."
    while true; do
        local ready
        ready=$(kubectl get deployment "$deploy" -n "$NAMESPACE" \
            -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
        local desired
        desired=$(kubectl get deployment "$deploy" -n "$NAMESPACE" \
            -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 1)

        if [[ "${ready:-0}" == "$desired" && "$desired" -gt 0 ]]; then
            log "$deploy готов ($ready/$desired реплик)"
            return 0
        fi

        if (( elapsed >= timeout )); then
            fail "$deploy не стал готовым за ${timeout}s (ready=${ready:-0}, desired=$desired)"
        fi

        sleep "$interval"
        (( elapsed += interval ))
    done
}

# Ждет, пока deployment не упадет до 0 ready-реплик (после scale=0).
wait_down() {
    local deploy="$1"
    local timeout="${2:-60}"
    local interval=3
    local elapsed=0

    log "Ждем остановки $deploy..."
    while true; do
        local ready
        ready=$(kubectl get deployment "$deploy" -n "$NAMESPACE" \
            -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)

        if [[ "${ready:-0}" -eq 0 ]]; then
            log "$deploy остановлен"
            return 0
        fi

        if (( elapsed >= timeout )); then
            fail "$deploy не остановился за ${timeout}s"
        fi

        sleep "$interval"
        (( elapsed += interval ))
    done
}

# Делает HTTP-запрос и проверяет статус-код.
# Использование: assert_http_status <expected_code> <url> [curl_opts...]
assert_http_status() {
    local expected="$1"
    local url="$2"
    shift 2

    local actual
    actual=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "$@" "$url" || echo 000)

    if [[ "$actual" == "$expected" ]]; then
        log "HTTP $actual ← $url (ожидался $expected) ✓"
    else
        fail "HTTP $actual ← $url (ожидался $expected)"
    fi
}

# Проверяет, что endpoint отвечает (2xx или 4xx) - сервис жив.
# 401/403/404 тоже считаются «живыми»: backend ответил осмысленно.
assert_alive() {
    local url="$1"
    local actual
    actual=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo 000)
    if [[ "$actual" -ge 200 && "$actual" -lt 500 ]]; then
        log "alive: $url ($actual) ✓"
    else
        fail "сервис недоступен: $url ($actual)"
    fi
}

# Проверяет, что endpoint НЕ отвечает 2xx (ожидаемый сбой).
assert_degraded() {
    local url="$1"
    local actual
    actual=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 "$url" || echo 000)
    if [[ "$actual" -lt 200 || "$actual" -ge 300 ]]; then
        log "degraded (ожидаемо): $url ($actual) ✓"
    else
        fail "ожидался сбой, но получили $actual ← $url"
    fi
}

# Число pod'ов deployment с статусом Running.
running_pods() {
    local deploy="$1"
    kubectl get pods -n "$NAMESPACE" \
        -l "app=$deploy" \
        --field-selector=status.phase=Running \
        -o name 2>/dev/null | wc -l | tr -d ' '
}

# Масштабирует deployment и ждет готовности.
scale_and_wait() {
    local deploy="$1"
    local replicas="$2"
    log "Масштабируем $deploy → $replicas реплик"
    kubectl scale deployment "$deploy" -n "$NAMESPACE" --replicas="$replicas"
    if (( replicas == 0 )); then
        wait_down "$deploy"
    else
        wait_healthy "$deploy"
    fi
}

# Удаляет один pod из deployment (симуляция краша).
kill_one_pod() {
    local deploy="$1"
    local pod
    pod=$(kubectl get pods -n "$NAMESPACE" -l "app=$deploy" \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [[ -z "$pod" ]]; then
        fail "Нет pod'ов у $deploy"
    fi
    log "Убиваем pod $pod..."
    kubectl delete pod "$pod" -n "$NAMESPACE" --grace-period=0 --force
    log "Pod $pod удален"
}

# Cordon/uncordon узла.
cordon_node()   { kubectl cordon   "$1"; log "Node $1 cordon'd"; }
uncordon_node() { kubectl uncordon "$1"; log "Node $1 uncordon'd"; }

# Заявляет гипотезу эксперимента (steady-state hypothesis). Печатается в начале.
# Так преподаватель видит, ЧТО мы ожидаем, еще ДО инъекции сбоя.
hypothesis() {
    echo -e "${YELLOW}┌─ ГИПОТЕЗА ──────────────────────────────────${NC}"
    echo -e "${YELLOW}│${NC} $*"
    echo -e "${YELLOW}└─────────────────────────────────────────────${NC}"
}

# Заявляет SLO/abort-критерий эксперимента.
slo() { echo -e "${YELLOW}  SLO / abort: $*${NC}"; }

# Непрерывно мониторит witness-URL во время эксперимента: <samples> проверок
# с интервалом <interval>s. Считает доступность и сравнивает с <min_pct>.
# Если доступность ниже порога - abort (blast radius превышен сверх гипотезы).
# Иначе печатает ИЗМЕРЕННЫЙ результат - не «не упало», а конкретный процент.
# Использование: slo_monitor <url> [samples] [interval] [min_pct]
slo_monitor() {
    local url="$1" samples="${2:-20}" interval="${3:-3}" min_pct="${4:-99}"
    local ok=0 i code
    log "Мониторим доступность witness ${url} (${samples}×${interval}s, SLO ≥ ${min_pct}%)..."
    for (( i=1; i<=samples; i++ )); do
        code=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo 000)
        if [[ "$code" -ge 200 && "$code" -lt 500 ]]; then (( ok++ )); fi
        sleep "$interval"
    done
    local pct=$(( ok * 100 / samples ))
    if (( pct < min_pct )); then
        fail "SLO нарушен: доступность ${pct}% < ${min_pct}% — blast radius превышен, ABORT"
    fi
    log "Измеренная доступность witness: ${pct}% (SLO ≥ ${min_pct}%) ✓"
}

# Печатает итог теста и завершает с нужным кодом.
scenario_pass() { echo -e "\n${GREEN}=== СЦЕНАРИЙ ПРОЙДЕН ✓ ===${NC}\n"; }
scenario_fail() { echo -e "\n${RED}=== СЦЕНАРИЙ ПРОВАЛЕН ✗ ===${NC}\n" >&2; exit 1; }
