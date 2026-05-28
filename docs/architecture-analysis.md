# Анализ архитектуры NexTalk

Дата: 2026-05-28  
Кластер: k3s 3-node HA (Beget VPS), 2 control-plane + 1 worker

---

## 1. Отказоустойчивость

### Control plane

| Компонент | Реплики | Кворум |
|-----------|---------|--------|
| k3s control-plane | 2 | требуется 2 из 2 — нет кворума при потере одной ноды |
| etcd (embedded) | 2 | **проблема**: 2 узла не образуют кворум raft (нужно нечётное число ≥ 3) |
| HAProxy (балансировщик CP) | 1 | **SPOF**: падение = недоступность API server для всего кластера |

**Рекомендация по control plane:** добавить третью control-plane ноду. Тогда etcd получает кворум 2/3, HAProxy можно убрать или дублировать keepalived.

### Приложение

| Сервис | minReplicas | maxReplicas | PDB |
|--------|-------------|-------------|-----|
| gateway | 2 | 8 | нет |
| rtc | 1 | 4 | нет |
| media | 1 | 3 | нет |
| zitadel | 1 | — | нет |

Без PDB (`PodDisruptionBudget`) rolling update или дренаж ноды могут временно обнулить количество подов.

**Критические SPOF:**
- **Zitadel** — 1 реплика, нет HA. Падение = невозможность логина и верификации токенов.
- **PostgreSQL** — один инстанс (CloudNativePG single). Нет реплики чтения, нет автофейловера.
- **LiveKit** — 1 реплика. Падение = все голосовые сессии обрываются.
- **HAProxy** — 1 под, балансирует трафик на CP API; нет keepalived/VRRP.

---

## 2. Масштабируемость

### HPA конфигурация

| Сервис | CPU threshold | Логика |
|--------|---------------|--------|
| gateway | 60% | Держит WebSocket-соединения — снижен порог, чтобы не терять соединения при пике |
| media | 70% | REST, stateless — стандартный порог |
| rtc | 70% | LiveKit-обёртка |

### Проблема: PostgreSQL `max_connections`

CloudNativePG конфиг: `max_connections: 100`.

При максимальных репликах HPA:
- gateway: 8 реплик × N соединений пула
- rtc: 4 реплики
- media: 3 реплики
- zitadel: 1 реплика (держит свой пул)

При агрессивном пуле соединений суммарное число может превысить 100 — PostgreSQL начнёт отклонять соединения с `FATAL: sorry, too many clients`. **Решение:** добавить PgBouncer в transaction mode.

### Проблема: SignalR без Redis backplane

Gateway при `minReplicas: 2` держит WebSocket-соединения в памяти. При scale-in:
- Под с активными соединениями убивается
- Клиенты реконнектятся к другому поду
- Сообщения в очереди теряются

При scale-out:
- Новый под не знает о соединениях на других подах
- Broadcast (`SendAll`, группы по каналу) доходит только до части клиентов

**Решение:** подключить Redis backplane для SignalR. Тогда все поды шарят состояние соединений через Redis pub/sub.

```csharp
// Program.cs
builder.Services.AddSignalR().AddStackExchangeRedis(redisConnectionString);
```

Redis уже есть в Helm-чарте (используется для кеша) — достаточно указать тот же инстанс или выделить отдельный.

### Stateless vs Stateful

| Сервис | Stateless? | Примечание |
|--------|-----------|------------|
| gateway | частично | SignalR держит соединения в памяти |
| media | да | REST, можно масштабировать без ограничений |
| rtc | нет | LiveKit rooms — внутреннее состояние |
| zitadel | нет | сессии, токены — нужна БД |

---

## 3. Observability

### Текущее состояние

| Компонент | Статус | Примечание |
|-----------|--------|------------|
| Prometheus | работает | scrape метрик с подов |
| remote_write → obs-vps | работает | метрики уходят во внешний Prometheus/Thanos |
| Grafana | работает | дашборды настроены |
| Alloy / Promtail | **отключён** | `alloy.enabled: false` в values — логи не собираются |
| Tempo (трейсы) | готов к работе | инстанс поднят, но приложение не инструментировано |
| AlertManager | **нет** | никаких алертов — инциденты обнаруживаются вручную |
| kube-state-metrics | нет данных | неизвестно, установлен ли |
| node-exporter | нет данных | метрики нод могут отсутствовать |

### Что нужно сделать

1. **Включить Alloy** — поменять `alloy.enabled: true` в Helm values, настроить loki endpoint для сбора логов.
2. **AlertManager** — настроить хотя бы базовые алерты:
   - pod CrashLoopBackOff
   - pod OOMKilled
   - certificate expiry < 7 дней
   - PostgreSQL connections > 80%
3. **Инструментировать приложение для Tempo** — добавить OpenTelemetry SDK в gateway, настроить exporter на Tempo endpoint.
4. **Проверить kube-state-metrics и node-exporter** — без них нет метрик по состоянию деплойментов и ресурсам нод.

### Логирование

Сейчас логи доступны только через `kubectl logs`. При рестарте пода логи теряются. Alloy/Promtail → Loki закрывает эту проблему.

---

## Приоритеты

| Приоритет | Задача | Риск без неё |
|-----------|--------|--------------|
| 🔴 высокий | Redis backplane для SignalR | потеря сообщений при scale-out |
| 🔴 высокий | AlertManager с базовыми алертами | инциденты не обнаруживаются |
| 🔴 высокий | PgBouncer или ограничение пула соединений | отказ БД при пиковой нагрузке |
| 🟡 средний | PDB для gateway и rtc | downtime при rolling update |
| 🟡 средний | Включить Alloy/Loki | нет логов при постмортеме |
| 🟡 средний | Zitadel HA (2+ реплик) | SPOF аутентификации |
| 🟢 низкий | Третья control-plane нода | etcd без кворума |
| 🟢 низкий | Инструментирование OpenTelemetry | нет трейсов |
