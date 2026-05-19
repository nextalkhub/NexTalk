## Содержание

1. [Аутентификация и авторизация](#аутентификация-и-авторизация)
2. [Guild Service](#guild-service)
3. [Messaging Service](#messaging-service)
4. [Voice Service](#voice-service)
5. [WebSocket Gateway](#websocket-gateway)

---

## Аутентификация и авторизация

### JWT токен (Zitadel)

Все публичные эндпоинты требуют JWT авторизацию:

```bash
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

**JWT структура:**
```json
{
  "sub": "373461234567890123",           
  "preferred_username": "john_doe",
  "email": "john@example.com",
  "email_verified": true,
  "aud": ["373461234567890123"],       
  "iss": "http://localhost:8080",
  "exp": 1779183419895,
  "iat": 1779097019895
}
```

### Автоматически заполняемые заголовки

Middleware во всех сервисах автоматически извлекает из JWT:

| Заголовок | Источник | Формат |
|-----------|----------|--------|
| `X-User-Id` | `sub` claim | UUID |
| `X-Username` | `preferred_username` claim | string |
| `X-User-Display-Name` | email или preferred_username | string |

---

## Guild Service

**Base URL:** `/api/guilds` (через Nginx) или `http://localhost:5001` (прямо)

### Сервера

#### 1. CreateGuild (POST)

Создание нового сервера

```http
POST /guilds
Content-Type: application/json
Authorization: Bearer <JWT>

{
  "name": "my-awesome-guild",
  "displayName": "My Awesome Guild"
}
```

**Параметры:**

| Поле | Тип | Требуется | Описание |
|------|-----|-----------|---------|
| `name` | string | да        | Техническое имя (для URL, уникальное) |
| `displayName` | string | да        | Отображаемое имя |

**Ответ (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Ошибки:**
- `400` — Сервер с таким именем уже существует
- `401` — Не авторизован

---

#### 2. GetUserGuilds (GET)

Получение всех серверов текущего пользователя

```http
GET /guilds
Authorization: Bearer <JWT>
```

**Ответ (200 OK):**
```json
{
  "guilds": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "my-awesome-guild",
      "displayName": "My Awesome Guild",
      "ownerId": "550e8400-e29b-41d4-a716-446655440002",
      "createdAt": "2026-05-18T10:00:00Z"
    }
  ]
}
```

---

#### 3. DeleteGuild (DELETE)

Удаление сервера (только владелец)

```http
DELETE /guilds/{guildId}
Authorization: Bearer <JWT>
```

**Ответ (204 No Content):**
```
(пустой)
```

**Ошибки:**
- `403` — Вы не владелец сервера
- `404` — Сервер не найден

---

### Каналы

#### 4. CreateChannel (POST)

Создание канала в сервере

```http
POST /guilds/{guildId}/channels
Content-Type: application/json
Authorization: Bearer <JWT>

{
  "name": "general",
  "type": "text"
}
```

**Параметры:**
| Поле | Тип | Значения | Описание |
|------|-----|----------|---------|
| `name` | string | - | Имя канала |
| `type` | string | `text`, `voice` | Тип канала |

**Ответ (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "name": "general",
  "type": "text",
  "guildId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

#### 5. GetChannels (GET)

Получение всех каналов севрера

```http
GET /guilds/{guildId}/channels
Authorization: Bearer <JWT>
```

**Ответ (200 OK):**
```json
{
  "channels": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "name": "general",
      "type": "text",
      "guildId": "550e8400-e29b-41d4-a716-446655440000"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440011",
      "name": "voice-chat",
      "type": "voice",
      "guildId": "550e8400-e29b-41d4-a716-446655440000"
    }
  ]
}
```

---

#### 6. DeleteChannel (DELETE)

Удаление канала

```http
DELETE /guilds/{guildId}/channels/{channelId}
Authorization: Bearer <JWT>
```

**Ответ (204 No Content):**
```
(пустой)
```

---

### Приглашения

#### 7. CreateInvite (POST)

Создание приглашения в гильдию

```http
POST /guilds/{guildId}/invites
Content-Type: application/json
Authorization: Bearer <JWT>

{
  "expiresIn": "24h",
  "maxUses": 5
}
```

**Параметры:**
| Поле | Тип | Требуется | Описание | Примеры |
|------|-----|----------|---------|---------|
| `expiresIn` | string | нет | Время жизни приглашения | `"24h"`, `"7d"`, `"30m"`, `"3600s"` |
| `expiresInSeconds` | integer | нет | Альтернатива (legacy) | `86400` (24 часа) |
| `maxUses` | integer | нет | Максимум использований | `5`, `10` |

**Ответ (201 Created):**
```json
{
  "code": "AB12CD34EF56",
  "guildId": "550e8400-e29b-41d4-a716-446655440000",
  "createdBy": "550e8400-e29b-41d4-a716-446655440002",
  "expiresAt": "2026-05-19T10:00:00Z",
  "maxUses": 5,
  "usedCount": 0
}
```

---

#### 8. AcceptInvite (POST)

Присоединение к серверу по приглашению

```http
POST /invites/{inviteCode}/accept
Authorization: Bearer <JWT>
```

**Ответ (200 OK):**
```json
{
  "guildId": "550e8400-e29b-41d4-a716-446655440000",
  "displayName": "My Awesome Guild"
}
```

**Ошибки:**
- `404` — Приглашение не найдено или истекло
- `400` — Исчерпан лимит использований

---

#### 9. GetInviteInfo (GET)

Получение информации о приглашении

```http
GET /invites/{inviteCode}
```

**Ответ (200 OK):**
```json
{
  "code": "AB12CD34EF56",
  "guildDisplayName": "My Awesome Guild",
  "expiresAt": "2026-05-19T10:00:00Z",
  "maxUses": 5,
  "usedCount": 1
}
```

---

### Члены сервера

#### 10. GetMembers (GET)

Получение участников сервера

```http
GET /guilds/{guildId}/members
Authorization: Bearer <JWT>
```

**Ответ (200 OK):**
```json
{
  "members": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440002",
      "displayName": "John Doe",
      "role": "owner",
      "joinedAt": "2026-05-18T10:00:00Z"
    },
    {
      "userId": "550e8400-e29b-41d4-a716-446655440003",
      "displayName": "Jane Smith",
      "role": "member",
      "joinedAt": "2026-05-18T10:30:00Z"
    }
  ]
}
```

---

#### 11. BanMember (POST)

Блокировка участника сервера

```http
POST /guilds/{guildId}/members/{memberId}/ban
Authorization: Bearer <JWT>
```

**Ответ (204 No Content):**
```
(пустой)
```

---

#### 12. KickMember (POST)

Исключение участника сервера

```http
POST /guilds/{guildId}/members/{memberId}/kick
Authorization: Bearer <JWT>
```

**Ответ (204 No Content):**
```
(пустой)
```

---

#### 13. AssignRole (POST)

Назначение роли участнику

```http
POST /guilds/{guildId}/members/{memberId}/role
Content-Type: application/json
Authorization: Bearer <JWT>

{
  "role": "moderator"
}
```

**Параметры:**

| Поле | Тип | Значения |
|------|-----|----------|
| `role` | string | `owner`, `moderator`, `member` |

**Ответ (204 No Content):**
```
(пустой)
```

---

## Messaging Service

**Base URL:** `/api/messages` (через Nginx) или `http://localhost:5002` (прямо)

### Сообщения

#### 1. CreateMessage (POST) — ВНУТРЕННИЙ

Создание сообщения (вызывается только WS Gateway)

```http
POST /internal/messages
Content-Type: application/json
X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440099
X-Correlation-Id: trace-123

{
  "channelId": "550e8400-e29b-41d4-a716-446655440010",
  "guildId": "550e8400-e29b-41d4-a716-446655440000",
  "authorId": "550e8400-e29b-41d4-a716-446655440002",
  "authorName": "John Doe",
  "content": "Hello everyone!"
}
```

**Параметры:**

| Поле | Тип | Требуется |
|------|-----|-----------|
| `channelId` | UUID | да        |
| `guildId` | UUID | да        |
| `authorId` | UUID | да        |
| `authorName` | string | да        |
| `content` | string | да        |

**Заголовки:**

| Заголовок | Требуется | Описание |
|-----------|-----------|---------|
| `X-Idempotency-Key` | да        | UUID для идемпотентности (24ч TTL) |
| `X-Correlation-Id` | нет       | ID для отслеживания |

**Ответ (201 Created / 200 OK если дублирование):**
```json
{
  "id": "018e9e5f-2b7a-7000-8000-000000000001",
  "channelId": "550e8400-e29b-41d4-a716-446655440010",
  "guildId": "550e8400-e29b-41d4-a716-446655440000",
  "authorId": "550e8400-e29b-41d4-a716-446655440002",
  "authorName": "John Doe",
  "content": "Hello everyone!",
  "createdAt": "2026-05-18T10:35:00Z"
}
```

---

#### 2. GetMessages (GET)

Получение сообщений из канала (cursor-pagination)

```http
GET /channels/{channelId}/messages?limit=50&cursor=optional-uuid
Authorization: Bearer <JWT>
```

**Query параметры:**

| Параметр | Тип | По умолчанию | Диапазон | Описание |
|----------|-----|-------------|---------|---------|
| `limit` | integer | 50 | 1-100 | Кол-во сообщений на странице |
| `cursor` | UUID | - | - | ID последнего сообщения для пагинации |

**Ответ (200 OK):**
```json
{
  "messages": [
    {
      "id": "018e9e5f-2b7a-7000-8000-000000000001",
      "channelId": "550e8400-e29b-41d4-a716-446655440010",
      "authorId": "550e8400-e29b-41d4-a716-446655440002",
      "authorName": "John Doe",
      "content": "Hello everyone!",
      "createdAt": "2026-05-18T10:35:00Z"
    }
  ],
  "nextCursor": "018e9e5f-2b7a-7000-8000-000000000000"
}
```

---

#### 3. DeleteMessage (DELETE)

Удаление сообщения (автор или администратор)

```http
DELETE /messages/{messageId}
Authorization: Bearer <JWT>
```

**Ответ (204 No Content):**
```
(пустой)
```

**Ошибки:**
- `403` — Нет прав на удаление
- `404` — Сообщение не найдено

---

## Voice Service

**Base URL:** `/api/voice` (через Nginx) или `http://localhost:5003` (прямо)

### Голосовые каналы (интеграция с LiveKit)

#### 1. JoinVoice (POST)

Подключение к голосовому каналу

```http
POST /voice/{channelId}/join
Authorization: Bearer <JWT>
```

**Параметры:**

| Параметр | Тип | Расположение | Описание |
|----------|-----|-------------|---------|
| `channelId` | UUID | path | ID голосового канала |

**Автоматический заголовок:**
```
X-User-Id: 550e8400-e29b-41d4-a716-446655440002
```

**Ответ (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "liveKitUrl": "ws://livekit:7880",
  "channelId": "550e8400-e29b-41d4-a716-446655440011",
  "guildId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Результаты:**
- Проверка членства в гильдии
- Создание LiveKit комнаты
- Генерация токена
- Оповещение других участников через WS

**Ошибки:**
- `403` — Нет членства в гильдии
- `404` — Канал не найден

---

#### 2. LeaveVoice (POST)

Отключение от голосового канала

```http
POST /voice/{channelId}/leave
Authorization: Bearer <JWT>
```

**Ответ (200 OK):**
```json
{}
```

**Результаты:**
- Удаление сессии пользователя
- Отключение от LiveKit
- Оповещение других участников

---

#### 3. DisconnectChannel (POST) — ВНУТРЕННИЙ

Принудительное отключение канала (при удалении)

```http
POST /internal/voice/disconnect/{channelId}
X-Correlation-Id: trace-123
```

**Ответ (204 No Content):**
```
(пустой)
```

---

#### 4. DisconnectUser (POST) — ВНУТРЕННИЙ

Принудительное отключение пользователя

```http
POST /internal/voice/disconnect/user/{userId}
X-Correlation-Id: trace-123
```

**Ответ (204 No Content):**
```
(пустой)
```

---

## WebSocket Gateway

**URL:** `ws://localhost:5004` или `wss://nexttalk.example.com` (production)

### Подключение

```javascript
const ws = new WebSocket('ws://localhost:5004');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message);
};
```

### События

#### message.created

Новое сообщение в канале

```json
{
  "type": "message.created",
  "data": {
    "id": "018e9e5f-2b7a-7000-8000-000000000001",
    "channelId": "550e8400-e29b-41d4-a716-446655440010",
    "authorId": "550e8400-e29b-41d4-a716-446655440002",
    "authorName": "John Doe",
    "content": "Hello everyone!",
    "createdAt": "2026-05-18T10:35:00Z"
  }
}
```

#### message.deleted

Удаление сообщения

```json
{
  "type": "message.deleted",
  "data": {
    "messageId": "018e9e5f-2b7a-7000-8000-000000000001",
    "channelId": "550e8400-e29b-41d4-a716-446655440010"
  }
}
```

#### voice.user_joined

Пользователь присоединился к голосовому каналу

```json
{
  "type": "voice.user_joined",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440002",
    "displayName": "John Doe",
    "channelId": "550e8400-e29b-41d4-a716-446655440011"
  }
}
```

#### voice.user_left

Пользователь отключился от голосового канала

```json
{
  "type": "voice.user_left",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440002",
    "channelId": "550e8400-e29b-41d4-a716-446655440011"
  }
}
```