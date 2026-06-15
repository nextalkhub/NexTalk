# Chaos Testing - NexTalk

## TL;DR

Набор тестов, который проверяет что кластер выживает при поломках: сервисы падают и поднимаются, нода дрейнится, Redis перезапускается. Все это происходит под фоновой нагрузкой k6.

**Запустить все 14 сценариев:**
```bash
SKIP_BASELINE=1 SKIP_SPIKE=1 bash ~/nextalk-chaos/run-all.sh 2>&1
```

**Запустить один сценарий:**
```bash
SKIP_BASELINE=1 ONLY_SCENARIO=SC-11 bash ~/nextalk-chaos/run-all.sh 2>&1
```

**Результат прошлого полного прогона: 14/14 ✓**

---

## Навигация

- [Что это и зачем](#что-это-и-зачем)
- [Структура директории](#структура-директории)
- [Требования и настройка](#требования-и-настройка)
- [Как запускать](#как-запускать)
- [Сценарии (SC-01 - SC-14)](#сценарии)
- [Нагрузочные тесты k6](#нагрузочные-тесты-k6)
- [Вспомогательные библиотеки](#вспомогательные-библиотеки)
- [Демонстрация на защите](#демонстрация-на-защите)
- [Что тесты нашли](#что-тесты-нашли)
- [Известные ограничения](#известные-ограничения)

---

## Что это и зачем

Chaos testing - намеренное выведение из строя частей системы, чтобы проверить как она реагирует. Вместо того чтобы верить что "rolling update работает" или "Redis может перезапуститься без даунтайма", мы это воспроизводим и смотрим на реальный результат.

Тест дает бинарный ответ: сценарий пройден или провален. Провал означает что что-то сломалось неожиданным образом - сервис упал, не восстановился, или другой сервис деградировал без причины.

**Когда запускать:**
- После изменений в инфре (новая нода, обновление k3s, изменение Redis-конфига)
- После значимого рефакторинга сервисов
- Перед релизом, если были изменения в конфигурации деплоя

Прогон занимает ~25 минут (без baseline и spike).

---

## Структура директории

```
tests/chaos/
├── run-all.sh              # оркестратор - запускает все по порядку
├── config.env              # адреса, кредсы, таймауты
├── lib/
│   ├── assert.sh           # функции проверки (wait_healthy, assert_alive, ...)
│   └── grafana.sh          # аннотации на timeline в Grafana
├── k6/
│   ├── baseline.js         # 20 VU, 5 мин, steady-state нагрузка
│   ├── companion.js        # 10 VU, фоновая нагрузка во время сценариев
│   ├── spike.js            # 100 VU, резкий рост, проверка пика
│   └── negative.js         # негативные кейсы (401, 404, 405, ...)
└── scenarios/
    ├── SC-01-messaging-down.sh
    ├── SC-02-guild-down.sh
    └── ... (SC-03 - SC-14)
```

---

## Требования и настройка

### Что должно быть установлено

| Инструмент | Зачем |
|---|---|
| `kubectl` | управление k8s кластером |
| `k6` | нагрузочные тесты (`/usr/local/bin/k6` по умолчанию) |
| `ssh` | доступ к db-vps (Redis, PostgreSQL живут там) |
| `curl` | HTTP-проверки из assert.sh |
| `autossh` | стабильный туннель к k3s API (см. ниже) |

### Туннель к k3s API

kubectl подключается через SSH-туннель к HAProxy:

```bash
autossh -M 0 -N \
  -L 6443:10.19.0.51:6443 \
  root@85.198.100.100 \
  -i ~/.ssh/nextalk_deploy \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -f
```

Без `autossh` туннель периодически рвется, что убивает сценарии на середине.

### config.env

Файл `tests/chaos/config.env` содержит все адреса и переменные. Реальный файл - `~/nextalk-chaos/config.env` на сервере (содержит пароли, не в git).

Ключевые переменные:

| Переменная | Значение | Описание |
|---|---|---|
| `NAMESPACE` | `nextalk` | k8s namespace |
| `API_BASE` | `https://nextalk.fun` | базовый URL API |
| `DB_VPS` | `10.19.0.31` | адрес сервера с Redis и PostgreSQL |
| `REDIS_PASSWORD` | из vault | пароль Redis (нужен для redis-cli) |
| `K6_BIN` | `/usr/local/bin/k6` | путь к бинарю k6 |
| `WAIT_HEALTHY_TIMEOUT` | `120` | сколько секунд ждать восстановления deployment |

### Переменные окружения для запуска

| Переменная | Описание |
|---|---|
| `SKIP_BASELINE=1` | не запускать baseline k6 (5 мин) |
| `SKIP_SPIKE=1` | не запускать spike k6 в конце |
| `ONLY_SCENARIO=SC-11` | запустить только один сценарий |

---

## Как запускать

### Полный прогон (рекомендуется на чистом кластере)

```bash
bash ~/nextalk-chaos/run-all.sh 2>&1
```

Последовательность:
1. Pre-flight checks - проверяет что все deployments healthy до старта
2. Baseline k6 (5 мин) - устанавливает baseline метрик
3. Companion k6 запускается в фоне (10 VU, фоновая нагрузка)
4. SC-01 ... SC-14 - сценарии по очереди, 15s пауза между ними
5. Spike k6 - финальный пиковый тест (100 VU)
6. Итоговый отчет

### Быстрый прогон без baseline и spike

```bash
SKIP_BASELINE=1 SKIP_SPIKE=1 bash ~/nextalk-chaos/run-all.sh 2>&1
```

Занимает ~25 минут.

### Один сценарий

```bash
SKIP_BASELINE=1 ONLY_SCENARIO=SC-11 bash ~/nextalk-chaos/run-all.sh 2>&1
```

### Если кластер в плохом состоянии после упавшего прогона

Cleanup-трапы восстанавливают сервисы автоматически, но если kubectl отвалился в середине, нужно восстановить вручную:

```bash
kubectl scale deployment messaging-service guild-service -n nextalk --replicas=8
kubectl scale deployment voice-service -n nextalk --replicas=3
kubectl scale deployment websocket-gateway -n nextalk --replicas=6
kubectl scale deployment livekit -n nextalk --replicas=1
```

---

## Сценарии

Каждый сценарий - bash-скрипт в `tests/chaos/scenarios/`. Структура одинаковая:
1. Проверяет что система здорова перед стартом
2. Ломает что-то (scale=0, SSH-команда, kubectl drain, ...)
3. Проверяет ожидаемое поведение
4. Восстанавливает через `trap cleanup EXIT` - даже при падении скрипта

### Таблица сценариев

| Сценарий | Что делает | Что проверяет |
|---|---|---|
| **SC-01** messaging-down | `messaging-service` → scale=0 | guild-service жив, /api/guilds отвечает; после восстановления поды вернулись |
| **SC-02** guild-down | `guild-service` → scale=0 | Ingress возвращает 503 на /api/guilds, SPA (/) остается доступной |
| **SC-03** redis-restart | `systemctl restart redis-server` на db-vps | Все 4 сервиса здоровы через ~10s после перезапуска |
| **SC-04** ws-gateway-pod-kill | `kubectl delete pod --force` одного pod websocket-gateway | k8s пересоздает pod, через ~15s 6/6 реплик снова ready |
| **SC-05** scale-under-load | messaging: 0→1→3→1→ORIG под фоновой нагрузкой | Сервис принимает трафик при любом числе реплик ≥1 |
| **SC-06** cp-node-cordon | cordon одной из 3 CP нод | k8s API работает, новые поды не планируются на cordoned ноду |
| **SC-07** rolling-update | `kubectl rollout restart` всех 4 deployments | Ни одного downtime-момента в /api/guilds во время rolling restart |
| **SC-08** postgres-restart | `systemctl restart postgresql` на db-vps | PostgreSQL встает через ~15s, все сервисы переподключаются сами |
| **SC-09** ws-gateway-full-down | `websocket-gateway` → scale=0 на 40s | guild и messaging не затронуты; PresenceMonitor чистит stale presence за 30s |
| **SC-10** messaging-down-ws-alive | `messaging-service` → scale=0 | WS Gateway держит существующие соединения; после восстановления OutboxWorker флашит накопленные события |
| **SC-11** redis-extended-outage | `systemctl stop redis-server` на 60s | Сервисы с жесткой зависимостью падают (ws-gateway); после старта Redis - rollout restart сбрасывает CrashLoopBackOff, все восстанавливается |
| **SC-12** livekit-down | `livekit` → scale=0 | guild и messaging не затронуты; voice-service не крашится |
| **SC-13** guild-down-ws-impact | `guild-service` → scale=0 | /api/guilds → 503; WS Gateway живой, новые WS-соединения невозможны |
| **SC-14** worker-node-drain | `kubectl drain` первого worker-узла | Поды эвакуируются на оставшиеся узлы за ~30s, все deployments healthy |
| **SC-15** hpa-autoscale | наблюдает HPA под нагрузкой k6 `ramp.js` | desired/реплики растут под нагрузкой (scale-up реально идёт), witness доступен ≥99%, пик реплик > старта |

**SC-15 не входит в `run-all.sh`** (companion 10 VU не вызовет scale-up). Это демо масштабируемости — запускается отдельно вместе с `ramp.js`. См. [Демонстрация на защите](#демонстрация-на-защите).

### Детали нескольких ключевых сценариев

**SC-07 (rolling update)** - самый показательный для производства. Проверяет что `kubectl rollout restart` (аналог деплоя новой версии) не роняет /api/guilds. При 8 репликах с RollingUpdate strategy maxUnavailable=1 это должно проходить без перерыва.

**SC-11 (Redis 60s outage)** - обнаружил архитектурный факт: websocket-gateway упал в CrashLoopBackOff при отсутствии Redis, потому что SignalR backplane обязателен для старта. guild-service и voice-service пережили Redis-аутаж без краша. После возврата Redis нужен `kubectl rollout restart websocket-gateway` - иначе поды застревают в экспоненциальном backoff CrashLoopBackOff.

**SC-14 (drain)** - реалистичный сценарий планового обслуживания. Проверяет что при drain worker-ноды k8s успевает перепланировать поды быстрее чем истекает WAIT_HEALTHY_TIMEOUT.

---

## Нагрузочные тесты k6

### baseline.js

**Когда:** до chaos-сценариев, на чистом кластере.

20 VU, 5 минут, steady-state. Чередует GET `/` и GET `/api/guilds`. Устанавливает нормальный уровень метрик.

Thresholds:
- `http_req_failed < 1%` - менее 1% ошибок
- `p(95) < 500ms` - 95-й перцентиль latency

Если запустить baseline сразу после chaos-прогона, threshold может не пройти - поды еще не устоялись после рестартов.

### companion.js

**Когда:** запускается автоматически оркестратором во время всех сценариев.

10 VU, фоновая нагрузка. Чередует GET `/` и GET `/api/guilds` с auth-токеном. Threshold - 30% ошибок (допускаем высокий процент, потому что сервисы намеренно роняются).

Нужен чтобы в Grafana было видно реальный трафик во время аутажей.

### spike.js

**Когда:** в конце прогона как финальный стресс-тест.

100 VU, 2.5 минуты (0→100→0 через stages). Проверяет что система не падает под пиком и восстанавливается.

Thresholds:
- `http_req_failed < 5%`
- `p(99) < 2000ms`

### ramp.js

**Когда:** для демо масштабируемости вместе с SC-15, не входит в run-all.sh.

Плавная рампа 0→20→60→120→0 VU со ступенями-плато, рассчитанными под HPA-окна (scaleUp 120s, scaleDown 300s), чтобы автоскейл успел сработать и это было видно в Grafana. Полный прогон ~17 мин.

Thresholds:
- `http_req_failed < 2%`
- `p(95) < 1000ms`, `p(99) < 2000ms`

В отличие от `spike.js` (резкий пик — проверка выживания) рампа даёт HPA время среагировать: на дашборде видно, как `desired` растёт и реплики догоняют.

### negative.js

**Когда:** запускается отдельно, не входит в run-all.sh.

20 VU, 3 минуты. Проверяет что API корректно отвергает некорректные запросы.

| Кейс | Ожидаемый статус |
|---|---|
| Нет Authorization | 401 |
| Невалидный Bearer токен | 401 |
| Basic auth вместо Bearer | 401 |
| GET несуществующего ресурса | 404 |
| POST с невалидным JSON | 400 или 422 |
| Payload > 100KB | 413 или 401 |
| DELETE без id | 405 |

Запуск:
```bash
k6 run tests/chaos/k6/negative.js \
  -e API_BASE=https://nextalk.fun \
  -e TOKEN=<jwt>
```

---

## Вспомогательные библиотеки

### assert.sh

Содержит функции, которые используют все сценарии. Подключается через `source ../lib/assert.sh`.

| Функция | Что делает |
|---|---|
| `wait_healthy <deploy> [timeout]` | Ждет пока deployment не наберет нужное число readyReplicas. По умолчанию таймаут 120s. |
| `wait_down <deploy> [timeout]` | Ждет пока readyReplicas не станет 0. |
| `assert_alive <url>` | HTTP GET, ожидает 2xx-4xx. Статус 5xx или timeout - fail. |
| `assert_http_status <code> <url>` | HTTP GET, ожидает конкретный код. |
| `assert_degraded <url>` | Ожидает НЕ-2xx. Нужен когда проверяем что сервис правильно возвращает ошибку. |
| `scale_and_wait <deploy> <n>` | `kubectl scale` + `wait_healthy` или `wait_down`. |
| `kill_one_pod <deploy>` | Удаляет первый pod из deployment с `--force`. |
| `running_pods <deploy>` | Число Running pods по label `app=<deploy>`. |
| `hypothesis <text>` | Печатает steady-state гипотезу в начале сценария (что ожидаем ещё до сбоя). |
| `slo <text>` | Печатает SLO/abort-критерий эксперимента. |
| `slo_monitor <url> [n] [interval] [min_pct]` | Меряет доступность witness-URL во время эксперимента; abort, если ниже порога (blast radius превышен). Даёт измеренный процент, а не «не упало». |
| `log / warn / fail` | Вывод с цветом и временем. `fail` завершает скрипт с exit 1. |

Все curl-запросы используют `--max-time 10` и `|| echo 000`, чтобы exit code 28 (timeout) не убивал скрипт через `set -e`.

### grafana.sh

Отправляет аннотации в Grafana через REST API. На timeline Grafana видно когда начался и закончился каждый сценарий.

| Функция | Что делает |
|---|---|
| `grafana_annotate <text> <tags>` | Точечная аннотация |
| `grafana_region_start <text> <tags>` | Начало региона (▶ START:) |
| `grafana_region_end <text> <tags>` | Конец региона (■ END:) |

Если Grafana недоступна - аннотации тихо не создаются, сценарии не падают.

---

## Демонстрация на защите

Цель — чтобы преподаватель **видел** отказоустойчивость и масштабируемость в реальном времени, а не верил терминалу. Раскладка экрана: слева Grafana «NexTalk SRE» (golden signals + row «Kubernetes / Scaling» с репликами и HPA), справа сверху — k6 (req/s, error %, p95), справа снизу — chaos-сценарий (печатает гипотезу, SLO и вердикт).

Метод как у профи (game day): **steady-state hypothesis → инъекция сбоя с ограниченным blast radius → измерение → abort при превышении**. Каждый сценарий печатает `hypothesis` и `slo` до старта; `slo_monitor`/SC-15 дают измеренную доступность, а не «не упало».

### Трек A — Отказоустойчивость (под companion-нагрузкой)

```bash
# в одной панели — фоновый трафик-свидетель
k6 run tests/chaos/k6/companion.js -e API_BASE=https://nextalk.fun -e TOKEN=<jwt> --out experimental-prometheus-rw

# в другой — показательные сценарии (Grafana region отметит окно сбоя)
SKIP_BASELINE=1 ONLY_SCENARIO=SC-07 bash run-all.sh   # rolling update = zero downtime
SKIP_BASELINE=1 ONLY_SCENARIO=SC-04 bash run-all.sh   # pod kill = self-heal
SKIP_BASELINE=1 ONLY_SCENARIO=SC-14 bash run-all.sh   # node drain = эвакуация
SKIP_BASELINE=1 ONLY_SCENARIO=SC-03 bash run-all.sh   # redis restart = переподключение
```

На дашборде: error rate ≈ 0, p95 блипует и возвращается, реплики проседают и восстанавливаются.

### Трек B — Масштабируемость (HPA под рампой)

```bash
# панель 1 — растущая нагрузка
k6 run tests/chaos/k6/ramp.js -e API_BASE=https://nextalk.fun -e TOKEN=<jwt> --out experimental-prometheus-rw

# панель 2 — инструмент наблюдения за HPA (печатает таблицу current/desired/max)
WATCH_SECONDS=600 ONLY_SCENARIO=SC-15 SKIP_BASELINE=1 SKIP_SPIKE=1 bash run-all.sh
```

На дашборде (row «Kubernetes / Scaling»): RPS растёт → HPA `desired` ползёт вверх → `Replicas Ready` догоняют → p95 держится в SLO → после спада реплики возвращаются к 2 (через scaleDown-окно ~5 мин).

### Что проговорить вслух

1. **Steady state** — «в покое 2 реплики, p95 ~130ms, 0% ошибок» (цифра из spike: 0% на 49k запросов).
2. **Гипотеза** перед каждым сценарием (её печатает сам скрипт).
3. **Измеренный результат** — доступность witness в %, не «вроде живо».
4. **Вывод** — таблица «гипотеза → измерение» по каждому эксперименту.

---

## Что тесты нашли

### Архитектурные находки

**websocket-gateway имеет жесткую зависимость от Redis.**
При отсутствии Redis pod не стартует - SignalR backplane инициализируется на старте. Если Redis упал, pod уходит в CrashLoopBackOff. После возврата Redis поды не восстанавливаются сами - нужен `kubectl rollout restart`, чтобы сбросить экспоненциальный backoff.

Остальные сервисы (messaging, guild, voice) пережили 60-секундный Redis-аутаж без краша.

**guild-service больше не зависит от Redis.**
Ранее Redis использовался в diagnostic probe endpoint. После удаления этой зависимости guild-service стал stateless. IMemoryCache (для кеша Zitadel /userinfo) - per-pod, пересоздается при старте, не влияет на поведение.

### Подтвержденные факты

| Факт | Сценарий |
|---|---|
| Rolling update 8 реплик - нет даунтайма | SC-07 |
| PostgreSQL restart (~5s) - поды не рестартуют, connection pool сам переподключается | SC-08 |
| Redis restart (~10s) - все 4 сервиса восстанавливаются | SC-03 |
| Drain worker-ноды - поды эвакуируются за ~30s | SC-14 |
| PresenceMonitor чистит stale presence за 30s после исчезновения ws-gateway | SC-09 |
| LiveKit изолирован - его падение не затрагивает messaging и guild | SC-12 |
| guild-service down → /api/guilds 503, SPA (/) живая | SC-02 |

### Результаты spike

100 VU, 49341 запросов за 2.5 минуты:
- **0% ошибок**
- p(99) = 155ms (при пороге 2000ms)
- avg latency = 131ms

---

## Известные ограничения

**SSH-туннель.** Если туннель рвется во время прогона, все последующие сценарии падают с `connection refused`. run-all.sh проверяет kubectl перед каждым сценарием и пропускает его с предупреждением. Решение - autossh вместо обычного `-N -f`.

**Состояние кластера после упавшего прогона.** Cleanup-трапы восстанавливают replica count, но если kubectl был недоступен - сервисы остаются с неправильным числом реплик. Следующий pre-flight check поймает это, если `readyReplicas != spec.replicas`. Если pre-flight прошел, а реплик меньше чем должно быть (например 1 вместо 8) - нужно восстановить вручную.

**Companion k6 не гарантирует изоляцию нагрузки.** Companion шлет запросы на `/api/guilds`, что перекрывается с проверками внутри сценариев. Это нормально - companion показывает реальный пользовательский трафик во время аутажей в Grafana.

**SC-11 не является идеальным тестом graceful degradation.** Сценарий фиксирует поведение, но не проверяет что система *деградирует* (а не падает). Это архитектурное ограничение ws-gateway, а не баг теста.
