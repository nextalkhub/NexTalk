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
  "name": "my-awesome-guild"
}
```

**Параметры:**

| Поле | Тип | Требуется | Описание |
|------|-----|-----------|---------|
| `name` | string | да | Название сервера (2–32 символа) |

**Ответ (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Ошибки:**
- `400` - Сервер с таким именем уже существует
- `401` - Не авторизован

---

#### 2. GetUserGuilds (GET)

Получение всех серверов текущего пользователя

```http
GET /guilds
Authorization: Bearer <JWT>
```

**Ответ (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "my-awesome-guild",
    "ownerId": "550e8400-e29b-41d4-a716-446655440002",
    "createdAt": "2026-05-18T10:00:00Z"
  }
]
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
- `403` - Вы не владелец сервера
- `404` - Сервер не найден

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
| `name` | string | - | Имя канала (1–32 символа) |
| `type` | string | `text`, `voice` | Тип канала |

**Ответ (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "guildId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "general",
  "type": "text",
  "createdAt": "2026-05-18T10:00:00Z"
}
```

---

#### 5. GetChannels (GET)

Получение всех каналов сервера

```http
GET /guilds/{guildId}/channels
Authorization: Bearer <JWT>
```

**Ответ (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "guildId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "general",
    "type": "text",
    "createdAt": "2026-05-18T10:00:00Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440011",
    "guildId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "voice-chat",
    "type": "voice",
    "createdAt": "2026-05-18T10:05:00Z"
  }
]
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
| `expiresIn` | string | нет | Время жизни приглашения | `"30m"`, `"24h"`, `"7d"`, `"3600s"` |
| `expiresInSeconds` | integer | нет | Альтернатива (TTL в секундах) | `86400` (24 часа) |
| `maxUses` | integer | нет | Максимум использований (null = неограничено) | `5`, `10` |

**Ответ (201 Created):**
```json
{
  "id": "018e9e5f-2b7a-7000-8000-000000000001",
  "code": "AB12CD34EF56",
  "url": "https://nextalk.fun/invite/AB12CD34EF56",
  "guildId": "550e8400-e29b-41d4-a716-446655440000",
  "expiresAt": "2026-05-19T10:00:00Z",
  "maxUses": 5,
  "usesCount": 0,
  "createdAt": "2026-05-18T10:00:00Z"
}
```

---

#### 8. AcceptInvite (POST)

Присоединение к серверу по приглашению

```http
POST /invites/{code}/accept
Authorization: Bearer <JWT>
```

**Ответ (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "my-awesome-guild",
  "ownerId": "550e8400-e29b-41d4-a716-446655440002",
  "createdAt": "2026-05-18T10:00:00Z"
}
```

**Ошибки:**
- `400` - Исчерпан лимит использований
- `404` - Приглашение не найдено или истекло

---

### Члены сервера

#### 9. GetMembers (GET)

Получение участников сервера

```http
GET /guilds/{guildId}/members
Authorization: Bearer <JWT>
```

**Ответ (200 OK):**
```json
[
  {
    "userId": "550e8400-e29b-41d4-a716-446655440002",
    "displayName": "John Doe",
    "username": "john_doe",
    "role": "Owner",
    "joinedAt": "2026-05-18T10:00:00Z"
  },
  {
    "userId": "550e8400-e29b-41d4-a716-446655440003",
    "displayName": "Jane Smith",
    "username": "jane_smith",
    "role": "Member",
    "joinedAt": "2026-05-18T10:30:00Z"
  }
]
```

---

#### 10. BanMember (POST)

Блокировка участника сервера

```http
POST /guilds/{guildId}/members/{targetUserId}/ban
Authorization: Bearer <JWT>
```

**Ответ (204 No Content):**
```
(пустой)
```

---

#### 11. KickMember (DELETE)

Исключение участника сервера

```http
DELETE /guilds/{guildId}/members/{targetUserId}
Authorization: Bearer <JWT>
```

**Ответ (204 No Content):**
```
(пустой)
```

---

#### 12. AssignRole (PUT)

Назначение роли участнику

```http
PUT /guilds/{guildId}/members/{targetUserId}/role
Content-Type: application/json
Authorization: Bearer <JWT>

