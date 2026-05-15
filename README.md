# NexTalk

Платформа для командного общения. Аналог Discord.
Микросервисная архитектура с Kubernetes, Zitadel (IdP), Nginx Ingress и паттернами отказоустойчивости.

## Навигация по проекту

| Вам нужно | Идите сюда |
|:--|:--|
| Запустить проект | [§0 Быстрый старт](#0-быстрый-старт) |
| Понять, что это за проект | [§1 Проблема и идея](#1-проблема-и-идея) |
| Увидеть, что входит в MVP | [§2 MVP](#2-mvp) |
| Понять архитектуру (схемы) | [c4-model.md](docs/c4-model.md) |
| Понять архитектуру (текст) | [§3 Эволюция](#3-эволюция-архитектуры), [§4 Финальная](#4-финальная-архитектура) |
| Найти функциональные требования | [§5 FR](#5-функциональные-требования-fr) |
| Найти нефункциональные требования | [§9 NFR](#9-нефункциональные-требования-nfr) |
| Увидеть план работ | [tasks.md](docs/tasks.md) |
| Увидеть тест-кейсы | [test-case.md](docs/test-case.md) |
| Понять, как сервисы общаются | [§6 Сервисы](#6-сервисы-системы), [§7 Взаимодействие](#7-межсервисное-взаимодействие) |
| Понять отказоустойчивость | [§8 Отказоустойчивость](#8-отказоустойчивость) |
| Увидеть, что НЕ входит в MVP | [§12 За рамками](#12-за-рамками-mvp) |

---

## Содержание

0. [Быстрый старт](#0-быстрый-старт)
1. [Проблема и идея](#1-проблема-и-идея)
2. [MVP](#2-mvp)
3. [Эволюция архитектуры](#3-эволюция-архитектуры)
4. [Финальная архитектура](#4-финальная-архитектура)
5. [Функциональные требования (FR)](#5-функциональные-требования-fr)
6. [Сервисы системы](#6-сервисы-системы)
7. [Межсервисное взаимодействие](#7-межсервисное-взаимодействие)
8. [Отказоустойчивость](#8-отказоустойчивость)
9. [Нефункциональные требования (NFR)](#9-нефункциональные-требования-nfr)
10. [Где хранятся данные](#10-где-хранятся-данные)
11. [Фронтенд](#11-фронтенд)
12. [За рамками MVP](#12-за-рамками-mvp)
13. [Глоссарий](#13-глоссарий)

---

## 0. Быстрый старт

Два способа запуска: **docker-compose** (локально, минута до старта) и **Kubernetes** (продакшн-подобная среда, k3s).

---

### Вариант A - Docker Compose

#### Требования

| Инструмент | Версия | Зачем |
|:--|:--|:--|
| Docker | 25+ | Запуск всех сервисов |
| Docker Compose | v2 (plugin) | Оркестрация контейнеров локально |
| Git | любая | Клонирование репозитория |

#### Запуск

```bash
git clone <repo-url>
cd NexTalk

# Запустить все сервисы (дождаться healthy-статуса всех контейнеров)
docker compose --env-file=.env.example up -d --build --wait
```

После успешного запуска:

| Адрес | Что там |
|:--|:--|
| http://localhost:8080 | Nginx - точка входа |
| http://localhost:8080/swagger | Unified Swagger UI (все сервисы) |
| http://localhost:8080/ui/v2/login | Zitadel - регистрация и логин |
| http://localhost:8080/ui/console | Zitadel Console - управление |
| http://localhost:8080/api/guilds | Guild Service (требует JWT) |
| http://localhost:8080/api/channels | Messaging Service (требует JWT) |
| http://localhost:8080/api/voice | Voice Service (требует JWT) |
| http://localhost:8080/ws | WebSocket Gateway (SignalR) |
| http://localhost:8080/livekit | LiveKit SFU - HTTP API |

#### Проверка

```bash
docker compose ps                             # все контейнеры healthy
docker compose logs zitadel-bootstrap         # Bootstrap: Created project / apps
curl -s http://localhost:8080/health
curl -s http://localhost:8080/swagger         
curl -s http://localhost:8080/swagger/config.json  # {"spaClientId":"...","swaggerClientId":"..."}
curl -s http://localhost:8080/.well-known/openid-configuration | jq .issuer
```

#### Swagger UI - авторизация через Zitadel

Единый Swagger UI (`/swagger`) показывает спецификации всех четырех сервисов в одном
выпадающем списке. Под капотом - `swagger-ui-dist` с CDN, который читает
`/swagger/config.json` (генерируется bootstrap-контейнером) и проксирует
`/swagger/{service}/v1/swagger.json` к соответствующему сервису через Nginx.


1. Открыть `http://localhost:8080/swagger`
2. Выбрать сервис в выпадающем списке (Guild / Messaging / Voice / WebSocket)
3. Нажать **Authorize** → выбрать **oauth2**
4. Scopes: `openid profile email`
5. Нажать **Authorize** - браузер перенаправит на страницу входа Zitadel
6. Войти в систему (или зарегистрироваться)
7. После редиректа Swagger UI обменяет код на токен (PKCE)
8. Все последующие запросы будут содержать `Authorization: Bearer <token>`

> `client_id` подставляется автоматически из `/swagger/config.json` -  
> файл рождается в shared docker volume `zitadel-output` (заполняется
> `zitadel-bootstrap` через Management API при первом старте).

> **Swagger не грузит спецификацию или выдаёт "Unable to render":**  
> после запуска проекта nginx может кэшировать старые IP контейнеров.  
> Решение: перезапустить nginx или **Ctrl+Shift+R** в браузере.


#### Остановка

```bash
docker compose down        # остановить
docker compose down -v     # остановить + удалить данные
```

---

### Вариант B - Kubernetes (k3s)

#### Требования

| Инструмент | Версия | Зачем |
|:--|:--|:--|
| k3s | v1.30+ | Легкий кластер (1 нода) |
| kubectl | 1.30+ | Управление кластером |
| Git | любая | Клонирование репозитория |

#### Установка k3s (если еще нет)

```bash
# Установить k3s без Traefik (используем Nginx Ingress Controller)
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable=traefik" sh -

# Настроить kubeconfig
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER ~/.kube/config

# Установить Nginx Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.0/deploy/static/provider/cloud/deploy.yaml
kubectl wait --namespace ingress-nginx --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller --timeout=120s
```

#### Запуск через Helm

```bash
helm install nextalk charts/nextalk/ \
  --namespace nextalk --create-namespace \
  --set zitadel.domain=<ваш-домен> \
  --set postgres.password=<пароль>

helm status nextalk -n nextalk
```

Или через `make`:

```bash
make helm-install
make helm-upgrade   # при обновлении values
```

#### Без внешнего registry (локально / k3s без интернета)

```bash
# Собрать образы и импортировать прямо в containerd k3s
make import

# Затем деплоить
make deploy
```

#### Полезные команды Makefile

```bash
make                          # список всех команд
make logs SERVICE=guild-service   # tail логов конкретного сервиса
make probe                    # тест Redis cache hit/miss (авто-определяет NODE_IP)
make probe NODE_IP=1.2.3.4    # то же, но с явным IP
make teardown                 # удалить весь namespace (деструктивно!)
```

После запуска (NODE_IP - IP вашей k3s-ноды):

| Адрес | Что там |
|:--|:--|
| http://`<NODE_IP>`/ui/v2/login | Zitadel - логин |
| http://`<NODE_IP>`/api/guilds | Guild Service |
| http://`<NODE_IP>`/monitoring/grafana | Grafana дашборды |
| http://`<NODE_IP>`/monitoring/kibana | Kibana (логи) |

#### Проверка Redis-кэша между репликами Guild Service

Guild Service работает в 2 репликах, общий кэш через Redis. Демонстрация cache hit/miss:

```bash
# Первый запрос - cache miss (Redis пустой, Pod сохраняет значение)
curl http://<NODE_IP>/api/guilds/probe
# {"source":"origin","value":"set by guild-service-abc at 2026-..."}

# Второй запрос (в течение 30 сек) - cache hit (может попасть на другой Pod)
curl http://<NODE_IP>/api/guilds/probe
# {"source":"cache","value":"set by guild-service-abc at 2026-..."}
```

Запросы проходят через Nginx Ingress → балансируются между Pod-ами → оба читают одно значение из Redis.

#### Удаление

```bash
kubectl delete namespace nextalk      # через манифесты
# или
helm uninstall nextalk -n nextalk      # через Helm
```

---

### Наблюдаемость

| Инструмент | Что делает |
|:--|:--|
| **Prometheus** | Scrape `/metrics` со всех .NET-сервисов каждые 15 сек |
| **Grafana** | Дашборд: RPS, latency p50/p95, error rate 4xx/5xx, requests in flight |
| **Serilog** | JSON-логи на stdout, поле `MachineName` идентифицирует Pod |
| **Filebeat** | DaemonSet, собирает JSON-логи с нод, шипит в Elasticsearch |
| **Kibana** | Поиск и фильтрация логов; Elastic Alert при `log.level: error` → email |

Настройка Elastic Alert: [docs/elk-alert-setup.md](docs/elk-alert-setup.md)  
Grafana дашборд: [grafana/nextalk-dashboard.json](grafana/nextalk-dashboard.json)

---

## 1. Проблема и идея

### Что это такое

NexTalk - веб-платформа для общения: серверы (гильдии), текстовые и голосовые каналы, роли и права доступа.

### Ключевые архитектурные решения

- **Микросервисы** - 3 бизнес-сервиса + WebSocket Gateway + Nginx, каждый деплоится независимо
- **Zitadel** - делегированная аутентификация (OIDC), отдельный IdP-сервис
- **Nginx** - единая точка входа (reverse proxy в docker-compose, Ingress Controller в k8s)
- **Kubernetes** - оркестрация контейнеров, Ingress, Secrets, Prometheus + Grafana
- **Паттерны отказоустойчивости** - Circuit Breaker, Retry, Rate Limiting, Idempotency, Health Checks
- **Outbox Pattern** - гарантия at-least-once доставки сообщений

### E2EE

Спроектировано на уровне архитектуры. В MVP сообщения передаются plain text (защищены TLS). Модульная структура готова к внедрению E2EE в следующей фазе.

---

## 2. MVP

### Входит в MVP

| Функция | Описание |
|:--|:--|
| **Аутентификация** | Zitadel (OIDC): регистрация, логин, JWT access + refresh tokens |
| **Сервера (гильдии)** | Создание, удаление, 3 фиксированные роли (Owner, Admin, Member), назначение ролей |
| **Текстовые каналы** | Создание, удаление, отправка/получение/удаление сообщений plain text |
| **Голосовые каналы** | WebRTC через LiveKit SFU |
| **Чат в реальном времени** | SignalR WebSocket, Outbox Pattern (at-least-once) |
| **Онлайн-статусы** | Heartbeat 20 сек, in-memory в WebSocket Gateway |
| **Модерация** | Кик/бан с мгновенным отключением от WS и голоса |
| **Инвайт-ссылки** | Генерация и принятие приглашений |
| **Микросервисы** | 4 .NET сервиса + Nginx + Zitadel |
| **Kubernetes** | k8s-манифесты, Ingress, Secrets |
| **Наблюдаемость** | Serilog + Correlation ID + Prometheus + Grafana |
| **Отказоустойчивость** | Circuit Breaker, Retry, Rate Limiting, Idempotency, Health Checks |

### Не входит в MVP

- E2EE - только в архитектуре и презентации
- Личные сообщения (DM)
- Email-уведомления
- Вложения, аватары (MinIO)
- OAuth (Google/GitHub) - Zitadel поддерживает, но не настраиваем
- Distributed Redis для presence и rate limiting (хранятся in-memory в WS Gateway / сервисах)

---

## 3. Эволюция архитектуры

Система развивается в 3 стадии. Бизнес-логика не переписывается - меняется только способ развертывания и связывания модулей.

### Стадия 1 - Модульный монолит (неделя 1–2)

Все в одном .NET-процессе. Быстрый старт, удобная отладка.

```
┌─────────┐       ┌───────────┐       ┌────────────────────────────┐
│ Browser │──────→│   Nginx   │──────→│      .NET Монолит          │
│ (React) │       │   :80     │       │  ┌────────┐ ┌───────────┐  │
└─────────┘       └───────────┘       │  │ Guild  │ │ Messaging │  │
     │                                │  │ Module │ │ Module    │  │
     │            ┌───────────┐       │  └────────┘ └───────────┘  │
     └───────────→│  Zitadel  │       │  ┌────────┐ ┌───────────┐  │
      OIDC login  │  :8080    │       │  │ Voice  │ │ WS Layer  │  │
                  └───────────┘       │  │ Module │ │ (SignalR) │  │
                                      │  └────────┘ └───────────┘  │
                                      └───────────────┬────────────┘
                                                      │
                                      ┌───────────────┼──────────┐
                                      │               │          │
                                ┌─────┴──────┐   ┌────┴────┐  ┌──┴───┐
                                │ PostgreSQL │   │ LiveKit │  │ ...  │
                                └────────────┘   └─────────┘  └──────┘
```

**Будут запущены:** Nginx, .NET монолит, PostgreSQL, Zitadel, LiveKit - **5 контейнеров**

**Как модули общаются:** прямые вызовы через интерфейсы внутри одного процесса.

### Стадия 2 - Микросервисы (неделя 3)

Каждый модуль становится отдельным сервисом. Интерфейсы остаются, но реализации заменяются на HTTP-клиенты.

```
┌─────────┐       ┌───────────────────────────────────────────────────┐
│ Browser │──────→│                   Nginx :80                       │
│ (React) │       │  /api/guilds/*    → Guild Service :5001           │
└─────────┘       │  /api/invites/*   → Guild Service :5001           │
     │            │  /api/channels/*  → Messaging Service :5002       │
     │            │  /api/messages/*  → Messaging Service :5002       │
     │            │  /api/voice/*     → Voice Service :5003           │
     │            │  /ws              → WS Gateway :5004 (WebSocket)  │
     │            │  /auth/*          → Zitadel :8080                 │
     │            └─────┬────────────┬───────────┬────────────┬───────┘
     │                  │            │           │            │
     │              ┌───┴────┐  ┌────┴────┐  ┌───┴────┐  ┌────┴────┐
     │              │ Guild  │  │Messaging│  │ Voice  │  │   WS    │
     │              │Service │  │ Service │  │Service │  │ Gateway │
     │              └───┬────┘  └────┬────┘  └────────┘  └─────────┘
     │                  │            │                     
     │            ┌─────┴────────────┴────────────────┐
     │            │     PostgreSQL                    │
     │            │     ├── guild schema              │
     │            │     └── messaging schema          │
     │            └───────────────────────────────────┘
     │
     │            ┌───────────┐
     └───────────→│  Zitadel  │ (OIDC login)
                  └───────────┘
```

**Будут запущены:** Nginx, Guild Service, Messaging Service, Voice Service, WS Gateway, PostgreSQL, Zitadel, LiveKit - **8 контейнеров**

**Что изменилось по сравнению со Стадией 1:**
- ✂️ Монолит разрезан на 4 сервиса + WS Gateway
- ✂️ Nginx.conf обновлен: вместо одного upstream - пять
- ✂️ docker-compose.yml: вместо 1 .NET-контейнера - 5
- ✂️ Добавлены паттерны отказоустойчивости (Polly, Health Checks, Idempotency)

**Что НЕ изменилось:**
- ✅ Бизнес-логика внутри модулей - без изменений
- ✅ Схемы БД - без изменений
- ✅ Фронтенд - без изменений (тот же URL Nginx)
- ✅ Zitadel - без изменений
- ✅ LiveKit - без изменений

### Стадия 3 - Kubernetes (неделя 4)

docker-compose → k8s. Те же Docker-образы, другой оркестратор.

```
┌─────────┐     ┌───────────────────── Kubernetes (k3s) ───────────────────────┐
│ Browser │────→│  Nginx Ingress Controller                                    │
│ (React) │     │    │                                                         │
└─────────┘     │    ├── /api/guilds/*   → [Guild Pod]      → [PostgreSQL Pod] │
                │    ├── /api/invites/*  → [Guild Pod]                         │
                │    ├── /api/channels/* → [Messaging Pod]  → [PostgreSQL Pod] │
                │    ├── /api/messages/* → [Messaging Pod]  → [PostgreSQL Pod] │
                │    ├── /api/voice/*    → [Voice Pod]      → [LiveKit Pod]    │
                │    ├── /ws             → [WS Gateway Pod]                    │
                │    └── /auth/*         → [Zitadel Pod]                       │
                │                                                              │
                │  [Prometheus Pod] ──scrape──→ все сервисы /metrics           │
                │  [Grafana Pod]    ──query───→  Prometheus                    │
                └──────────────────────────────────────────────────────────────┘
```

**Будут запущены:** 11 подов в k8s (те же 8 сервисов + Prometheus + Grafana + React SPA)

**Что изменилось по сравнению со Стадией 2:**
- ✂️ docker-compose → k8s-манифесты (Deployment + Service + Ingress)
- ✂️ Nginx-контейнер → Nginx Ingress Controller (устанавливается `kubectl apply -f`; Traefik в k3s отключается через `--disable=traefik`)
- ✂️ `.env` секреты → Kubernetes Secrets
- ✂️ Добавлены Prometheus + Grafana

**Что НЕ изменилось:**
- ✅ Docker-образы - те же самые
- ✅ Код сервисов - без изменений
- ✅ Правила маршрутизации - те же (только формат YAML вместо Nginx.conf)

> **docker-compose остается рабочим.** Это fallback: если k8s сломается перед демо, показываем docker-compose.

---

## 4. Финальная архитектура

### Контейнеры / Поды

| # | Сервис | Технология | Роль |
|:--|:--|:--|:--|
| 1 | **Nginx** | Nginx (контейнер) / Ingress Controller (k8s) | Reverse proxy, rate limiting, routing |
| 2 | **WebSocket Gateway** | ASP.NET + SignalR | WS-соединения, broadcast, presence |
| 3 | **Guild Service** | ASP.NET | Серверы, каналы, роли, инвайты, модерация |
| 4 | **Messaging Service** | ASP.NET | Сообщения, Outbox Pattern, идемпотентность |
| 5 | **Voice Service** | ASP.NET | LiveKit-токены, управление комнатами |
| 6 | **Zitadel** | Go | IdP: OIDC, регистрация, логин, JWT |
| 7 | **PostgreSQL** | PostgreSQL 17 | 2 схемы (guild, messaging) + БД Zitadel |
| 8 | **Redis** | Redis | Distributed cache (Guild Service) |
| 9 | **LiveKit** | Go | SFU + встроенный TURN |
| 10 | **Prometheus** | Prometheus | Сбор метрик /metrics |
| 11 | **Grafana** | Grafana | Дашборды, визуализация |
| 12 | **React SPA** | React 18 + TypeScript | Фронтенд (статика через Nginx) |

### Пользователи и роли

| Роль | Права | Как получает |
|:--|:--|:--|
| **Owner** | Полный контроль: каналы, роли, удаление сервера, кик/бан | Создал сервер |
| **Admin** | Управление каналами, кик/бан, удаление сообщений | Назначен Owner |
| **Member** | Писать сообщения, участвовать в голосовых каналах | Принял инвайт |

3 фиксированные роли с хардкоженными правами. Не bitmask - простые enum-проверки.

### Use Cases

**UC-1: Регистрация и вход.** Пользователь нажимает "Войти" → redirect на Zitadel → логин/регистрация → redirect обратно с JWT.

**UC-2: Создание сервера.** Пользователь создает сервер → настраивает каналы → генерирует инвайт → приглашает друзей.

**UC-3: Отправка сообщения.** Пользователь пишет текст → WebSocket Gateway → Messaging Service сохраняет + outbox → broadcast всем онлайн.

**UC-4: Голосовой канал.** Пользователь входит → Voice Service генерирует LiveKit-токен → браузер подключается к LiveKit → голос.

**UC-5: Модерация.** Admin/Owner банит участника → мгновенное отключение от WebSocket и голоса.

---

## 5. Функциональные требования (FR)

### Аутентификация (Zitadel)

| ID   | Требование                                                        | Приоритет |
| :--- | :---------------------------------------------------------------- | :-------- |
| FR‑1 | Регистрация через Zitadel (OIDC Authorization Code + PKCE)        | Must      |
| FR‑2 | Логин через Zitadel с получением JWT access token + refresh token | Must      |
| FR‑3 | Автоматическое обновление access token (silent refresh)           | Must      |
| FR‑4 | Получение профиля из JWT claims (sub, email, name, preferred_username) | Must      |

### Серверы и каналы

| ID | Требование | Приоритет |
|:--|:--|:--|
| FR‑5 | Создание сервера. Создатель получает роль Owner | Must |
| FR‑6 | Создание текстового канала внутри сервера | Must |
| FR‑7 | Создание голосового канала внутри сервера | Must |
| FR‑8 | Получение списка серверов пользователя | Must |
| FR‑9 | Получение списка каналов сервера | Must |
| FR‑10 | Удаление канала (Owner/Admin) | Should |

### Приглашения и участники

| ID | Требование | Приоритет |
|:--|:--|:--|
| FR‑11 | Генерация инвайт-ссылки с TTL и лимитом использований | Must |
| FR‑12 | Вступление на сервер по инвайт-ссылке | Must |
| FR‑13 | Назначение роли Admin участнику (только Owner) | Should |
| FR‑14 | Получение списка участников сервера с ролями и онлайн-статусом | Must |

> Статус хранится в WS Gateway (in-memory). Фронт сначала получает список участников с ролями через `GET /api/guilds/{id}/members` (Guild Service), затем получает актуальные статусы через `presence.online`/`presence.offline` события по SignalR (flow 7).

### Сообщения

| ID | Требование | Приоритет |
|:--|:--|:--|
| FR‑15 | Отправка текстового сообщения в канал (plain text) | Must |
| FR‑16 | Получение истории (cursor-based pagination, 50 на запрос) | Must |
| FR‑17 | Удаление сообщения (автор / Admin / Owner) | Should |
| FR‑18 | Доставка сообщений в реальном времени через WebSocket | Must |
| FR‑19 | Гарантия at-least-once доставки через Outbox Pattern | Must |
| FR-20 | Идемпотентность при повторной отправке (X-Idempotency-Key) | Must |

### Голос

| ID | Требование | Приоритет |
|:--|:--|:--|
| FR‑21 | Вход в голосовой канал с получением LiveKit-токена | Must |
| FR‑22 | Выход из голосового канала | Must |
| FR‑23 | Mute/unmute микрофона | Must | Клиент |
| FR‑24 | Отображение говорящего (voice activity detection) | Should | Клиент |

> FR-23 и FR-24 - чисто клиентская логика (`livekit-client`). Нет серверного кода, endpointов и flows.

### Модерация

| ID | Требование | Приоритет |
|:--|:--|:--|
| FR‑25 | Кик участника с удалением из сервера | Must |
| FR‑26 | Бан участника с мгновенным отключением от WS и голоса | Must |
| FR‑30 | Удаление сервера (только Owner) с отключением всех участников | Must |

### Присутствие

| ID | Требование | Приоритет |
|:--|:--|:--|
| FR‑27 | Онлайн-статус участников по heartbeat (каждые 20 сек) | Must |
| FR‑28 | Автоматический переход в офлайн через 30 сек без heartbeat | Must |

---

## 6. Сервисы системы

### Nginx (Reverse Proxy / Ingress)

Единая точка входа. Маршрутизирует запросы к нужному сервису.

| Функция | Реализация |
|:--|:--|
| Маршрутизация API | `/api/guilds/*`, `/api/invites/*` → guild-service; `/api/channels/*`, `/api/messages/*` → messaging-service; `/api/voice/*` → voice-service |
| WebSocket proxy | `/ws/*` → websocket-gateway (rewrite `/ws` → `/hubs`, заголовки `Upgrade`, `Connection`) |
| Swagger UI | `/swagger` → статический HTML с CDN; `/swagger/{service}/` → проксирует в сервис |
| Rate Limiting | `limit_req_zone` — 100 RPS/IP для API, 20 RPS/IP для auth |
| Correlation ID | `proxy_set_header X-Request-Id $request_id` |
| Internal API | `/internal/*` — `deny all` (доступно только внутри Docker/k8s сети) |
| TLS | Терминация HTTPS (в k8s — на Ingress) |

> `/api/` префикс стрипается перед проксированием. Например, `GET /api/guilds` → guild-service получает `GET /guilds`.

---

### Zitadel (Identity Provider)

Полностью берет на себя аутентификацию. Конфигурация создается автоматически при `docker compose up` через `zitadel-bootstrap`.

| Что делает Zitadel | Как |
|:--|:--|
| Регистрация | Встроенная UI-форма |
| Логин | OIDC Authorization Code Flow + PKCE |
| JWT выдача | Access token с claims: sub, email, name, preferred_username |
| Refresh tokens | offline_access scope |
| User management | Zitadel Console: `http://localhost:8080/ui/console` |
| Swagger OAuth2 | OIDC app "NexTalk Swagger UI", redirect: `/swagger/oauth2-redirect.html` |
| Web SPA | OIDC app "NexTalk SPA", redirect: `/callback` |

OIDC discovery: `http://localhost:8080/.well-known/openid-configuration`  


Фронтенд использует `oidc-client-ts` для OIDC-интеграции.
Бэкенд-сервисы валидируют JWT через OIDC Discovery (`.well-known/openid-configuration`).

Zitadel использует свою отдельную БД (`zitadel`) в том же экземпляре PostgreSQL.

---

### Guild Service - "Где ты общаешься?"

**Схема БД:** `guild` (guilds, channels, members, invites, bans)  

#### Публичные эндпоинты

> Все требуют `Authorization: Bearer <jwt>`. `X-User-Id` перезаписывается сервисом из JWT `sub` - передавать не нужно.

| Метод | Nginx-путь | Назначение |
|:--|:--|:--|
| `POST` | `/api/guilds` | Создать сервер |
| `GET` | `/api/guilds` | Список серверов пользователя |
| `DELETE` | `/api/guilds/{guildId}` | Удалить сервер (только Owner) |
| `POST` | `/api/guilds/{guildId}/channels` | Создать канал |
| `GET` | `/api/guilds/{guildId}/channels` | Список каналов |
| `DELETE` | `/api/guilds/{guildId}/channels/{channelId}` | Удалить канал (Owner/Admin) |
| `POST` | `/api/guilds/{guildId}/invites` | Создать инвайт |
| `POST` | `/api/invites/{code}/accept` | Принять инвайт |
| `GET` | `/api/guilds/{guildId}/members` | Список участников |
| `PUT` | `/api/guilds/{guildId}/members/{userId}/role` | Назначить роль |
| `DELETE` | `/api/guilds/{guildId}/members/{userId}` | Кик участника |
| `POST` | `/api/guilds/{guildId}/members/{userId}/ban` | Бан участника |

#### Internal эндпоинты

> Вызываются напрямую к `guild-service:5001` из других сервисов. JWT не требуется. Обязательные заголовки: `X-Correlation-Id`, `X-Deadline`.

| Метод | Путь | Назначение |
|:--|:--|:--|
| `GET` | `/internal/guilds/{guildId}/access` | Проверить права. Query: `userId`, `requiredRole`. Response: `{ hasAccess, role }` |
| `GET` | `/internal/guilds/{guildId}/members` | Список участников гильдии |
| `GET` | `/internal/users/{userId}/guilds` | Список серверов пользователя (для presence) |

#### Возможные ошибки

| Код | Причина |
|:--|:--|
| `400` | Неверный формат тела запроса или невалидное значение роли |
| `401` | Отсутствует или невалиден JWT |
| `403` | Недостаточно прав (например, не Owner) |
| `404` | Гильдия, канал или участник не найден |
| `429` | Превышен rate limit |
| `503` | PostgreSQL недоступен |

---

### Messaging Service - "Что ты пишешь?"

**Схема БД:** `messaging` (messages, outbox_events, idempotency_keys)  


#### Публичные эндпоинты

| Метод | Nginx-путь | Назначение |
|:--|:--|:--|
| `GET` | `/api/channels/{channelId}/messages` | История сообщений (cursor-based, limit 50) |
| `DELETE` | `/api/messages/{id}` | Удалить сообщение (автор / Admin / Owner) |

#### Internal эндпоинты

| Метод | Путь | Назначение |
|:--|:--|:--|
| `POST` | `/internal/messages` | Создать сообщение (вызывается WS Gateway). Требует `X-Idempotency-Key` |

> **Важно:** публичного REST-эндпоинта для отправки сообщений нет. Клиент отправляет через SignalR (`SendMessage`), WS Gateway вызывает `/internal/messages`, Messaging Service сохраняет и через Outbox рассылает обратно в WS Gateway для broadcast.

Outbox Pattern: в одной транзакции `INSERT message + INSERT outbox_event`. OutboxWorker (BackgroundService) → System.Threading.Channels → BroadcastConsumer → `POST /internal/broadcast/guild/{guildId}` в WS Gateway.

---

### Voice Service - "Что ты говоришь?"

#### Публичные эндпоинты

| Метод | Nginx-путь | Назначение |
|:--|:--|:--|
| `POST` | `/api/voice/{channelId}/join` | Войти в голосовой канал, получить LiveKit-токен |
| `POST` | `/api/voice/{channelId}/leave` | Выйти из голосового канала |

#### Internal эндпоинты

| Метод | Путь | Назначение |
|:--|:--|:--|
| `DELETE` | `/internal/voice/{userId}/disconnect` | Принудительное отключение пользователя (при бане) |
| `DELETE` | `/internal/voice/channel/{channelId}/disconnect-all` | Отключить всех из комнаты (при удалении канала) |

Генерирует JWT для LiveKit. Управляет комнатами через LiveKit Server API. In-memory SessionStore (ConcurrentDictionary). Нет собственной схемы БД.

---

### WebSocket Gateway (SignalR)

**Nginx:** `/ws/*` → rewrite → `/hubs/*` на сервисе

#### Подключение

| Тип | Nginx-путь | Назначение |
|:--|:--|:--|
| WebSocket | `/ws/chat` | SignalR Hub для real-time событий |

> Auth: токен передаётся query-параметром `?access_token=<jwt>` — браузер не поддерживает кастомные заголовки при WS-handshake.

#### SignalR Hub — методы клиент → сервер

| Метод | Параметры | Назначение |
|:--|:--|:--|
| `SendMessage` | `channelId, content, idempotencyKey` | Отправить сообщение → POST `/internal/messages` в Messaging Service |
| `Heartbeat` | — | Обновить presence. Вызывается каждые 20 сек |

#### SignalR Hub — события сервер → клиент

| Событие | Payload | Источник |
|:--|:--|:--|
| `ReceiveMessage` | `{ messageId, channelId, authorId, content, createdAt }` | Новое сообщение (из Outbox) |
| `MessageDeleted` | `{ messageId, channelId }` | Сообщение удалено |
| `MemberJoined` | `{ guildId, userId, username, displayName, role }` | Пользователь принял инвайт |
| `MemberLeft` | `{ guildId, userId }` | Участник кикнут |
| `MemberBanned` | `{ guildId, userId }` | Участник забанен |
| `RoleUpdated` | `{ guildId, userId, role }` | Роль изменена |
| `ChannelCreated` | `{ guildId, channelId, name, type }` | Создан канал |
| `ChannelDeleted` | `{ guildId, channelId }` | Канал удалён |
| `GuildDeleted` | `{ guildId }` | Сервер удалён |
| `UserOnline` | `{ guildId, userId }` | Участник онлайн (получен Heartbeat) |
| `UserOffline` | `{ guildId, userId }` | Участник офлайн (30 сек без Heartbeat) |
| `VoiceJoined` | `{ channelId, userId }` | Вошёл в голосовой канал |
| `VoiceLeft` | `{ channelId, userId }` | Вышел из голосового канала |

#### Internal эндпоинты

| Метод | Путь | Назначение |
|:--|:--|:--|
| `POST` | `/internal/broadcast/guild/{guildId}` | Broadcast события клиентам гильдии. Body: `{ eventType, payload }` |
| `POST` | `/internal/disconnect/guild/{guildId}/user/{userId}` | Принудительное отключение пользователя (при бане) |

In-memory: `ConcurrentDictionary` для presence (`userId → lastSeen`), ConnectionManager (`userId → connectionId`).

---

## 7. Межсервисное взаимодействие

### Протоколы

| Связь | Протокол | Паттерн |
|:--|:--|:--|
| Browser → Nginx | HTTPS | Reverse proxy |
| Browser → WS Gateway (через Nginx) | WSS (SignalR) | Bidirectional |
| Browser → LiveKit | WebRTC | Peer-to-SFU |
| Browser → Zitadel (через Nginx) | HTTPS | OIDC redirect |
| Nginx → Services | HTTP | Proxy |
| WS Gateway → Messaging | HTTP | Retry + Circuit Breaker |
| WS Gateway → Guild | HTTP | Retry + Circuit Breaker |
| Messaging → Guild | HTTP | Circuit Breaker + Deadline |
| Messaging → WS Gateway | HTTP | Outbox → broadcast |
| Voice → Guild | HTTP | Circuit Breaker + Deadline |
| Voice → LiveKit | HTTP | Timeout |
| Guild → WS Gateway | HTTP | Broadcast (вступление/кик/бан/роль/канал/удаление) |
| Guild → Voice | HTTP | Disconnect (кик/бан/удаление) |
| Voice → WS Gateway | HTTP | Broadcast (voice.joined, voice.left) |

### Internal API

Эндпоинты `/internal/*`:
- Не проксируются через Nginx
- Доступны только из внутренней Docker/k8s сети
- Не требуют JWT (доверие на уровне сети)
- Обязательно передают `X-Correlation-Id`
- Принимают `X-Deadline` для propagation таймаутов

### Как проверяются права

```
WS Gateway: пользователь хочет отправить сообщение в channel X (guild G)
    │
    ├──→ Guild Service: GET /internal/guilds/{G}/access?userId=123&requiredRole=Member
    │    Guild Service: SELECT FROM members WHERE user_id=123 AND guild_id=G
    │    Guild Service: role == 'Member' → hasAccess: true
    │    └──→ WS Gateway: { hasAccess: true, role: "Member" }
    │
    └──→ Messaging Service: POST /internal/messages
         Messaging Service: INSERT message + outbox_event
         └──→ WS Gateway: 201 Created
```

---

## 8. Отказоустойчивость

### 8.1 Health Checks

Каждый .NET сервис: два эндпоинта (ASP.NET `HealthChecks`):
- `GET /healthz` - liveness probe (всегда 200, не проверяет зависимости)
- `GET /readyz` - readiness probe (проверяет зависимости: Guild - PostgreSQL + Redis; Messaging - PostgreSQL; Voice и WS Gateway - пустой, всегда Healthy)

Формат ответа readyz: `{"status": "Healthy", "checks": {"postgresql": "Healthy"}}`

- docker-compose: `healthcheck: test: curl -f /readyz` + `depends_on: condition: service_healthy`
- k8s: `livenessProbe → /healthz` + `readinessProbe → /readyz`

> **Nginx** имеет собственный healthcheck: `GET /health` (возвращает `{"status":"healthy"}`), он не относится к ASP.NET сервисам.

### 8.2 Retry + Exponential Backoff + Jitter

Polly Retry Policy на `IHttpClientFactory`:
- 3 попытки, задержки ~200ms → ~400ms → ~800ms
- Jitter ±25% (предотвращение thundering herd)
- Timeout per attempt: 2 секунды
- Только для safe-to-retry: GET или POST с Idempotency Key

### 8.3 Idempotency Key

Для POST-операций (отправка сообщения):
- Фронтенд генерирует UUID → заголовок `X-Idempotency-Key`
- Messaging Service проверяет `idempotency_keys` таблицу
- Дубль → кэшированный ответ (200 вместо 201)
- TTL: 24ч, cleanup через BackgroundService

### 8.4 Deadlines

- Заголовок `X-Deadline`: UTC timestamp
- Middleware: если deadline прошел → 504
- `CancellationTokenSource` привязан к deadline
- Default: 5 сек на всю цепочку

### 8.5 Rate Limiting

Два уровня:
1. **Nginx:** `limit_req` - 100 RPS на IP (грубая защита)
2. **Сервисы:** ASP.NET `AddRateLimiter()` - per-user по JWT claim `sub` (точная защита)

При превышении: HTTP 429 + `Retry-After: 1`.

### 8.6 Circuit Breaker

Polly Circuit Breaker на каждом `HttpClient`:
- Порог: 5 ошибок за 30 сек → circuit open
- Open state: 15 сек (немедленный 503, без сетевого вызова)
- Half-open: 1 тестовый запрос → при успехе → closed

### 8.7 Graceful Degradation

| Сценарий | Поведение |
|:--|:--|
| PostgreSQL down | Сервис → 503 `{"error": "Storage unavailable", "retryAfter": 5}` |
| Guild Service down | WS Gateway → Circuit Breaker → сообщение клиенту "Сервис недоступен" |
| Messaging Service down | Сообщение не отправляется, клиент видит ошибку + кнопку retry |
| WS Gateway down | Фронтенд → banner "Соединение потеряно. Обновите страницу" |

### 8.8 Outbox Pattern

1. Messaging Service: INSERT message + outbox_event **в одной PG-транзакции**
2. OutboxWorker (BackgroundService): poll каждые 100 мс
3. Публикация в `System.Threading.Channels<OutboxEvent>`
4. BroadcastConsumer → POST `/internal/broadcast` в WS Gateway
5. При успехе → `processed = true`
6. При ошибке → retry (exponential backoff, max 5 попыток)

---

## 9. Нефункциональные требования (NFR)

### Оценка нагрузки (Capacity Estimation)

Оценка выполнена для MVP: single-instance deployment на k3s.

| Параметр | Оценка | Обоснование |
|:--|:--|:--|
| Гильдии | ~50 | Типичная тестовая нагрузка MVP |
| Участников в гильдии | ~200 | Средний размер Discord-сервера |
| Одновременно онлайн | ~5% от участников = **~300 concurrent WS** | Реальный пик активности |
| Пиковый поток сообщений | ~60 msg/сек | 300 активных пользователей × ~0.2 msg/сек |
| Fan-out одного сообщения | до 300 WS-соединений | Broadcast по всем онлайн-участникам канала |
| Входящий RPS на Nginx | ~100–150 RPS | REST + WS upgrade-запросы |

> Из этих цифр выведены целевые значения в NFR ниже - прежде всего NFR‑20 (200–300 concurrent) и NFR‑15 (100 RPS rate limit).

### Производительность

| ID | Характеристика | Целевое значение | Как достигается |
|:--|:--|:--|:--|
| NFR‑1 | Латентность REST API | p95 < 150 мс, p99 < 400 мс | Nginx → Service → PostgreSQL; индексы на всех lookup-полях; метрика `http_request_duration_seconds` в Prometheus |
| NFR‑2 | Подтверждение отправки (ACK) | p95 < 200 мс | WS Gateway → Guild (проверка доступа) → Messaging (INSERT) - полностью синхронный путь |
| NFR‑3 | Доставка сообщения получателям | p95 < 500 мс от отправки до `ReceiveMessage` | OutboxWorker: poll каждые 100 мс → HTTP-вызов в WS Gateway → SignalR broadcast |
| NFR‑4 | Задержка голоса (end-to-end) | медиана < 100 мс, p95 < 200 мс | LiveKit SFU + встроенный TURN; SRTP/DTLS; LiveKit built-in metrics |
| NFR‑5 | Загрузка истории сообщений | p95 < 150 мс | Cursor-based SELECT с индексом `(channel_id, id DESC)`, LIMIT 50 |

### Надежность и доступность

| ID | Характеристика | Целевое значение | Как достигается |
|:--|:--|:--|:--|
| NFR‑6 | Доступность | 99% uptime (≈ 7 ч/мес простоя) | k8s liveness/readiness probes; автоматический перезапуск подов; Grafana - метрика `up` |
| NFR‑7 | Время восстановления (RTO) | < 45 с | Pod restart 15–30 с + CB half-open 15 с; k8s `restartPolicy: Always` |
| NFR‑8 | Гарантия доставки сообщений | At-least-once | Outbox Pattern: INSERT message + outbox_event в одной транзакции; retry до 5 раз с backoff |
| NFR‑9 | Идемпотентность | Повторный запрос с тем же ключом не создает дубль | Таблица `idempotency_keys` с TTL 24 ч; проверка перед INSERT |
| NFR‑10 | Circuit Breaker | OPEN после 5 ошибок за 30 с; HALF-OPEN через 15 с | Polly: `HandledEventsAllowedBeforeBreaking=5`, `DurationOfBreak=15s` |

### Безопасность

| ID | Характеристика | Целевое значение | Как достигается |
|:--|:--|:--|:--|
| NFR‑11 | Шифрование трафика | TLS 1.2+ на всех внешних соединениях; DTLS + SRTP для WebRTC | Nginx: `ssl_protocols TLSv1.2 TLSv1.3`; LiveKit использует DTLS/SRTP по умолчанию |
| NFR‑12 | Аутентификация | Каждый запрос к `/api/*` требует валидный JWT | `AddJwtBearer` на каждом сервисе; OIDC discovery → Zitadel; подпись проверяется локально |
| NFR‑13 | Изоляция internal API | `/internal/*` недоступны снаружи кластера | Nginx не проксирует `/internal/*`; в k8s - ClusterIP без Ingress-правил |
| NFR‑14 | Секреты | Нет plaintext-секретов в коде и Docker-образах | Docker Secrets (Compose) / k8s Secrets; передача через переменные окружения |
| NFR‑15 | Rate Limiting | 100 RPS / IP | Nginx `limit_req_zone`; ASP.NET `AddRateLimiter` (fixed window, per-user) |

### Наблюдаемость

| ID | Характеристика | Целевое значение | Как достигается |
|:--|:--|:--|:--|
| NFR‑16 | Трассировка запросов | Каждый запрос имеет `X-Correlation-Id` в логах всех сервисов | Nginx генерирует `$request_id`; сервисы читают заголовок и пишут в Serilog JSON |
| NFR‑17 | Метрики | Каждый .NET-сервис экспортирует `/metrics` | `prometheus-net.AspNetCore`: RPS, latency histogram, error rate, DB pool size |
| NFR‑18 | Дашборды | Grafana: latency p95/p99, error rate, CB state, pod restarts | Prometheus scrape interval 15 с → Grafana dashboard |
| NFR‑19 | Логи | Структурированный JSON; уровень Warning+ в production | Serilog `WriteTo.Console(formatter: JsonFormatter)` |

### Масштабируемость и ограничения MVP

| ID | Характеристика | Целевое значение | Примечание |
|:--|:--|:--|:--|
| NFR‑20 | Одновременные пользователи | 200–300 concurrent WebSocket-соединений | Single instance per service на k3s; ограничение - ресурсы узла, а не Kestrel |
| NFR‑21 | Горизонтальная масштабируемость | Архитектурная готовность | Guild / Messaging / Voice - stateless, масштабируются без изменений; WS Gateway - stateful (in-memory presence), при scale-out потребует sticky sessions или Redis |
| NFR‑22 | Пул соединений PostgreSQL | Max 20 соединений на сервис; query timeout 5 с | Npgsql: `MaxPoolSize=20`, `CommandTimeout=5` в connection string |

---

## 10. Где хранятся данные

### PostgreSQL

Один экземпляр PostgreSQL 17 с двумя базами:

| База данных | Владелец | Что хранит |
|:--|:--|:--|
| `zitadel` | Zitadel | Пользователи, сессии, ключи, проекции (управляется Zitadel) |
| `nextalk` | Сервисы NexTalk | Бизнес-данные |

Схемы в базе `nextalk`:

| Схема | Таблицы | Сервис |
|:--|:--|:--|
| `guild` | guilds, channels, members, invites, bans | Guild Service |
| `messaging` | messages, outbox_events, idempotency_keys | Messaging Service |

> Каждый сервис подключается только к своей схеме (отдельный PG-пользователь). Нужны чужие данные → HTTP-вызов к сервису-владельцу.

### In-Memory состояние

> **Redis в проекте есть.** Guild Service использует Redis как `IDistributedCache` (distributed cache, база `defaultDatabase=1`). Messaging, Voice и WS Gateway Redis не используют - presence и rate limiting хранятся in-process.

| Данные | Где | Зачем |
|:--|:--|:--|
| Presence (кто онлайн) | WS Gateway, ConcurrentDictionary | Heartbeat TTL |
| Voice sessions | Voice Service, ConcurrentDictionary | Кто в каких каналах |
| Rate Limiting counters | Каждый сервис, in-memory | Per-user ограничение |
| Circuit Breaker state | Polly in-memory | Состояние CB |

---

## 11. Фронтенд

### Технологии

| Технология | Зачем |
|:--|:--|
| React + TypeScript | UI-фреймворк |
| Redux Toolkit | Управление состоянием |
| React Router | Маршрутизация |
| oidc-client-ts | OIDC-интеграция с Zitadel |
| @microsoft/signalr | WebSocket-клиент |
| livekit-client | Голосовые каналы (WebRTC) |
| axios | HTTP-запросы |

### Авторизация (OIDC Flow)

```
1. Пользователь нажимает "Войти"
2. React SPA → redirect на Zitadel /oauth/v2/authorize
   (client_id, redirect_uri, response_type=code, PKCE)
3. Zitadel показывает форму логина/регистрации
4. Пользователь вводит credentials → Zitadel валидирует
5. Zitadel → redirect на /callback?code=...
6. React SPA обменивает code на tokens (POST /oauth/v2/token)
7. access_token сохраняется в памяти (Redux store)
8. Все API-запросы: Authorization: Bearer <token>
```

### Layout

```
+----------+------------------+-------------------------+-------------+
| Серверы  |  Каналы сервера  |      Чат / голос        |  Участники  |
| (иконки) |                  |                         |  онлайн     |
|          |  # общий         |  [последние 50]         |             |
|  [S1]    |  # новости       |  [cursor-подгрузка ↑]   |  🟢 Маша    |
|  [S2]    |                  |  [поле ввода]           |  ⚫ Петя    |
|          |  🔊 Голос-1      |                         |             |
|  [+]     |  🔊 Голос-2      |                         |             |
+----------+------------------+-------------------------+-------------+
```

### Упрощения

- Последние 50 сообщений + cursor-pagination вверх
- При потере WS - banner "Соединение потеряно. Обновите страницу (F5)"
- Аватары - первая буква имени, цвет по хэшу userId
- Desktop only (CSS Grid, без мобильного адаптива)
- Логин/регистрация - UI Zitadel (кастомизация цветов/лого)

---

## 12. За рамками MVP

- E2EE (Signal Protocol, Web Crypto API) - архитектура готова
- Личные сообщения (DM)
- Email-уведомления (Outbox уже есть → добавить SMTP-consumer)
- Вложения и аватары (MinIO)
- OAuth провайдеры в Zitadel (Google, GitHub)
- Redis (distributed presence, distributed rate limiting)
- gRPC (замена HTTP для inter-service)
- Service mesh (Istio/Linkerd)
- Message broker (RabbitMQ/Kafka вместо Outbox + HTTP)

---

## 13. Глоссарий

### Предметная область

| Термин | Определение |
|:--|:--|
| **Сервер / Гильдия (Guild)** | Одно и то же понятие. "Сервер" - пользовательское название: то, что человек создает и куда приглашает друзей. "Гильдия" / "Guild" - то, как эта же сущность называется в коде, БД и сервисах (`guild-service`, таблица `guilds`). Смешение терминов в документации - намеренное, оба варианта обозначают одно. |
| **Канал** | Комната внутри сервера для общения. Бывает двух типов: `text` (текстовая переписка) и `voice` (голос через WebRTC). Один сервер может содержать сколько угодно каналов. Нельзя написать "вне канала" - сообщения всегда привязаны к конкретному каналу. |
| **Участник (Member)** | Пользователь, вступивший на сервер. У каждого участника есть роль: `Owner` (создатель), `Admin` или `Member`. Роль определяет, что он может делать на сервере. |
| **Инвайт-ссылка** | Ссылка вида `/invite/{code}` для вступления на сервер. При создании можно задать срок действия и лимит использований. Без такой ссылки вступить на закрытый сервер нельзя. |
| **Presence (присутствие)** | Онлайн-статус пользователя: онлайн или офлайн. Определяется по heartbeat-сигналу. Хранится в памяти WS Gateway - при перезапуске сервиса все статусы сбрасываются (приемлемо для MVP). |
| **Heartbeat** | Периодический сигнал "я жив", который браузер отправляет серверу каждые 20 секунд через открытое WebSocket-соединение. Если сигнал не приходил 30 секунд - пользователь считается офлайн и остальные получают уведомление. |
| **Silent Refresh** | Автоматическое обновление JWT access token до истечения его срока действия. Происходит незаметно: браузер открывает скрытый `<iframe>` на страницу Zitadel, получает новый токен через уже существующую сессию и подменяет старый. Без этого пользователю пришлось бы логиниться повторно каждые ~час. |
| **Кик** | Исключение участника с сервера с немедленным отключением от чата и голоса. Может вернуться по новому инвайту. |
| **Бан** | Исключение + запрет на повторное вступление. В отличие от кика, запись о бане остается в таблице `bans` - при попытке принять инвайт система отклонит запрос. |

### Технические термины

| Термин | Определение |
|:--|:--|
| **TLS** | Шифрование "в дороге". Защищает данные при передаче между браузером и сервером (значок замка в адресной строке). Но на сервере данные расшифровываются - сервер их видит. В MVP сообщения хранятся и передаются как есть, защищены только TLS. |
| **E2EE** | End-to-End Encryption - шифрование "от конца до конца". Данные шифруются на устройстве отправителя и расшифровываются только на устройстве получателя. Сервер посередине не может их прочитать - у него нет ключа. В NexTalk архитектура готова к внедрению E2EE, но в MVP не реализовано. |
| **JWT** | JSON Web Token - токен авторизации. После логина Zitadel выдает подписанный "пропуск", который браузер прикладывает к каждому запросу в заголовке `Authorization: Bearer ...`. Бэкенд-сервисы проверяют подпись без повторного обращения к Zitadel. Внутри - claims: `sub` (userId), `email`, `name`, `preferred_username`. |
| **OIDC** | OpenID Connect - протокол аутентификации поверх OAuth 2.0. Вместо того чтобы принимать пароли самому, NexTalk перенаправляет пользователя на форму Zitadel, а после успешного логина получает JWT. NexTalk вообще не видит пароль пользователя. |
| **PKCE** | Proof Key for Code Exchange - защита OIDC для браузерных приложений. SPA не может хранить секрет (любой может открыть DevTools и найти его), поэтому PKCE заменяет секрет одноразовой парой code_challenge / code_verifier, которая генерируется в браузере при каждом логине. |
| **Zitadel** | Open-source Identity Provider (аналог Keycloak). Полностью берет на себя регистрацию, логин, управление пользователями и выдачу JWT. NexTalk не хранит пароли и не знает, как пользователь аутентифицирован. |
| **IdP** | Identity Provider - сервис, отвечающий за аутентификацию пользователей. В NexTalk роль IdP выполняет Zitadel. |
| **SPA** | Single Page Application - веб-приложение, которое загружается один раз и дальше работает без перезагрузки страницы. Весь React-код запускается в браузере; сервер отдает только данные (JSON), не HTML. |
| **WebSocket** | Протокол постоянного двустороннего соединения. В отличие от HTTP (запрос → ответ → соединение закрыто), WebSocket держит канал открытым: сервер может отправить данные клиенту в любой момент без запроса. Используется для чата в реальном времени и онлайн-статусов. |
| **SignalR** | ASP.NET-библиотека поверх WebSocket. Добавляет именованные методы (Hub), автоматическое переподключение и fallback-транспорты. Используется в WS Gateway. |
| **WebRTC** | Браузерная технология для передачи аудио и видео в реальном времени. Трафик идет по зашифрованному протоколу SRTP - сервер его не декодирует, только пересылает. |
| **SFU** | Selective Forwarding Unit - тип медиасервера. Каждый участник отправляет один поток на SFU, SFU пересылает его остальным. Ключевое: **не декодирует** потоки - пересылает зашифрованные пакеты как есть, что экономит ресурсы. В NexTalk роль SFU выполняет LiveKit. |
| **LiveKit** | Open-source SFU-медиасервер на Go. Управляет голосовыми комнатами, выдает JWT-токены для участников, имеет встроенный TURN-сервер. Voice Service взаимодействует с ним через HTTP API. |
| **TURN / STUN** | Вспомогательные протоколы для WebRTC. **STUN** помогает браузеру узнать свой внешний IP за NAT. **TURN** ретранслирует трафик через сервер-посредник, когда прямое соединение невозможно (строгий NAT, корпоративный firewall). В NexTalk TURN встроен в LiveKit. |
| **Reverse Proxy** | Посредник между клиентом и внутренними сервисами. Nginx принимает все входящие запросы и перенаправляет к нужному сервису по URL-правилам. Клиент видит только один адрес - адрес Nginx. |
| **Nginx Ingress** | Kubernetes-контроллер на базе Nginx, который маршрутизирует HTTP-трафик к подам. В docker-compose - просто контейнер с Nginx; в k8s - специальный ресурс Ingress + контроллер. |
| **Outbox Pattern** | Паттерн надежной отправки событий. Если сначала записать данные в БД, а потом отправить событие - между шагами может произойти сбой, и событие потеряется. Решение: записывать данные и событие в **одной транзакции** в таблицу `outbox_events`. Фоновый воркер читает таблицу и доставляет. Гарантия: если данные записались - событие отправится. |
| **at-least-once** | Гарантия доставки: сообщение дойдет **хотя бы один раз**, но при сбоях возможен дубль. Это нормально, если получатель умеет игнорировать дубли - для этого Idempotency Key. |
| **Idempotency Key** | UUID, который клиент генерирует один раз и отправляет в заголовке `X-Idempotency-Key`. Сервер сохраняет ключ вместе с ответом. Если тот же запрос придет повторно (retry) - вернет уже сохраненный ответ вместо повторного выполнения. Так сообщение не отправится дважды. |
| **Circuit Breaker** | Паттерн отказоустойчивости. Если downstream-сервис начинает часто давать ошибки - Circuit Breaker "размыкает цепь": следующие несколько секунд запросы к нему мгновенно отклоняются, не тратя время на ожидание. Через время - одна тестовая попытка: если успешна, работа возобновляется. |
| **Polly** | .NET-библиотека для политик отказоустойчивости: Retry, Circuit Breaker, Timeout. Используется во всех межсервисных HTTP-вызовах. |
| **Deadline** | Абсолютное время (UTC timestamp), до которого цепочка запросов должна успеть выполниться. Передается заголовком `X-Deadline` от сервиса к сервису. Если время вышло - сервис возвращает 504. Отличие от таймаута: таймаут отсчитывается каждый раз заново, дедлайн - единый для всей цепочки. |
| **Correlation ID** | UUID, который генерируется при входящем запросе и передается через все сервисы в заголовке `X-Correlation-Id`. Позволяет найти все записи, относящиеся к одному запросу, даже если они разбросаны по четырем сервисам. |
| **RBAC** | Role-Based Access Control - управление доступом через роли. Пользователю назначается роль (`Owner`, `Admin`, `Member`), роль определяет, что он может делать. В NexTalk три роли с фиксированными правами: Owner > Admin > Member. |
| **Cursor Pagination** | Загрузка данных порциями: "покажи 50 записей после этой конкретной записи" вместо "покажи страницу 2". Работает быстро при любом объеме, в отличие от OFFSET-пагинации, которая замедляется с ростом таблицы. |
| **Graceful Degradation** | Принцип: при сбое одного компонента система продолжает работать с ограниченной функциональностью. Например, если Guild Service упал - новые сообщения не отправляются, но уже открытые чаты и голосовые каналы продолжают работать. |
| **Thundering Herd** | Проблема: после восстановления упавшего сервиса все клиенты одновременно делают retry, создавая пиковую нагрузку, которая снова роняет сервис. Решение - jitter: случайная задержка перед retry, чтобы запросы "размазались" по времени. |

