#!/usr/bin/env bash
# Grafana annotations API — маркируем timeline во время chaos-сценариев.

set -euo pipefail

# Создаёт аннотацию-точку в Grafana.
# Возвращает id созданной аннотации (для закрытия regionом).
grafana_annotate() {
    local text="$1"
    local tags="${2:-chaos}"

    local tags_json
    tags_json=$(printf '"%s"' "$tags" | sed 's/,/","/g')

    local response
    response=$(curl -sf -X POST \
        -H "Content-Type: application/json" \
        -u "${GRAFANA_USER}:${GRAFANA_PASSWORD}" \
        "${GRAFANA_URL}/api/annotations" \
        -d "{\"text\":\"${text}\",\"tags\":[${tags_json}]}" 2>/dev/null || echo '{"id":0}')

    echo "$response" | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1
}

# Открывает region-аннотацию (начало события).
grafana_region_start() {
    local text="$1"
    local tags="${2:-chaos}"
    grafana_annotate "▶ START: ${text}" "$tags"
}

# Закрывает region-аннотацию (конец события).
grafana_region_end() {
    local text="$1"
    local tags="${2:-chaos}"
    grafana_annotate "■ END: ${text}" "$tags"
}

# Обёртка: аннотирует начало, выполняет команду, аннотирует конец.
# Использование: with_annotation "Текст" "tag1,tag2" -- команда аргументы
with_annotation() {
    local text="$1"
    local tags="$2"
    shift 3  # skip text, tags, --

    local ann_id
    ann_id=$(grafana_region_start "$text" "$tags")

    local rc=0
    "$@" || rc=$?

    grafana_region_end "$text" "$tags"
    return $rc
}