{
  "role": "Admin"
}
```

**Параметры:**

| Поле | Тип | Значения |
|------|-----|----------|
| `role` | string | `Member`, `Admin`, `Owner` (без учета регистра) |

**Ответ (200 OK):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440003",
  "role": "Admin"
}
```

**Ошибки:**
- `400` - Неверное значение роли
- `403` - Недостаточно прав (Admin не может назначить Owner)
- `404` - Участник не найден

---

#### 13. GetBans (GET)

Список забаненных участников

```http
GET /guilds/{guildId}/bans
Authorization: Bearer <JWT>
```

**Ответ (200 OK):**
```json
[
  {
    "userId": "550e8400-e29b-41d4-a716-446655440005",
    "bannedAt": "2026-05-18T11:00:00Z"
  }
]
```

---

#### 14. UnbanMember (DELETE)

Снятие бана

```http
DELETE /guilds/{guildId}/bans/{targetUserId}
Authorization: Bearer <JWT>
```

**Ответ (204 No Content):**
```
(пустой)
```

**Ошибки:**
- `403` - Недостаточно прав
- `404` - Бан не найден

---

#### 15. UpdateGuild (PATCH)

Переименование сервера

```http
PATCH /guilds/{guildId}
Content-Type: application/json
Authorization: Bearer <JWT>

{
  "name": "new-name"
}
```

**Ответ (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "new-name"
}
```

**Ошибки:**
- `403` - Не владелец

---

#### 16. RenameChannel (PATCH)

Переименование канала

```http
PATCH /guilds/{guildId}/channels/{channelId}
Content-Type: application/json
Authorization: Bearer <JWT>

{
  "name": "new-channel-name"
}
```

**Ответ (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "name": "new-channel-name"
}
```

---

### Приглашения (расширенные)

#### 17. GetInviteInfo (GET)

Предпросмотр приглашения до принятия

```http
GET /invites/{code}
```

> Не требует авторизации - позволяет показать название сервера до входа.

**Ответ (200 OK):**
```json
{
  "code": "AB12CD34EF56",
  "guildId": "550e8400-e29b-41d4-a716-446655440000",
  "guildName": "my-awesome-guild",
  "expiresAt": "2026-05-19T10:00:00Z",
  "maxUses": 5,
  "usesCount": 2
}
```

**Ошибки:**
- `404` - Приглашение не найдено или истекло

---

#### 18. GetGuildInvites (GET)

Список всех активных приглашений сервера

```http
GET /guilds/{guildId}/invites
Authorization: Bearer <JWT>
```

**Ответ (200 OK):**
```json
[
  {
    "id": "018e9e5f-2b7a-7000-8000-000000000001",
    "code": "AB12CD34EF56",
    "expiresAt": "2026-05-19T10:00:00Z",
    "maxUses": 5,
    "usesCount": 2,
    "createdAt": "2026-05-18T10:00:00Z"
  }
]
```

---

#### 19. DeleteInvite (DELETE)

Удаление приглашения

```http
DELETE /guilds/{guildId}/invites/{code}
Authorization: Bearer <JWT>
```

**Ответ (204 No Content):**
```
(пустой)
```

---

### Внутренние эндпоинты (Internal)

Вызываются только другими микросервисами (WS Gateway, Voice Service). Не проксируются через Nginx.

#### CheckChannelAccess (GET)

```http
GET /internal/channels/{channelId}/access?userId={userId}
```

**Ответ (200 OK):**
```json
{
  "hasAccess": true,
  "guildId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### GetGuildMembers (GET)

```http
GET /internal/guilds/{guildId}/members
```

**Ответ (200 OK):** массив участников (userId, role).

#### GetUserGuilds (GET)

```http
GET /internal/users/{userId}/guilds
```

**Ответ (200 OK):** массив guildId, в которых состоит пользователь.

---

## Messaging Service

**Base URL:** `/api/messages` (через Nginx) или `http://localhost:5002` (прямо)

