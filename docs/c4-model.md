# NexTalk - C4-модель

> YAML для импорта в [IcePanel](https://icepanel.io)

---

**Готовая C4 модель проекта ->** https://s.icepanel.io/r7Jqd2EfeDO3JL/jcOE

---

## Навигация

| Что вам нужно сделать | Идите сюда |
|:--|:--|
| Посмотреть готовую интерактивную C4 модель | [[NexTalk] IcePanel](https://s.icepanel.io/r7Jqd2EfeDO3JL/jcOE) |
| Быстро понять, из чего состоит система | [C4 Level 1 - System Context](#c4-level-1---system-context) |
| Увидеть все контейнеры и их роли | [C4 Level 2 - Container Diagram](#c4-level-2---container-diagram) |
| Найти конкретный компонент сервиса | [C4 Level 3 - Components](#c4-level-3---components) |
| Импортировать модель в IcePanel | [YAML для импорта](#yaml-для-импорта-в-icepanel) |
| Понять конкретный пользовательский сценарий | [Flows](#flows) |
| Найти flow по теме (аутентификация, голос, модерация...) | [Индекс flows](#индекс-flows) |
| Проверить, как работает отказоустойчивость | [Flow 8 - Circuit Breaker](#flow-8-демонстрация-circuit-breaker), [Flow 9 - Idempotency](#flow-9-демонстрация-idempotency-key), [Flow 16 - Deadline](#flow-16-демонстрация-deadline-504) |
| Вернуться к общей документации проекта | [README.md](../README.md) |

---

## Индекс flows

| Flow | Тема | FR |
|:--|:--|:--|
| [Flow 1](#flow-1-регистрация-и-логин-oidc) | Регистрация и логин (OIDC) | FR-1, FR-2 |
| [Flow 2](#flow-2-создание-сервера) | Создание сервера | FR-5 |
| [Flow 3](#flow-3-отправка-сообщения) | Отправка сообщения | FR-15, FR-18, FR-19 |
| [Flow 4](#flow-4-подключение-к-голосовому-каналу) | Подключение к голосовому каналу | FR-21 |
| [Flow 5](#flow-5-вступление-по-инвайту) | Вступление по инвайту | FR-12 |
| [Flow 6](#flow-6-kickбан) | Кик/Бан | FR-25, FR-26 |
| [Flow 7](#flow-7-heartbeat-и-presence) | Heartbeat и Presence | FR-27, FR-28 |
| [Flow 8](#flow-8-демонстрация-circuit-breaker) | ⚡ Демонстрация Circuit Breaker | - |
| [Flow 9](#flow-9-демонстрация-idempotency-key) | ⚡ Демонстрация Idempotency Key | FR-20 |
| [Flow 10](#flow-10-отключение-от-голосового-канала) | Отключение от голосового канала | FR-22 |
| [Flow 11](#flow-11-загрузка-истории-сообщений) | Загрузка истории сообщений | FR-16 |
| [Flow 12](#flow-12-генерация-инвайт-ссылки) | Генерация инвайт-ссылки | FR-11 |
| [Flow 13](#flow-13-назначение-роли-участнику) | Назначение роли участнику | FR-13 |
| [Flow 14](#flow-14-удаление-сообщения) | Удаление сообщения | FR-17 |
| [Flow 15](#flow-15-silent-refresh-автоматическое-обновление-токена) | Silent Refresh | FR-3 |
| [Flow 16](#flow-16-демонстрация-deadline-504) | ⚡ Демонстрация Deadline (504) | - |
| [Flow 17](#flow-17-создание-канала) | Создание канала | FR-6, FR-7 |
| [Flow 18](#flow-18-удаление-канала) | Удаление канала | FR-10 |
| [Flow 19](#flow-19-удаление-сервера) | Удаление сервера | FR-30 |

---

## Как импортировать в IcePanel

1. Зарегистрируйтесь на [app.icepanel.io](https://app.icepanel.io).
2. Создайте Organization → Landscape.
3. **Import Model** → вставьте YAML из раздела ниже.
4. Расположите объекты на диаграмме и создайте Flows.

---

## Структура модели

### C4 Level 1 - System Context

| Тип | Объект | Описание |
|:--|:--|:--|
| Actor | Пользователь | Общается через браузер: текст, голос |
| Actor | Админ платформы | Мониторинг через Grafana |
| System | **NexTalk** | Платформа командного общения (микросервисы) |

### C4 Level 2 - Container Diagram

| Тип | Контейнер | Технология | Описание |
|:--|:--|:--|:--|
| App | React SPA | React, TypeScript | UI, OIDC-клиент, SignalR, LiveKit |
| App | Nginx | Nginx / Ingress Controller | Reverse proxy, rate limiting, routing |
| App | WebSocket Gateway | ASP.NET + SignalR | WS-соединения, broadcast, presence |
| App | Guild Service | ASP.NET | Серверы, каналы, роли, инвайты, модерация |
| App | Messaging Service | ASP.NET | Сообщения, Outbox Pattern, идемпотентность |
| App | Voice Service | ASP.NET | Голосовые сессии, LiveKit-токены |
| App | Zitadel | Go | IdP: OIDC, регистрация, логин, JWT |
| Store | PostgreSQL | PostgreSQL 17 | БД nextalk (guild, messaging) + БД zitadel |
| Store | Redis | Redis 8 | Состояние комнат и участников LiveKit |
| App | LiveKit | Go | SFU + встроенный TURN |
| App | Prometheus | Prometheus | Сбор метрик /metrics |
| App | Grafana | Grafana | Дашборды |

### C4 Level 3 - Components

#### Nginx

| Компонент | Описание |
|:--|:--|
| Reverse Proxy | Маршрутизация по location → upstream сервисы |
| Rate Limiter | limit_req_zone: 100 RPS на IP |
| WebSocket Proxy | proxy_pass с Upgrade для SignalR |
| Correlation ID | proxy_set_header X-Request-Id $request_id |

#### WebSocket Gateway

| Компонент | Описание |
|:--|:--|
| ChatHub (SignalR) | SendMessage, ReceiveMessage, Heartbeat |
| ConnectionManager | userId ↔ connectionId маппинг |
| PresenceTracker | In-memory ConcurrentDictionary, heartbeat TTL |
| MessagingHttpClient | HTTP → Messaging Service (Polly: Retry + CB) |
| GuildHttpClient | HTTP → Guild Service (Polly: Retry + CB) |
| BroadcastController | POST /internal/broadcast (от Outbox Worker, Guild Service, Voice Service) |
| DisconnectController | POST /internal/disconnect/{userId} - принудительное отключение |

#### Guild Service

| Компонент | Описание |
|:--|:--|
| GuildController | CRUD серверов |
| ChannelController | CRUD каналов |
| InviteController | Создание и принятие инвайтов |
| MemberController | Список, кик, бан, назначение ролей |
| InternalAccessController | GET /internal/channels/{id}/check-access |
| InternalUserController | GET /internal/users/{userId}/guilds |
| InternalMembersController | GET /internal/guilds/{id}/members |
| RbacService | Проверка прав (3 фиксированные роли: Owner/Admin/Member) |

#### Messaging Service

| Компонент | Описание |
|:--|:--|
| InternalMessageController | POST /internal/messages (от WS Gateway) |
| MessageController | GET history, DELETE message |
| IdempotencyMiddleware | Проверка X-Idempotency-Key |
| OutboxWriter | INSERT outbox_event в транзакции с message |
| OutboxWorker | BackgroundService: poll → Channel → broadcast |
| BroadcastConsumer | POST /internal/broadcast в WS Gateway |

#### Voice Service

| Компонент | Описание |
|:--|:--|
| VoiceController | POST join, POST leave |
| InternalVoiceController | DELETE /internal/voice/{userId}/disconnect |
| LiveKitTokenGenerator | Генерация JWT для LiveKit |
| LiveKitRoomClient | HTTP API: создание/удаление комнат |
| SessionStore | In-memory: userId → channelId |

---

## YAML для импорта в IcePanel

```yaml
# yaml-language-server: $schema=https://api.icepanel.io/v1/schemas/LandscapeImportData
namespace: nextalk
tagGroups:
- id: tg-layer
  name: Layer
  icon: globe
- id: tg-tech
  name: Technology
  icon: microchip
tags:
- id: tag-frontend
  groupId: tg-layer
  name: Frontend
  color: green
- id: tag-gateway
  groupId: tg-layer
  name: Gateway
  color: pink
- id: tag-service
  groupId: tg-layer
  name: Service
  color: blue
- id: tag-storage
  groupId: tg-layer
  name: Storage
  color: orange
- id: tag-media
  groupId: tg-layer
  name: Media
  color: purple
- id: tag-idp
  groupId: tg-layer
  name: Identity Provider
  color: yellow
- id: tag-observability
  groupId: tg-layer
  name: Observability
  color: grey
- id: tag-dotnet
  groupId: tg-tech
  name: ASP.NET
  color: blue
- id: tag-react
  groupId: tg-tech
  name: React
  color: green
- id: tag-go
  groupId: tg-tech
  name: Go
  color: blue
- id: tag-postgres
  groupId: tg-tech
  name: PostgreSQL
  color: orange
- id: tag-nginx
  groupId: tg-tech
  name: Nginx
  color: pink

modelObjects:

# --- Domain ---
- id: domain-nextalk
  name: NexTalk
  type: domain
  description: Платформа командного общения (микросервисы + k8s)

# --- Actors ---
- id: actor-user
  name: Пользователь
  type: actor
  parentId: domain-nextalk
  description: Общается через браузер - текст и голос
  caption: Браузер

- id: actor-admin
  name: Админ платформы
  type: actor
  parentId: domain-nextalk
  description: Мониторинг через Grafana
  caption: Технический специалист

# --- System ---
- id: system-nextalk
  name: NexTalk Platform
  type: system
  parentId: domain-nextalk
  description: Микросервисная платформа с Zitadel (IdP), Nginx, Kubernetes
  caption: Микросервисы + k8s

# --- Frontend ---
- id: app-spa
  name: React SPA
  type: app
  parentId: system-nextalk
  description: 'UI: OIDC-клиент (PKCE), SignalR, LiveKit-клиент. Раздаётся nginx как статика (production) или Vite dev-server (development).'
  caption: React + TypeScript + Vite
  tagIds: [tag-frontend, tag-react]

# --- Nginx ---
- id: app-nginx
  name: Nginx
  type: app
  parentId: system-nextalk
  description: 'Reverse proxy. Rate limiting (100 RPS/IP). Routing, WebSocket upgrade, Correlation ID. Раздаёт React SPA (статика). Проксирует LiveKit :7880 (WS signaling) по /livekit/ для SSL-терминации.'
  caption: Nginx / Ingress Controller
  tagIds: [tag-gateway, tag-nginx]

# --- Zitadel ---
- id: app-zitadel
  name: Zitadel
  type: app
  parentId: system-nextalk
  description: 'Identity Provider. OIDC Authorization Code + PKCE. Регистрация, логин, JWT.'
  caption: Go - OIDC IdP
  tagIds: [tag-idp, tag-go]

# --- Business Services ---
- id: app-ws-gateway
  name: WebSocket Gateway
  type: app
  parentId: system-nextalk
  description: 'SignalR Hub: broadcast, heartbeat, presence (in-memory). Polly для downstream.'
  caption: ASP.NET + SignalR
  tagIds: [tag-gateway, tag-dotnet]

- id: app-guild
  name: Guild Service
  type: app
  parentId: system-nextalk
  description: 'Серверы, каналы, RBAC (3 роли), инвайты, модерация (кик/бан).'
  caption: Серверы, каналы, права
  tagIds: [tag-service, tag-dotnet]

- id: app-messaging
  name: Messaging Service
  type: app
  parentId: system-nextalk
  description: 'Сообщения (plain text). Outbox Pattern, идемпотентность (X-Idempotency-Key).'
  caption: Сообщения + Outbox
  tagIds: [tag-service, tag-dotnet]

- id: app-voice
  name: Voice Service
  type: app
  parentId: system-nextalk
  description: 'Голосовые сессии: join/leave, генерация JWT для LiveKit, управление комнатами.'
  caption: Голос + LiveKit
  tagIds: [tag-service, tag-dotnet]

# --- Storage ---
- id: store-postgres
  name: PostgreSQL
  type: store
  parentId: system-nextalk
  description: 'Два DB: nextalk (схемы guild, messaging) и zitadel (managed by Zitadel).'
  caption: PostgreSQL 17
  tagIds: [tag-storage, tag-postgres]

- id: store-redis
  name: Redis
  type: store
  parentId: system-nextalk
  description: 'Используется LiveKit для хранения состояния комнат и участников (room registry, participant tracking).'
  caption: Redis 8
  tagIds: [tag-storage]

# --- Media ---
- id: app-livekit
  name: LiveKit
  type: app
  parentId: system-nextalk
  description: 'SFU-медиасервер со встроенным TURN. Пересылает голосовые SRTP-потоки.'
  caption: Go - SFU + TURN
  tagIds: [tag-media, tag-go]

# --- Observability ---
- id: app-prometheus
  name: Prometheus
  type: app
  parentId: system-nextalk
  description: Сбор метрик со всех .NET сервисов (/metrics).
  caption: Metrics collector
  tagIds: [tag-observability]

- id: app-grafana
  name: Grafana
  type: app
  parentId: system-nextalk
  description: Визуализация метрик. Дашборды для .NET, PostgreSQL.
  caption: Dashboards
  tagIds: [tag-observability]

# --- Components: WebSocket Gateway ---
- id: comp-ws-hub
  name: ChatHub
  type: component
  parentId: app-ws-gateway
  description: 'SignalR Hub: SendMessage, ReceiveMessage, Heartbeat'

- id: comp-ws-presence
  name: PresenceTracker
  type: component
  parentId: app-ws-gateway
  description: In-memory ConcurrentDictionary (userId → lastSeen)

- id: comp-ws-broadcast
  name: BroadcastController
  type: component
  parentId: app-ws-gateway
  description: POST /internal/broadcast - от Messaging Outbox Worker, Guild Service и Voice Service

- id: comp-ws-disconnect
  name: DisconnectController
  type: component
  parentId: app-ws-gateway
  description: POST /internal/disconnect/{userId} - принудительное отключение (при бане)

- id: comp-ws-connmgr
  name: ConnectionManager
  type: component
  parentId: app-ws-gateway
  description: userId ↔ connectionId mapping, SignalR Groups

# --- Components: Guild Service ---
- id: comp-guild-controller
  name: GuildController
  type: component
  parentId: app-guild
  description: CRUD серверов

- id: comp-guild-channel
  name: ChannelController
  type: component
  parentId: app-guild
  description: CRUD каналов (text/voice)

- id: comp-guild-invite
  name: InviteController
  type: component
  parentId: app-guild
  description: Создание и принятие инвайтов

- id: comp-guild-member
  name: MemberController
  type: component
  parentId: app-guild
  description: Список, кик, бан, назначение ролей

- id: comp-guild-rbac
  name: RbacService
  type: component
  parentId: app-guild
  description: 'Owner / Admin / Member - хардкоженные права'

- id: comp-guild-internal
  name: InternalAccessController
  type: component
  parentId: app-guild
  description: GET /internal/channels/{id}/check-access

- id: comp-guild-internal-users
  name: InternalUserController
  type: component
  parentId: app-guild
  description: GET /internal/users/{userId}/guilds

- id: comp-guild-internal-members
  name: InternalMembersController
  type: component
  parentId: app-guild
  description: GET /internal/guilds/{id}/members

# --- Components: Messaging Service ---
- id: comp-msg-internal
  name: InternalMessageController
  type: component
  parentId: app-messaging
  description: POST /internal/messages (от WS Gateway)

- id: comp-msg-controller
  name: MessageController
  type: component
  parentId: app-messaging
  description: GET history, DELETE message

- id: comp-msg-idempotency
  name: IdempotencyMiddleware
  type: component
  parentId: app-messaging
  description: Проверка X-Idempotency-Key

- id: comp-msg-outbox-writer
  name: OutboxWriter
  type: component
  parentId: app-messaging
  description: 'INSERT outbox_event в транзакции с message'

- id: comp-msg-outbox
  name: OutboxWorker
  type: component
  parentId: app-messaging
  description: 'BackgroundService: poll outbox → Channel → broadcast'

- id: comp-msg-broadcast
  name: BroadcastConsumer
  type: component
  parentId: app-messaging
  description: 'POST /internal/broadcast в WS Gateway (из OutboxWorker channel)'

# --- Components: Voice Service ---
- id: comp-voice-controller
  name: VoiceController
  type: component
  parentId: app-voice
  description: POST join/leave

- id: comp-voice-token
  name: LiveKitTokenGenerator
  type: component
  parentId: app-voice
  description: Генерация JWT для LiveKit

- id: comp-voice-room
  name: LiveKitRoomClient
  type: component
  parentId: app-voice
  description: HTTP API LiveKit - создание/удаление комнат

- id: comp-voice-internal
  name: InternalVoiceController
  type: component
  parentId: app-voice
  description: DELETE /internal/voice/{userId}/disconnect (при бане)

- id: comp-voice-internal-channel
  name: InternalVoiceChannelController
  type: component
  parentId: app-voice
  description: DELETE /internal/voice/channel/{channelId}/disconnect-all (при удалении канала/сервера)

modelConnections:

# --- User → Frontend ---
- id: conn-user-spa
  name: Использует
  originId: actor-user
  targetId: app-spa
  direction: outgoing
  description: Браузер

- id: conn-admin-grafana
  name: Мониторинг
  originId: actor-admin
  targetId: app-grafana
  direction: outgoing
  description: Grafana дашборды

# --- SPA → nginx ---
- id: conn-spa-nginx
  name: HTTPS
  originId: app-spa
  targetId: app-nginx
  direction: outgoing
  description: 'SPA получена с nginx (статика). Все REST/WS/OIDC запросы идут через nginx (same-origin — CORS не нужен).'

# --- SPA → Zitadel (через Nginx) ---
- id: conn-spa-zitadel
  name: OIDC
  originId: app-spa
  targetId: app-zitadel
  direction: outgoing
  description: 'Redirect: логин/регистрация через Zitadel UI'

# --- SPA → LiveKit ---
- id: conn-spa-livekit
  name: WebRTC
  originId: app-spa
  targetId: app-livekit
  direction: bidirectional
  description: 'WS signaling: ws://nginx/livekit/ → livekit:7880 (через nginx для SSL-терминации). UDP media (50000-50200): напрямую браузер → LiveKit, nginx UDP не проксирует.'

# --- nginx → Services ---
- id: conn-nginx-guild
  name: '/api/guilds/*, /api/invites/*'
  originId: app-nginx
  targetId: app-guild
  direction: outgoing
  description: Proxy

- id: conn-nginx-messaging
  name: '/api/channels/*/messages, /api/messages/*'
  originId: app-nginx
  targetId: app-messaging
  direction: outgoing
  description: Proxy

- id: conn-nginx-voice
  name: '/api/voice/*'
  originId: app-nginx
  targetId: app-voice
  direction: outgoing
  description: Proxy

- id: conn-nginx-wsgw
  name: '/ws (WebSocket upgrade)'
  originId: app-nginx
  targetId: app-ws-gateway
  direction: outgoing
  description: SignalR WebSocket proxy

- id: conn-nginx-zitadel
  name: '/.well-known/, /oauth/, /oidc/, /ui/ → Zitadel'
  originId: app-nginx
  targetId: app-zitadel
  direction: outgoing
  description: 'OIDC/SAML/Admin эндпоинты через grpc_pass (zitadel-api:8080). Login UI (/ui/v2/login) через proxy_pass (zitadel-login:3000).'

# --- Inter-service ---
- id: conn-wsgw-messaging
  name: HTTP (Polly)
  originId: app-ws-gateway
  targetId: app-messaging
  direction: outgoing
  description: 'POST /internal/messages (Retry + CB)'

- id: conn-wsgw-guild
  name: HTTP (Polly)
  originId: app-ws-gateway
  targetId: app-guild
  direction: outgoing
  description: 'GET /internal/channels/*/check-access + GET /internal/users/{userId}/guilds (Retry + CB)'

- id: conn-messaging-guild
  name: HTTP (Polly)
  originId: app-messaging
  targetId: app-guild
  direction: outgoing
  description: Проверка прав на отправку

- id: conn-messaging-wsgw
  name: HTTP
  originId: app-messaging
  targetId: app-ws-gateway
  direction: outgoing
  description: 'POST /internal/broadcast (Outbox для message.created; прямой вызов для message.deleted)'

- id: conn-voice-guild
  name: HTTP (Polly)
  originId: app-voice
  targetId: app-guild
  direction: outgoing
  description: Проверка прав на голос

- id: conn-voice-livekit
  name: HTTP API
  originId: app-voice
  targetId: app-livekit
  direction: outgoing
  description: Создание/удаление комнат

- id: conn-livekit-redis
  name: Redis
  originId: app-livekit
  targetId: store-redis
  direction: outgoing
  description: Хранение состояния комнат и участников (room registry, participant tracking)

- id: conn-guild-wsgw
  name: HTTP
  originId: app-guild
  targetId: app-ws-gateway
  direction: outgoing
  description: 'POST /internal/broadcast (member/channel/guild events) + POST /internal/disconnect/{userId} (при бане)'

- id: conn-guild-voice
  name: HTTP
  originId: app-guild
  targetId: app-voice
  direction: outgoing
  description: 'DELETE /internal/voice/{userId}/disconnect (при бане) + DELETE /internal/voice/channel/{channelId}/disconnect-all (при удалении канала/сервера)'

- id: conn-voice-wsgw
  name: HTTP
  originId: app-voice
  targetId: app-ws-gateway
  direction: outgoing
  description: 'POST /internal/broadcast (voice.joined, voice.left)'

# --- Services → Storage ---
- id: conn-guild-pg
  name: SQL (guild schema)
  originId: app-guild
  targetId: store-postgres
  direction: outgoing
  description: guilds, channels, members, invites, bans

- id: conn-messaging-pg
  name: SQL (messaging schema)
  originId: app-messaging
  targetId: store-postgres
  direction: outgoing
  description: messages, outbox_events, idempotency_keys

- id: conn-zitadel-pg
  name: SQL (zitadel DB)
  originId: app-zitadel
  targetId: store-postgres
  direction: outgoing
  description: Managed by Zitadel

# --- Observability ---
- id: conn-prometheus-wsgw
  name: Scrape /metrics
  originId: app-prometheus
  targetId: app-ws-gateway
  direction: outgoing
  description: /metrics

- id: conn-prometheus-guild
  name: Scrape /metrics
  originId: app-prometheus
  targetId: app-guild
  direction: outgoing
  description: /metrics

- id: conn-prometheus-messaging
  name: Scrape /metrics
  originId: app-prometheus
  targetId: app-messaging
  direction: outgoing
  description: /metrics

- id: conn-prometheus-voice
  name: Scrape /metrics
  originId: app-prometheus
  targetId: app-voice
  direction: outgoing
  description: /metrics

- id: conn-grafana-prometheus
  name: PromQL
  originId: app-grafana
  targetId: app-prometheus
  direction: outgoing
  description: Визуализация метрик
```

---

## Flows

### Flow 1: Регистрация и логин (OIDC)

```
1. Пользователь → React SPA: Нажимает "Войти"
2. React SPA: oidc-client-ts создает Authorization Request
   URL: /oauth/v2/authorize?client_id=...&redirect_uri=...
        &response_type=code&scope=openid+profile+email&code_challenge=...
3. React SPA → Nginx → Zitadel: браузер переходит на форму логина Zitadel (OIDC redirect)
4. Пользователь: Вводит email + пароль (или регистрируется) на форме Zitadel
5. Zitadel: Валидация → создание сессии
6. Zitadel → React SPA: HTTP redirect на /callback?code=AUTH_CODE
7. React SPA: oidc-client-ts обменивает code на tokens
   POST /oauth/v2/token (через Nginx → Zitadel)
   Body: grant_type=authorization_code, code, code_verifier (PKCE)
8. Zitadel → React SPA: { access_token (JWT), refresh_token, id_token }
9. React SPA → Redux store: Сохранить access_token в памяти
   Декодировать JWT → sub, email, name → currentUser
10. React SPA: Redirect на главную страницу приложения
```

### Flow 2: Создание сервера

```
1. Пользователь → React SPA: "+" → ввод названия → "Создать"
2. React SPA → Nginx: POST /api/guilds { name } + Authorization: Bearer JWT
3. Nginx: Проверяет rate limit, добавляет X-Request-Id
4. Nginx → Guild Service: Proxy POST /api/guilds
5. Guild Service: Валидация JWT (JWKS от zitadel-api:8080, загружается один раз при старте)
   Извлекает userId (sub), displayName (name), username(preferred_username) из claims
6. Guild Service → PostgreSQL (guild schema):
   BEGIN
     INSERT INTO guilds (id, name, owner_id)
     INSERT INTO members (guild_id, user_id, display_name, username, role='Owner')
     INSERT INTO channels (guild_id, name='general', type='text')
   COMMIT
7. Guild Service → Nginx: 201 Created { guild }
8. Nginx → React SPA: Сервер появляется в панели
```

### Flow 3: Отправка сообщения

```
1. Пользователь A → React SPA: Текст → "Отправить"
2. React SPA: idempotencyKey = crypto.randomUUID()
3. React SPA → Nginx → WS Gateway (SignalR):
   SendMessage(channelId, text, idempotencyKey)

4. WS Gateway → Guild Service (HTTP, Polly: Retry+CB):
   GET /internal/channels/{channelId}/check-access?userId=A
5. Guild Service → PostgreSQL: SELECT member
6. Guild Service → WS Gateway: { allowed: true, guildId }

7. WS Gateway → Messaging Service (HTTP, Polly: Retry+CB):
   POST /internal/messages
   Headers: X-Idempotency-Key, X-Correlation-Id, X-Deadline
   Body: { channelId, authorId, authorName, content }

8. Messaging Service: IdempotencyMiddleware → проверить ключ
   - Если дубль → вернуть кэшированный ответ (200)
   - Если новый → продолжить

9. Messaging Service → PostgreSQL (messaging schema):
   BEGIN
     INSERT INTO messages (id, channel_id, author_id, author_name, content, created_at)
     INSERT INTO outbox_events (event_type='message.created', payload)
     INSERT INTO idempotency_keys (key, response, expires_at)
   COMMIT

10. Messaging Service → WS Gateway: 201 Created { message }

11. [Async] Messaging Service (OutboxWorker) → PostgreSQL:
    SELECT outbox_events WHERE processed = false
12. Messaging Service (BroadcastConsumer) → WS Gateway:
    POST /internal/broadcast { type: 'message.created', payload: { message } }
    [При ошибке → exponential backoff retry, макс 5 попыток]
13. WS Gateway → React SPA (участники канала, SignalR):
    ReceiveMessage({ id, channelId, authorId, authorName, content, createdAt })
14. Messaging Service (OutboxWorker) → PostgreSQL:
    UPDATE outbox_events SET processed = true WHERE id = ...
```

### Flow 4: Подключение к голосовому каналу

```
1. Пользователь → React SPA: "Войти" в голосовом канале
2. React SPA → Nginx: POST /api/voice/{channelId}/join + JWT
3. Nginx → Voice Service: Proxy POST /api/voice/{channelId}/join

4. Voice Service → Guild Service (HTTP, Polly: CB + Deadline):
   GET /internal/channels/{channelId}/check-access?userId=X
   Headers: X-Correlation-Id, X-Deadline
5. Guild Service → PostgreSQL: SELECT member, channel WHERE channel.type = 'voice'
6. Guild Service → Voice Service: { allowed: true }

7. Voice Service → SessionStore: проверить, есть ли комната для channelId
   Если нет → Voice Service → LiveKit HTTP API: CreateRoom(name=channelId)
8. Voice Service: Генерирует LiveKit JWT:
   { room: channelId, identity: userId, canPublish: true, canSubscribe: true }
9. Voice Service → SessionStore: Добавить userId в список участников channelId
10. Voice Service → Nginx → React SPA: 200 OK { token: "<LiveKit JWT>", livekitUrl }

11. React SPA (livekit-client): room.connect(livekitUrl, token)
12. React SPA → LiveKit (WebRTC): публикация аудио-трека
13. LiveKit: пересылает SRTP-пакеты остальным участникам комнаты

14. Voice Service → WS Gateway (HTTP):
    POST /internal/broadcast { type: 'voice.joined', userId, channelId }
15. WS Gateway → React SPA (участники канала, SignalR):
    { type: 'voice.joined', userId, channelId }
```

### Flow 5: Вступление по инвайту

```
1. Приглашенный → React SPA: Открывает /invite/{code}
2. React SPA: Проверяет авторизацию (есть JWT?)
   Если нет → redirect на Zitadel для логина → callback → /invite/{code}
3. React SPA → Nginx: POST /api/invites/{code}/accept + JWT
4. Nginx → Guild Service: Proxy POST /api/invites/{code}/accept
5. Guild Service: Валидация JWT → userId, displayName (name), username (preferred_username) из claims
6. Guild Service → PostgreSQL:
   BEGIN
     SELECT invite WHERE code={code} AND expires_at > NOW() AND uses < max_uses
     INSERT INTO members (guild_id, user_id, display_name, username, role='Member')
     UPDATE invites SET uses = uses + 1
   COMMIT
7. Guild Service → Nginx → React SPA: 200 OK { guild }
8. React SPA: Сервер появляется в левой панели

9. Guild Service → WS Gateway (HTTP):
   POST /internal/broadcast { type: 'member.joined', userId, guildId }
10. WS Gateway → React SPA (онлайн-участники): Обновить список
```

### Flow 6: Кик/Бан

```
1. Admin → React SPA: ПКМ → "Забанить" → подтверждение
2. React SPA → Nginx: POST /api/guilds/{guildId}/members/{userId}/ban { reason }
3. Nginx → Guild Service: Proxy

4. Guild Service: Проверяет иерархию:
   Owner может банить Admin и Member
   Admin может банить только Member
5. Guild Service → PostgreSQL:
   BEGIN
     INSERT INTO bans (user_id, guild_id, reason, banned_by)
     DELETE FROM members WHERE user_id=X AND guild_id=Y
   COMMIT

6. Guild Service → WS Gateway (HTTP):
   POST /internal/disconnect/X { guildId: Y, reason: 'banned' }
7. WS Gateway (SignalR):
   a. → React SPA (клиент X): { type: 'banned', guildId, reason }
   b. WS Gateway: принудительно закрывает SignalR-соединение клиента X
   c. → React SPA (остальные участники гильда): { type: 'member.left', userId: X }

8. [Если X находился в голосовом канале] Guild Service → Voice Service (HTTP):
   DELETE /internal/voice/X/disconnect
9. Voice Service → LiveKit HTTP API: RemoveParticipant(identity=X)
10. Voice Service → SessionStore: Удалить X из всех комнат гильда
11. Voice Service → WS Gateway (HTTP):
    POST /internal/broadcast { type: 'voice.left', userId, channelId }
12. WS Gateway → React SPA (участники голосового канала, SignalR):
    { type: 'voice.left', userId, channelId }
```

### Flow 7: Heartbeat и Presence

```
1. React SPA → Nginx → WS Gateway (SignalR, установленное WS-соединение): Heartbeat()
2. WS Gateway → PresenceTracker:
   dictionary[userId] = DateTime.UtcNow

3. Если пользователь был offline (нет в dictionary):
   a. WS Gateway → Guild Service (HTTP, Polly: Retry+CB): GET /internal/users/{userId}/guilds
      (получить список серверов, чтобы знать кому слать уведомление)
   b. WS Gateway → React SPA (участники общих серверов, SignalR):
      { type: 'presence.online', userId }

4. PresenceMonitor (BackgroundService, каждые 10 сек):
   Сканирует dictionary → если lastSeen > 30 сек назад:
   a. WS Gateway → PresenceTracker: Удалить userId из dictionary
   b. WS Gateway → React SPA (участники общих серверов, SignalR):
      { type: 'presence.offline', userId }
```

### Flow 8: Демонстрация Circuit Breaker

```
Сценарий: Guild Service упал при отправке сообщения.

1. React SPA → Nginx → WS Gateway (SignalR): SendMessage(channelId, text)
2. WS Gateway → Guild Service: GET /internal/channels/{id}/check-access
   Попытка 1: Timeout 2с → Polly Retry (backoff ~200ms)
   Попытка 2: Connection refused → Polly Retry (backoff ~400ms)
   Попытка 3: Connection refused → Fail (ошибка накапливается)
3. Polly CB: после накопления 5 ошибок за 30 сек (не обязательно подряд - накопительно) → Circuit OPEN
4. WS Gateway → React SPA: { type: "error", message: "Сервис временно недоступен" }

5. Следующие 15 сек: любой запрос к Guild → мгновенный 503 (без сети)

6. Через 15с: Circuit HALF-OPEN
7. WS Gateway → Guild Service: 1 тестовый запрос (probe)
   Успех → Circuit CLOSED → нормальная работа
```

### Flow 9: Демонстрация Idempotency Key

```
1. React SPA: idempotencyKey = "550e8400-..."
2. React SPA → Nginx → WS Gateway (SignalR): SendMessage(channelId, text, idempotencyKey)
3. WS Gateway → Messaging: POST /internal/messages, X-Idempotency-Key: 550e8400
4. Messaging → PostgreSQL: INSERT message + outbox + idempotency_key
5. Messaging → WS Gateway: 201 Created { messageId: "abc" }
6. [Сеть обрывается до доставки ответа]
7. WS Gateway: Timeout → Polly Retry
8. WS Gateway → Messaging: POST /internal/messages, X-Idempotency-Key: 550e8400 (тот же!)
9. Messaging: SELECT FROM idempotency_keys → найден!
10. Messaging → WS Gateway: 200 OK { messageId: "abc" } (тот же, без дубля)
```

### Flow 10: Отключение от голосового канала

```
1. Пользователь → React SPA: "Покинуть" голосовой канал
2. React SPA → Nginx: POST /api/voice/{channelId}/leave + JWT
3. Nginx → Voice Service: Proxy

4. Voice Service: Декодирует JWT → userId
5. Voice Service → SessionStore: Удалить userId из комнаты channelId

6. Voice Service → LiveKit HTTP API: RemoveParticipant(room=channelId, identity=userId)
7. LiveKit: Обрывает SRTP-сессию участника

8. Voice Service → WS Gateway (HTTP):
   POST /internal/broadcast { type: 'voice.left', userId, channelId }
9. WS Gateway → React SPA (участники): Обновить список голосового канала

10. Voice Service → Nginx → React SPA: 200 OK
    React SPA: room.disconnect() - закрывает WebRTC-соединение с LiveKit
```

### Flow 11: Загрузка истории сообщений

```
1. Пользователь → React SPA: Открывает текстовый канал
2. React SPA → Nginx: GET /api/channels/{channelId}/messages?limit=50 + JWT
   (последующие подгрузки: ?cursor={lastMessageId}&limit=50)

3. Nginx: rate limit, X-Request-Id → Proxy к Messaging Service

4. Messaging Service: Валидация JWT → userId
5. Messaging Service → Guild Service (HTTP, Polly: CB + Deadline):
   GET /internal/channels/{channelId}/check-access?userId=X
   Headers: X-Correlation-Id, X-Deadline
6. Guild Service → Messaging Service: { allowed: true }

7. Messaging Service → PostgreSQL (messaging schema):
   SELECT id, channel_id, author_id, author_name, content, created_at
   FROM messages
   WHERE channel_id = {channelId}
     AND (cursor IS NULL OR id < {cursor})
   ORDER BY created_at DESC
   LIMIT 50

8. Messaging Service → Nginx → React SPA:
   200 OK { messages: [...], nextCursor: "<id>" | null }
   (nextCursor = null → достигнуто начало истории)
```

### Flow 12: Генерация инвайт-ссылки

```
1. Owner/Admin → React SPA: "Пригласить участников" → настройка TTL и лимита
2. React SPA → Nginx: POST /api/guilds/{guildId}/invites + JWT
   Body: { expiresIn: "24h", maxUses: 25 }

3. Nginx: rate limit, X-Request-Id → Proxy к Guild Service

4. Guild Service: Валидация JWT → userId
5. Guild Service → PostgreSQL: SELECT member WHERE user_id=X AND guild_id=Y
   Проверка роли: Owner или Admin → разрешено, Member → 403

6. Guild Service → PostgreSQL:
   INSERT INTO invites (code=UUID, guild_id, created_by, expires_at=NOW()+TTL, max_uses)
   code - криптографически случайный UUID (не предсказуемый)

7. Guild Service → Nginx → React SPA:
   201 Created { code: "abc123", url: "https://nextalk.app/invite/abc123",
                 expiresAt, maxUses }

8. React SPA: отображает ссылку → пользователь копирует и отправляет другу
```

### Flow 13: Назначение роли участнику

```
1. Owner → React SPA: ПКМ на участнике → "Назначить роль" → "Admin"
2. React SPA → Nginx: PUT /api/guilds/{guildId}/members/{userId}/role + JWT
   Body: { role: "Admin" }

3. Nginx → Guild Service: Proxy

4. Guild Service: Валидация JWT → callerId
5. Guild Service → PostgreSQL:
   SELECT member WHERE user_id=callerId AND guild_id=X
   Проверка: callerRole == 'Owner' → разрешено
             callerRole == 'Admin' или 'Member' → 403 Forbidden

6. Guild Service → PostgreSQL:
   UPDATE members SET role='Admin' WHERE user_id={userId} AND guild_id={guildId}

7. Guild Service → WS Gateway (HTTP):
   POST /internal/broadcast { type: 'member.roleChanged', userId, guildId, newRole: 'Admin' }
8. WS Gateway → React SPA (участники гильда, SignalR):
   { type: 'member.roleChanged', userId, newRole: 'Admin' }
   (UI обновляет роль участника в реальном времени)

9. Guild Service → Nginx → React SPA: 200 OK { userId, role: 'Admin' }
```

### Flow 14: Удаление сообщения

```
1. Пользователь → React SPA: ПКМ на сообщении → "Удалить" → подтверждение
2. React SPA → Nginx: DELETE /api/messages/{messageId} + JWT

3. Nginx → Messaging Service: Proxy DELETE /api/messages/{messageId}

4. Messaging Service: Валидация JWT → callerId
5. Messaging Service → PostgreSQL:
   SELECT message WHERE id={messageId}
   Проверяет: message.author_id == callerId → разрешено (автор)
   Если нет → Messaging Service → Guild Service (HTTP, Polly: CB + Deadline):
     GET /internal/channels/{channelId}/check-access?userId=callerId
     Guild Service: callerRole == 'Admin' или 'Owner' → разрешено
     Guild Service: callerRole == 'Member' → 403 Forbidden

6. Messaging Service → PostgreSQL:
   DELETE FROM messages WHERE id={messageId}
   (outbox_event для broadcast не нужен - сообщение удаляется, не создается)

7. Messaging Service → WS Gateway (HTTP):
   POST /internal/broadcast { type: 'message.deleted', messageId, channelId }
8. WS Gateway → React SPA (участники канала, SignalR):
   { type: 'message.deleted', messageId }
   (UI убирает сообщение из чата)

9. Messaging Service → Nginx → React SPA: 204 No Content
```

### Flow 15: Silent Refresh (автоматическое обновление токена)

```
Сценарий: access_token скоро истекает (за 60 сек до expiry).

1. React SPA (oidc-client-ts): таймер обнаружил, что access_token истекает
2. React SPA (oidc-client-ts): создает скрытый <iframe>
   src="/oauth/v2/authorize?response_type=code&prompt=none
        &client_id=...&redirect_uri=...&code_challenge=...&scope=openid+profile+email"

3. iframe → Nginx → Zitadel: запрос авторизации с prompt=none
   (prompt=none = не показывать UI, использовать существующую сессию)

4. Zitadel: сессия активна → немедленный redirect на /callback?code=NEW_CODE
   Zitadel: сессии нет → redirect с error=login_required

5. iframe → React SPA (oidc-client-ts): сообщение через postMessage с NEW_CODE

6. React SPA (oidc-client-ts) → Nginx → Zitadel:
   POST /oauth/v2/token
   Body: grant_type=authorization_code, code=NEW_CODE, code_verifier (PKCE)

7. Zitadel → React SPA: { access_token (новый JWT), refresh_token, id_token }
8. React SPA: заменяет access_token в памяти, удаляет iframe
   Все следующие API-запросы используют новый токен - пользователь ничего не замечает

Если Zitadel вернул error=login_required:
9. React SPA: redirect пользователя на Flow 1 (полный логин)
```

### Flow 16: Демонстрация Deadline (504)

```
Сценарий: Messaging Service медленно отвечает Guild Service при удалении сообщения.

1. React SPA → Nginx → Messaging Service: DELETE /api/messages/{id} + JWT
   Messaging Service: устанавливает X-Deadline = NOW() + 5 сек

2. Messaging Service → Guild Service (HTTP, Polly: CB + Deadline):
   GET /internal/channels/{channelId}/check-access?userId=X
   Headers: X-Deadline = <UTC timestamp>

3. Guild Service: DeadlineMiddleware проверяет X-Deadline
   Если дедлайн НЕ истек → обрабатывает запрос нормально

4. [Сценарий: Guild Service отвечает очень медленно (DB lock, GC pause и т.п.)]
   CancellationToken, привязанный к X-Deadline, срабатывает

5. Guild Service → Messaging Service: 504 Gateway Timeout
   (или: Messaging Service сам обрывает запрос по CancellationToken до ответа)

6. Messaging Service → Nginx → React SPA: 504 Gateway Timeout
   Body: { error: "Request timeout", retryAfter: 5 }

7. React SPA: показывает пользователю "Не удалось выполнить действие. Попробуйте снова."
   (в отличие от Circuit Breaker - это разовый сбой, не накопительный)
```

### Flow 17: Создание канала

```
1. Owner/Admin → React SPA: "+" рядом с разделом каналов → ввод названия → выбор типа → "Создать"
2. React SPA → Nginx: POST /api/guilds/{guildId}/channels + JWT
   Body: { name: "новости", type: "text" }   (или type: "voice")

3. Nginx: rate limit, X-Request-Id → Proxy к Guild Service

4. Guild Service: Валидация JWT → callerId
5. Guild Service → PostgreSQL:
   SELECT member WHERE user_id=callerId AND guild_id={guildId}
   Проверка роли: Owner или Admin → разрешено, Member → 403 Forbidden

6. Guild Service → PostgreSQL:
   INSERT INTO channels (id, guild_id, name, type)
   type = 'text' | 'voice'

7. Guild Service → WS Gateway (HTTP):
   POST /internal/broadcast { type: 'channel.created', guildId, channel: { id, name, type } }
8. WS Gateway → React SPA (участники гильда, SignalR):
   { type: 'channel.created', channel: { id, name, type } }
   (UI добавляет канал в список без перезагрузки)

9. Guild Service → Nginx → React SPA: 201 Created { id, name, type, guildId }
```

### Flow 18: Удаление канала

```
1. Owner/Admin → React SPA: ПКМ на канале → "Удалить канал" → подтверждение
2. React SPA → Nginx: DELETE /api/guilds/{guildId}/channels/{channelId} + JWT

3. Nginx → Guild Service: Proxy DELETE /api/guilds/{guildId}/channels/{channelId}

4. Guild Service: Валидация JWT → callerId
5. Guild Service → PostgreSQL:
   SELECT member WHERE user_id=callerId AND guild_id={guildId}
   Проверка роли: Owner или Admin → разрешено, Member → 403 Forbidden

6. [Если удаляется голосовой канал]
   Guild Service → Voice Service (HTTP):
   DELETE /internal/voice/channel/{channelId}/disconnect-all
   Voice Service → LiveKit HTTP API: DeleteRoom(name=channelId)
   Voice Service → SessionStore: удалить все сессии channelId

7. Guild Service → PostgreSQL:
   DELETE FROM channels WHERE id={channelId} AND guild_id={guildId}
   (сообщения канала остаются в messages - CASCADE не настроен в MVP)

8. Guild Service → WS Gateway (HTTP):
   POST /internal/broadcast { type: 'channel.deleted', guildId, channelId }
9. WS Gateway → React SPA (участники гильда, SignalR):
   { type: 'channel.deleted', channelId }
   (UI убирает канал из списка; если пользователь был в этом канале - переводит на general)

10. Guild Service → Nginx → React SPA: 204 No Content
```

### Flow 19: Удаление сервера

```
1. Owner → React SPA: Настройки → "Удалить сервер" → подтверждение (введи название сервера)
2. React SPA → Nginx: DELETE /api/guilds/{guildId} + JWT

3. Nginx → Guild Service: Proxy DELETE /api/guilds/{guildId}

4. Guild Service: Валидация JWT → callerId
5. Guild Service → PostgreSQL:
   SELECT member WHERE user_id=callerId AND guild_id={guildId}
   Проверка: callerRole == 'Owner' → разрешено, любая другая роль → 403 Forbidden

6. Guild Service → PostgreSQL:
   SELECT channels WHERE guild_id={guildId} AND type='voice'
   Для каждого голосового канала:
   Guild Service → Voice Service (HTTP):
   DELETE /internal/voice/channel/{channelId}/disconnect-all
   Voice Service → LiveKit HTTP API: DeleteRoom(name=channelId)
   Voice Service → SessionStore: удалить все сессии channelId

7. Guild Service → PostgreSQL:
   BEGIN
     DELETE FROM members WHERE guild_id={guildId}
     DELETE FROM channels WHERE guild_id={guildId}
     DELETE FROM invites WHERE guild_id={guildId}
     DELETE FROM bans WHERE guild_id={guildId}
     DELETE FROM guilds WHERE id={guildId}
   COMMIT

8. Guild Service → WS Gateway (HTTP):
   POST /internal/broadcast { type: 'guild.deleted', guildId }
9. WS Gateway → React SPA (все участники гильда, SignalR):
   { type: 'guild.deleted', guildId }
   (UI убирает сервер из панели, переводит пользователей на главный экран)

10. Guild Service → Nginx → React SPA: 204 No Content
```
