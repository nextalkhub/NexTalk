# Анализ архитектуры NexTalk

Дата: 2026-05-31  
Кластер: k3s 6-node HA (Beget VPS), 3 control-plane + 3 workers

Связанные документы: [decisions.md](decisions.md), [tests/chaos/CHAOS_TESTING.md](../tests/chaos/CHAOS_TESTING.md).

---

## 1. Отказоустойчивость

### Control plane

| Компонент | Реплики | Кворум |
|-----------|---------|--------|
| k3s control-plane | 3 | кворум 2/3 - выдерживает потерю одной CP ноды |
| etcd (embedded) | 3 | кворум 2/3 - нечетное число, Raft работает корректно |
| HAProxy (балансировщик CP) | 1 | **SPOF**: падение = недоступность API server для всего кластера |

### Приложение

| Сервис | minReplicas | maxReplicas | PDB |
|--------|-------------|-------------|-----|
| websocket-gateway | 2 | 6 | minAvailable: 1 |
| voice-service | 2 | 4 | minAvailable: 1 |
| messaging-service | 2 | 8 | minAvailable: 1 |
| guild-service | 2 | 8 | minAvailable: 1 |
| zitadel | 1 | - | minAvailable: 1 |

**Критические SPOF:**
- **Zitadel** - 1 реплика, нет HA. Падение = невозможность логина и верификации токенов.
- **PostgreSQL** - один инстанс (CloudNativePG single). Нет реплики чтения, нет автофейловера.
- **LiveKit** - 1 реплика. Падение = все голосовые сессии обрываются.
- **HAProxy** - 1 под, балансирует трафик на CP API; нет keepalived/VRRP.

---

## 2. Масштабируемость

### HPA конфигурация

| Сервис | CPU threshold | Логика |
|--------|---------------|--------|
| websocket-gateway | 60% | Держит WebSocket-соединения - снижен порог, чтобы не терять соединения при пике |
| guild-service | 70% | REST, stateless - стандартный порог |
| messaging-service | 70% | REST, stateless - стандартный порог |
| voice-service | 70% | LiveKit-обертка |

### Проблема: PostgreSQL `max_connections`

CloudNativePG конфиг: `max_connections: 100`.

При максимальных репликах HPA:
- websocket-gateway: 6 реплик × N соединений пула
- voice-service: 4 реплики
- messaging-service: 8 реплик
- guild-service: 8 реплик
- zitadel: 1 реплика (держит свой пул)

При агрессивном пуле соединений суммарное число может превысить 100 - PostgreSQL начнет отклонять соединения с `FATAL: sorry, too many clients`. **Решение:** добавить PgBouncer в transaction mode.

### SignalR Redis backplane

Реализован: `AddStackExchangeRedis` в `Program.cs` websocket-gateway. Все поды шарят состояние соединений через Redis pub/sub - broadcast доходит до всех клиентов при любом числе реплик.

### Stateless vs Stateful

| Сервис | Stateless? | Примечание |
|--------|-----------|------------|
| websocket-gateway | частично | SignalR backplane через Redis; presence (ConcurrentDictionary) in-memory per-pod |
| guild-service | да | REST; Zitadel UserInfo кешируется в IMemoryCache per-pod (не в Redis) |
| messaging-service | да | REST, stateless; Outbox poll из PostgreSQL |
| voice-service | да | Redis SessionStore (DB=3) - stateless при наличии Redis |
| zitadel | нет | сессии, токены - нужна БД |

---

## 3. Observability

### Текущее состояние

| Компонент | Статус | Примечание |
|-----------|--------|------------|
| Prometheus | работает | scrape метрик с подов |
| remote_write → obs-vps | работает | метрики уходят во внешний Prometheus/Thanos |
| Grafana | работает | дашборды настроены; alerting rules через Grafana managed alerts |
| Alloy | работает | DaemonSet на всех 6 нодах; читает `/var/log/pods/nextalk_*`, пушит в Loki на obs-vps |
| Tempo (трейсы) | работает | все 4 сервиса инструментированы OpenTelemetry SDK, OTLP → Tempo |
| AlertManager | нет | алерты настроены через Grafana managed alerts (CrashLoop, error rate, cert expiry, latency) |
| kube-state-metrics | работает | установлен v2.13.0, scrape deployments/pods/HPA/nodes |
| node-exporter | **нет** | метрики нод (CPU/RAM/disk) недоступны |

### Что нужно сделать

1. **node-exporter** - без него нет метрик CPU/RAM/disk нод. Добавить DaemonSet или установить через kube-prometheus-stack.
2. **OOMKilled алерт** - в Grafana managed alerts пока нет правила на OOMKilled и PostgreSQL connections > 80%.