### Сообщения

#### 1. CreateMessage (POST) - ВНУТРЕННИЙ

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
| `channelId` | UUID | да |
| `guildId` | UUID | да |
| `authorId` | UUID | да |
| `authorName` | string | да |
| `content` | string | да |

**Заголовки:**

| Заголовок | Требуется | Описание |
|-----------|-----------|---------|
| `X-Idempotency-Key` | да | UUID для идемпотентности (24ч TTL) |
| `X-Correlation-Id` | нет | ID для отслеживания |

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
| `limit` | integer | 50 | 1–100 | Кол-во сообщений на странице |
| `cursor` | UUID | - | - | ID последнего полученного сообщения (для следующей страницы) |

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

Сообщения отсортированы от новых к старым. `nextCursor` равен `null`, если страниц больше нет.

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
- `403` - Нет прав на удаление
- `404` - Сообщение не найдено

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

**Ответ (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "liveKitUrl": "wss://livekit.example.com",
  "channelId": "550e8400-e29b-41d4-a716-446655440011",
  "guildId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Результаты:**
- Проверка членства в гильдии и доступа к каналу
- Создание LiveKit комнаты (если еще не существует)
- Генерация JWT токена для прямого подключения к SFU
- Оповещение участников гильдии через WS Gateway (`voice.joined`)

**Ошибки:**
- `400` - Канал не является голосовым
- `403` - Нет доступа к каналу
- `404` - Канал не найден

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
- Оповещение участников гильдии через WS Gateway (`voice.left`)

---

#### 3. DisconnectChannel (DELETE) - ВНУТРЕННИЙ

Принудительное отключение всех пользователей канала (при удалении канала)

```http
DELETE /internal/voice/channel/{channelId}/disconnect-all
X-Correlation-Id: trace-123
```

**Ответ (204 No Content):**
```
(пустой)
```

---

#### 4. DisconnectUser (DELETE) - ВНУТРЕННИЙ

Принудительное отключение пользователя

```http
DELETE /internal/voice/{userId}/disconnect
X-Correlation-Id: trace-123
```

**Ответ (204 No Content):**
```
(пустой)
```

---

## WebSocket Gateway

**URL подключения:** `ws://localhost:5004/hubs/chat` или `wss://nextalk.fun/hubs/chat` (production)

Используется **SignalR**. Для аутентификации передайте JWT через query-параметр `access_token`:

```
wss://nextalk.fun/hubs/chat?access_token=<JWT_ACCESS_TOKEN>
```

### Подключение (JavaScript / TypeScript)

```javascript
import * as signalR from '@microsoft/signalr';

const connection = new signalR.HubConnectionBuilder()
  .withUrl('/hubs/chat', { accessTokenFactory: () => jwtToken })
  .withAutomaticReconnect()
  .build();

connection.on('GatewayEvent', (event) => {
  console.log(event.type, event.payload);
});

await connection.start();
```

### Формат события

Все события приходят через метод `GatewayEvent`:

```json
{
  "type": "event-type",
  "payload": { ... }
}
```

### События

#### message.created

Новое сообщение в канале

```json
{
  "type": "message.created",
  "payload": {
    "id": "018e9e5f-2b7a-7000-8000-000000000001",
    "channelId": "550e8400-e29b-41d4-a716-446655440010",
    "guildId": "550e8400-e29b-41d4-a716-446655440000",
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
  "payload": {
    "messageId": "018e9e5f-2b7a-7000-8000-000000000001",
    "channelId": "550e8400-e29b-41d4-a716-446655440010"
  }
}
```

#### voice.joined

Пользователь присоединился к голосовому каналу

```json
{
  "type": "voice.joined",
  "payload": {
    "userId": "550e8400-e29b-41d4-a716-446655440002",
    "channelId": "550e8400-e29b-41d4-a716-446655440011"
  }
}
```

#### voice.left

Пользователь отключился от голосового канала

```json
{
  "type": "voice.left",
  "payload": {
    "userId": "550e8400-e29b-41d4-a716-446655440002",
    "channelId": "550e8400-e29b-41d4-a716-446655440011"
  }
}
```

#### member.joined

Новый участник вошел в сервер

```json
{
  "type": "member.joined",
  "payload": {
    "userId": "550e8400-e29b-41d4-a716-446655440004",
    "displayName": "Alice",
    "username": "alice",
    "guildId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### member.left

Участник покинул сервер

```json
{
  "type": "member.left",
  "payload": {
    "userId": "550e8400-e29b-41d4-a716-446655440004",
    "guildId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### member.kicked

Участник исключен из сервера

```json
{
  "type": "member.kicked",
  "payload": {
    "userId": "550e8400-e29b-41d4-a716-446655440004",
    "guildId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### member.banned

Участник забанен

```json
{
  "type": "member.banned",
  "payload": {
    "userId": "550e8400-e29b-41d4-a716-446655440004",
    "guildId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### role.assigned

Роль участника изменена

```json
{
  "type": "role.assigned",
  "payload": {
    "userId": "550e8400-e29b-41d4-a716-446655440004",
    "role": "Admin",
    "guildId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### channel.created

Новый канал создан

```json
{
  "type": "channel.created",
  "payload": {
    "id": "550e8400-e29b-41d4-a716-446655440012",
    "guildId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "announcements",
    "type": "text"
  }
}
```

#### channel.updated

Канал переименован

```json
{
  "type": "channel.updated",
  "payload": {
    "id": "550e8400-e29b-41d4-a716-446655440012",
    "guildId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "announcements-new",
    "type": "text"
  }
}
```

#### channel.deleted

Канал удален

```json
{
  "type": "channel.deleted",
  "payload": {
    "channelId": "550e8400-e29b-41d4-a716-446655440012",
    "guildId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### guild.deleted

Сервер удален

```json
{
  "type": "guild.deleted",
  "payload": {
    "guildId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### guild.force.disconnect

Принудительное отключение от сервера (бан или кик)

```json
{
  "type": "guild.force.disconnect",
  "payload": {
    "guildId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### presence.online

Пользователь подключился к WS Gateway

```json
{
  "type": "presence.online",
  "payload": {
    "userId": "550e8400-e29b-41d4-a716-446655440002"
  }
}
```

#### presence.offline

Пользователь отключился от WS Gateway

```json
{
  "type": "presence.offline",
  "payload": {
    "userId": "550e8400-e29b-41d4-a716-446655440002"
  }
}
```

### Методы клиента (Client → Server)

#### SendMessage

Отправка сообщения в канал

```javascript
await connection.invoke('SendMessage', channelId, content, idempotencyKey);
```

| Параметр | Тип | Описание |
|----------|-----|---------|
| `channelId` | UUID | ID текстового канала |
| `content` | string | Текст сообщения (1–4000 символов) |
| `idempotencyKey` | string | UUID для дедупликации |

**Ответ (через `MessageAck`):**
```json
{
  "id": "018e9e5f-2b7a-7000-8000-000000000001",
  "channelId": "550e8400-e29b-41d4-a716-446655440010",
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440099"
}
```

#### Heartbeat

Поддержание присутствия онлайн

```javascript
await connection.invoke('Heartbeat');
```

#### GetOnlineUsers

Получение списка userId онлайн-участников

```javascript
const userIds = await connection.invoke('GetOnlineUsers');
// returns: string[]
```

#### JoinGuildGroup

Подписка на события сервера (вызывать при открытии сервера)

```javascript
const ok = await connection.invoke('JoinGuildGroup', guildId);
// returns: bool
```

#### LeaveGuildGroup

Отписка от событий сервера

```javascript
await connection.invoke('LeaveGuildGroup', guildId);
```
