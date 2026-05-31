## Фронтенд NexTalk

React 18 + TypeScript + Vite. Запускается как SPA, собирается в статику и раздается через Nginx.

### Технологии

| Пакет | Зачем |
|---|---|
| React + TypeScript | UI |
| Redux Toolkit | состояние (пользователь, гильдии, каналы, сообщения) |
| React Router | маршрутизация (`/`, `/callback`, `/guilds/:id`) |
| oidc-client-ts | OIDC Authorization Code + PKCE flow через Zitadel |
| @microsoft/signalr | WebSocket-клиент к ws-gateway (`/hubs/chat`) |
| livekit-client | WebRTC голосовые каналы |
| axios | HTTP-запросы к API |

### Авторизация

Используется Authorization Code + PKCE. После логина access token хранится в Redux store (in-memory). Все API-запросы добавляют `Authorization: Bearer <token>` через axios interceptor. Silent refresh - через oidc-client-ts.

### Запуск локально

```bash
cd src/web
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ для Nginx
```

Переменные окружения - в `.env.local` (см. `.env.example`). Нужен работающий Zitadel (docker-compose или k3s) для OIDC.