---

## Приоритеты

| Приоритет | Задача | Риск без нее |
|-----------|--------|--------------|
| 🔴 высокий | PgBouncer или ограничение пула соединений | отказ БД при пиковой нагрузке |
| 🔴 высокий | node-exporter | нет метрик нод - незаметный OOM/disk full |
| 🟡 средний | Zitadel HA (2+ реплик) | SPOF аутентификации |
| 🟡 средний | OOMKilled + PostgreSQL connections алерты в Grafana | пропущенные инциденты |

---

## 4. Известные SPOF и ограничения деплоя

Каждый пункт - это либо единственная точка отказа, либо место где отказ влечет деградацию без автоматического восстановления.

### Инфраструктура

| Компонент | Проблема | Что происходит при отказе | Возможное решение |
|-----------|----------|--------------------------|-------------------|
| **HAProxy** | 1 инстанс без резервирования | k3s API server недоступен: нельзя делать kubectl, деплой зависает. Поды продолжают работать, но управление кластером теряется. | Два HAProxy + keepalived (VRRP). kube-vip не работает на Beget (ARP блокируется гипервизором - см. decisions.md) |
| **PostgreSQL** | Single instance, нет реплики | guild-service и messaging-service возвращают 503. Данные не теряются если диск цел, но сервис недоступен до перезапуска БД. | Streaming replication + Patroni; или CloudNativePG HA mode |
| **Redis** | Single instance | websocket-gateway входит в CrashLoopBackOff (SignalR backplane), voice-service теряет сессии. Восстановление требует `kubectl rollout restart`. | Redis Sentinel; или принять как риск для текущего масштаба |
| **etcd: 3 CP** | кворум 2/3 | Потеря одной CP ноды - etcd продолжает работать (2/3 кворум). Потеря двух CP нод = кворум потерян, деплои не проходят. | Принято как допустимый риск для текущего масштаба |
| **Zitadel** | 1 реплика | Нельзя логиниться. Существующие токены работают до истечения (~1 час). После - 401 везде. | Zitadel HA: отдельные Job init+setup, PAT в Secret (задокументировано в decisions.md) |
| **LiveKit** | 1 реплика | Все голосовые сессии обрываются при рестарте. Клиент должен переподключиться. | Нет простого self-hosted HA; документировать как known limitation |
| **etcd backup** | Snapshots только локально | Потеря всех 3 CP нод = безвозвратная потеря состояния кластера. | `k3s etcd-snapshot` по cron + offload в S3 (см. decisions.md) |

### Сеть и DNS

| Место | Проблема | Что происходит | Возможное решение |
|-------|----------|----------------|-------------------|
| **DNS TTL на worker-нодах** | 3 A-записи на 3 worker IP, TTL=300 | Если worker умирает, DNS продолжает отправлять на него трафик до 5 минут. Часть запросов падает с connection refused. | Снизить TTL до 60 сек; или Cloudflare Proxy (мгновенный failover через Anycast healthcheck) |
| **GRE-туннель obs-vps** | obs-vps ходит в интернет через bastion (worker-1) | Падение bastion = obs-vps теряет интернет. Docker pull не работает, образы не обновить. Уже запущенные контейнеры продолжают работать. | Дать obs-vps публичный IP напрямую |
| **cert-manager HTTP-01** | Зависит от публичного DNS и доступности ingress-nginx | Если HTTP-01 challenge не проходит (DNS смена, ingress недоступен) - сертификат не перевыпустится через 90 дней. TLS ломается. | Мониторинг expiry (алерт за 14 дней); или переход на DNS-01 challenge |

### Приложение

| Место | Проблема | Что происходит | Возможное решение |
|-------|----------|----------------|-------------------|
| **PostgreSQL `max_connections=100`** | При максимальных репликах HPA сумма пулов > 100 | `FATAL: sorry, too many clients` - часть подов не может подключиться к БД. | PgBouncer в transaction mode перед PostgreSQL |
| **Presence: in-memory** | WS Gateway хранит presence в ConcurrentDictionary | При рестарте пода все статусы сбрасываются. Клиенты видят всех офлайн до следующего heartbeat (20 сек). | Redis для presence (аналогично SessionStore в voice-service) |
| **Outbox: нет дедупликации при конкурентных workers** | OutboxWorker опрашивает outbox_events каждые 100 мс | При 2+ репликах messaging-service два воркера могут забрать одно событие одновременно. Защита - `processed = true` в транзакции, но window гонки есть. | SELECT FOR UPDATE SKIP LOCKED в OutboxWorker |
