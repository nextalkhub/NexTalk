# Интеграция нового продуктового дизайна NexTalk в существующий фронт

> Скопируйте этот промпт целиком и передайте агенту-разработчику
> (Claude Code, Cursor, Aider). У агента должен быть доступ к:
> - **Папка А — старый код:** `NexTalk/` (текущий монорепо)
> - **Папка B — новый дизайн:** распакованный zip этого дизайн-проекта
>   (содержит `app.html`, `app-*.jsx`, `app.css`, `chat.css`, `chat-views.css`,
>   `gap.html`, `handoff-prompt.md`, `integration-prompt.md` — это вы и читаете)

---

## Что ты делаешь

Заменяешь старый фронт NexTalk на новый дизайн **внутри той же кодовой базы**
(`NexTalk/src/web/`). Стек, инструменты, бэкенд — те же. Меняются только
компоненты, стили, layout. Бэк остаётся нетронутым.

**Принцип:** новый дизайн — это эталон визуала и UX. Реальные данные, логика,
сетевое взаимодействие — берутся из существующего фронта (хуки, slices,
SignalR, LiveKit, axios). Ничего из реальной интеграции с бэком ломать
**нельзя** — heartbeat, presence, WebSocket reconnect, LiveKit token exchange
работают как работали.

---

## Где что лежит

### Папка А — старый код NexTalk

```
NexTalk/src/web/
├── src/
│   ├── shared/
│   │   ├── styles/        # variables.scss, mixins.scss, global.scss
│   │   ├── components/    # Button, Input, Icon, Layout, GradientBackground
│   │   ├── slices/        # chatSlice, channelSlice, serverSlice,
│   │   │                   # memberSlice, voiceSlice, authSlice, inviteSlice
│   │   ├── hooks/         # useSignalR, signalRContext, useGatewayEvents,
│   │   │                   # useTypedSelector, useAppDispatch
│   │   └── store.ts
│   ├── processes/         # axios instance, REST вызовы
│   ├── modules/
│   │   ├── auth/          # AuthPage, OidcCallback, oidc/
│   │   ├── invite/        # InvitePage
│   │   ├── servers/       # ServerSidebar, ServerCard, ServerIcon
│   │   ├── channels/      # ChannelSidebar, ChannelChatPage, VoiceChannelPage
│   │   ├── chat/          # Message, MessageInput, MessageList
│   │   ├── members/       # MembersList
│   │   └── voice/         # VoiceChannelPage, VoiceControls, useVoice
│   └── App.tsx, main.tsx
```

### Папка B — новый дизайн (этот проект)

```
design-project/
├── app.html              ⭐ ВХОДНАЯ ТОЧКА — открой и пощёлкай Tweaks → "Экран"
│                            чтобы увидеть все 15 состояний UI
├── app-data.jsx          # моковые данные (DTO-shapes — твой словарь для маппинга)
├── app-shell.jsx         # ServerRail, ChannelSidebar, TopBar, MembersPanel
├── app-chat.jsx          # ChatView, Message, Composer (MVP-only, без gap-фич)
├── app-voice.jsx         # VoiceStage с тайлами и контролами
├── app-auth.jsx          # AuthPage, CallbackPage, InvitePage (5 состояний)
├── app-settings.jsx      # ServerSettings (Overview/Channels/Members/Invites/Bans/Danger),
│                            AppSettings (Внешний вид/Звук/Уведомления/Сессия),
│                            ProfilePage
├── app-modals.jsx        # Create server/channel/invite, Kick, Ban,
│                            Delete server, Logout, Toast, NotFound, Error
├── app-home.jsx          # Home (без выбранного сервера)
├── app.jsx               # корень: роутинг, тема, плотность, tweaks
├── app.css               # стили product-only (auth, settings, modals, home)
├── chat.css              # стили чата и shell (RAIL, SIDE, TOP, MAIN, RIGHT)
├── chat-views.css        # стили сообщений, voice tiles, members
├── tweaks-panel.jsx      # игнорируй — это dev-инструмент
├── gap.html              # документ "что НЕ в бэке" — фичи в новом фронте
│                            СОЗНАТЕЛЬНО стрипнуты до того, что бэк умеет
└── handoff-prompt.md     # старый промпт — не для тебя, для другого agent flow
```

**Запусти `app.html` локально через любой статичный сервер** (или открой
в браузере) и кликни Tweaks → "Экран" — там список из 15 состояний:
auth, callback, 5 вариантов invite, home, channel-chat, channel-voice,
server-settings, settings, profile, 404, 503. Так ты видишь, как должно
выглядеть всё в финале.

---

## План работ

### Этап 0 — Подготовка (полдня)

1. **Перенеси токены палитры** из `app.css` / `chat.css` (`:root` блок)
   в `NexTalk/src/web/src/shared/styles/variables.scss`. Существующие
   переменные **не удаляй**, новые добавь:
   `$bg-0..5`, `$bd-1..3`, `$fg-0..4`, `$brand-1..3`, `$grad-brand`,
   `$ok`, `$warn`, `$live`, `$info`, `$mention`, `$r-sm..2xl`, `$r-pill`,
   `$font-display`, `$font-body`, `$font-mono`.
2. **Подключи шрифты** Space Grotesk + Manrope + JetBrains Mono — через
   `<link>` в `index.html` или `@import` в `global.scss`.
3. **Прогон сборки** — `npm run build` должен быть зелёным.

### Этап 1 — Shell (1 день)

Создай новые компоненты в `src/web/src/shared/components/AppShell/`:

| Компонент | Дизайн-эталон | Данные |
|---|---|---|
| `ServerRail.tsx` | `app-shell.jsx::ServerRail` | `state.server.servers` (serverSlice) |
| `ChannelSidebar.tsx` | `app-shell.jsx::ChannelSidebar` | `state.channels.channels`, `state.server.byId[id]` |
| `TopBarChannel.tsx` | `app-shell.jsx::TopBarChannel` | active channel + server |
| `MembersPanel.tsx` | `app-shell.jsx::MembersPanel` | `state.member.members` + presence |
| `SelfStatus.tsx` | `app-shell.jsx::SelfStatus` | `state.auth.user` (JWT claims) |
| `AppShellLayout.tsx` | grid из `chat.css::.app` | компонует всё вышеперечисленное |

**CSS:** перенеси `.app`, `.rail`, `.side`, `.top`, `.main`, `.right`,
`.side-row`, `.voice-nested`, `.side-self` из `chat.css` в
`AppShell/AppShell.module.scss`. Размеры и grid-areas — **точно такие же**.

**Маршрутизация:** существующий `react-router` — оставь. Маршруты:

```
/                          → Home
/auth                      → AuthPage
/auth/callback             → CallbackPage (OidcCallback в старом коде)
/invite/:code              → InvitePage
/servers/:serverId         → редирект на первый канал
/servers/:serverId/channels/:channelId         → ChatView (text)
/servers/:serverId/voice/:channelId            → VoiceStage
/servers/:serverId/settings                    → ServerSettings
/servers/:serverId/settings/:tab               → ServerSettings (с табом)
/settings                  → AppSettings
/settings/:tab             → AppSettings (с табом)
/profile                   → ProfilePage
```

Каждый экран использует `AppShellLayout` кроме auth/callback/invite/404
— те fullscreen.

### Этап 2 — Чат (1.5 дня)

Замени `modules/chat/components/Message.tsx`, `MessageInput.tsx`,
`MessageList.tsx` и `modules/channels/pages/ChannelChatPage.tsx`.

Эталон — `app-chat.jsx`. Бери из старого кода:

- Загрузка истории: `dispatch(loadMessages({channelId, cursor}))` →
  `chatSlice.messages[channelId]`. Сохрани cursor-based пагинацию.
- Отправка: `connection.invoke('SendMessage', channelId, text, crypto.randomUUID())`
  как сейчас. Idempotency-key уже передаётся.
- Получение нового сообщения: подписка `useGatewayEvents` на
  `message.created` → диспатч в `chatSlice.addMessage`.
- Удаление: `axios.delete('/api/messages/${id}')` → подписка на
  `message.deleted` → `chatSlice.removeMessage`. Кнопка показывается
  если `msg.authorId === me.sub` ИЛИ роль пользователя в гильдии
  `Owner | Admin`.

**Что НЕ делать** (нет в бэке — см. `gap.html`):
- Реакции, треды, edit, mention-уведомления, pin, typing,
  inline reply quote, attachments, search, inbox, slash-команды.

Если в композере появляется кнопка с такой функцией — её НЕТ.
Если в старом коде такие вызовы есть — выпили их, бэк их не обрабатывает.

**Code blocks** — рендеринг markdown триплов-бэктиков (` ```bash ... ``` `)
в подсвеченный блок. Чистый клиент, бэк хранит plain text.
Используй существующий парсер из `app-chat.jsx::CodeBlock` или подключи
`shiki`/`prismjs` если хочется быстрее.

### Этап 3 — Голос (1 день)

Замени `modules/voice/pages/VoiceChannelPage.tsx`. Эталон —
`app-voice.jsx::VoiceStage`.

Использует существующий `useVoice()` хук. Маппинг:

| Дизайн | useVoice() |
|---|---|
| `tiles` (массив участников) | `room.participants` (Map → Array) + `localParticipant` |
| `speakerIdx` (кто сейчас говорит) | `room.activeSpeakers[0]?.identity` |
| `selfMuted` | `localParticipant.isMicrophoneEnabled` |
| `selfDeaf` (наушники выкл) | клиентский флаг (LiveKit не имеет) — храни в `voiceSlice` |
| `onMute` | `localParticipant.setMicrophoneEnabled(false)` |
| `onLeave` | `room.disconnect()` → редирект на текстовый канал |

Подписка на события:

```ts
room.on(RoomEvent.ActiveSpeakersChanged, speakers => {
  dispatch(voiceSlice.actions.setActiveSpeakers(speakers.map(s => s.identity)))
});
room.on(RoomEvent.ParticipantConnected, p => { /* re-render */ });
room.on(RoomEvent.ParticipantDisconnected, p => { /* re-render */ });
room.on(RoomEvent.TrackMuted/Unmuted, ...);
```

**LiveKit token:** уже выдаётся через `POST /api/voice/token`. Не трогай.

### Этап 4 — Server Settings (2 дня)

Создай `modules/servers/pages/ServerSettingsPage.tsx`. Эталон —
`app-settings.jsx::ServerSettings` + дочерние `ServerOverview`,
`ServerChannels`, `ServerMembers`, `ServerInvites`, `ServerBans`,
`ServerDanger`.

Маппинг REST:

| Действие | Эндпоинт |
|---|---|
| Список каналов | `GET /api/guilds/{id}/channels` (есть в channelSlice) |
| Создать канал | `POST /api/guilds/{id}/channels {name, type}` |
| Удалить канал | `DELETE /api/channels/{id}` |
| Список участников | `GET /api/guilds/{id}/members` (есть в memberSlice) |
| Сменить роль | `PATCH /api/guilds/{id}/members/{userId}/role {role}` |
| Кикнуть | `DELETE /api/guilds/{id}/members/{userId}` |
| Забанить | `POST /api/guilds/{id}/bans {userId, reason}` |
| Список банов | `GET /api/guilds/{id}/bans` |
| Разбанить | `DELETE /api/guilds/{id}/bans/{userId}` |
| Список инвайтов | `GET /api/guilds/{id}/invites` |
| Создать инвайт | `POST /api/guilds/{id}/invites {ttl, maxUses}` |
| Отозвать инвайт | `DELETE /api/invites/{code}` *(если есть — иначе сделай TODO)* |
| Удалить гильдию | `DELETE /api/guilds/{id}` |

После каждого write-действия — toast (есть `Toast` компонент в дизайне).
Через 1–2 сек прилетит WS-событие (`guild.member.kicked`,
`guild.channel.created` и т.д.) — оно само обновит state через подписку.

**Права:** проверяй `me.role` по гильдии. Member видит только Overview
(без редактирования). Admin — всё кроме Danger. Owner — всё.

### Этап 5 — Auth, Invite, Profile, AppSettings, system pages (1.5 дня)

- **AuthPage** — эталон `app-auth.jsx::AuthPage`. Кнопка дёргает
  существующий `useOidc().signIn()`.
- **CallbackPage** — эталон `app-auth.jsx::CallbackPage`. Использует
  существующий callback-handler с `state`/`nonce`/PKCE.
- **InvitePage** — эталон `app-auth.jsx::InvitePage` (5 состояний:
  preview, banned, expired, consumed, invalid). Использует
  `inviteSlice` + `GET /api/invites/{code}` для preview,
  `POST /api/invites/{code}/accept` для accept.
- **ProfilePage** — read-only из JWT claims (`me.sub`, `me.email`,
  `me.preferred_username`). Кнопка "Открыть профиль в Zitadel" —
  внешняя ссылка на `${ZITADEL_BASE_URL}/users/me`.
- **AppSettings** — клиентские настройки, хранить в `localStorage`:
  - Тема, плотность, шрифт-скейл — есть в дизайне
  - Микрофон/наушники — `navigator.mediaDevices.enumerateDevices()`
  - Эхоподавление/шумоподавление — LiveKit `audioCaptureDefaults`
  - Уведомления — Notification API
  - Тихие часы — клиентский флаг
  - Сессия — отображение `iat`/`exp` из decoded JWT
- **404, 503** — эталон `app-modals.jsx::NotFoundPage`, `ErrorPage`.
  503 показывается, когда `axios.isAxiosError` → 503 от Polly (Circuit
  Breaker OPEN).

### Этап 6 — Real-time wiring (1 день — самое важное)

Здесь не должно ничего сломаться по сравнению с текущим кодом. Сверь
каждый пункт ниже с существующим `useSignalR.ts` / `signalRContext.tsx`
/ `useGatewayEvents.ts`.

#### 6.1 SignalR подключение

```ts
// Не трогай существующий контекст.
const connection = new HubConnectionBuilder()
  .withUrl('/hubs/chat', {
    accessTokenFactory: () => store.getState().auth.accessToken,
    transport: HttpTransportType.WebSockets,
  })
  .withAutomaticReconnect({ nextRetryDelayInMilliseconds: ctx =>
    Math.min(30_000, 1000 * Math.pow(2, ctx.previousRetryCount)) })
  .build();

connection.onreconnecting(() => dispatch(uiSlice.actions.setConnection('reconnecting')));
connection.onreconnected(() => dispatch(uiSlice.actions.setConnection('connected')));
connection.onclose(() => dispatch(uiSlice.actions.setConnection('disconnected')));
```

В дизайне есть **баннер «соединение потеряно»** (см. `app.css::.reconnect-banner`)
— показывай его, когда `uiSlice.connection === 'reconnecting'` или `'disconnected'`.

#### 6.2 События с бэка

Все эти события уже публикуются через Outbox в текущем коде.
Подпиши в `useGatewayEvents`:

```ts
connection.on('message.created',   (m) => dispatch(chatSlice.actions.add(m)));
connection.on('message.deleted',   ({id, channelId}) => dispatch(chatSlice.actions.remove({id, channelId})));
connection.on('channel.created',   (c) => dispatch(channelSlice.actions.add(c)));
connection.on('channel.deleted',   ({id}) => dispatch(channelSlice.actions.remove(id)));
connection.on('guild.member.joined', (m) => dispatch(memberSlice.actions.add(m)));
connection.on('guild.member.kicked', ({userId}) => dispatch(memberSlice.actions.remove(userId)));
connection.on('guild.member.banned', ({userId}) => dispatch(memberSlice.actions.remove(userId)));
connection.on('guild.member.role.changed', ({userId, role}) => dispatch(memberSlice.actions.setRole({userId, role})));
connection.on('guild.deleted',      ({id}) => { /* выкинуть из списка, навигация */ });
connection.on('presence.online',    ({userId}) => dispatch(memberSlice.actions.setStatus({userId, status: 'online'})));
connection.on('presence.offline',   ({userId}) => dispatch(memberSlice.actions.setStatus({userId, status: 'offline'})));
```

**Идемпотентность:** в `chatSlice.add` проверяй, что сообщения с таким id
ещё нет — Outbox at-least-once может прислать дубль. В старом коде
эта проверка уже есть. Сохрани её.

#### 6.3 Presence + Heartbeat (FR-25) — ВАЖНО

Текущая реализация:
- Клиент шлёт heartbeat каждые 20 сек: `connection.invoke('Heartbeat')`
- WS Gateway хранит in-memory ConcurrentDictionary `userId → lastSeenAt`
- TTL = 30 сек. Не было ping → `presence.offline` всем broadcastам пользователя.
- При connection ↑ → отправляется `presence.online`.

В новом дизайне presence-точки рисуются в `MembersPanel.tsx` — три
состояния: `online`, `idle`, `offline`. Бэк отдаёт только два
(`online` / `offline`). **Не вводи idle на бэке.** Idle (если хочешь)
рассчитывай **на клиенте** по `last-user-activity-at` (последний move
мыши / нажатие клавиши). Если 5 мин нет активности — показывай `idle`
для своего аватара. Чужие — как пришло с бэка.

**Чек-лист, чтобы не сломать heartbeat:**
- ✓ В `AppShell` смонтировать хук `usePresenceHeartbeat()` (если был —
  оставь, если был в `App.tsx` — мигрируй в новый shell)
- ✓ Не мерять heartbeat в каждом компоненте — один таймер на приложение
- ✓ При unmount / закрытии вкладки — `connection.invoke('SetOffline')`
  или просто полагайся на TTL

#### 6.4 LiveKit — никаких изменений в архитектуре

- Получение токена: `POST /api/voice/token {channelId}` — без изменений
- Подключение к Room: `room.connect(LIVEKIT_URL, token)` — без изменений
- Отключение при размонтировании `VoiceStage`: `room.disconnect()`
- При смене текстового канала — голосовое соединение **не** отрываем
  (как и раньше). См. `useVoice.ts`.

**Грабли, на которые НЕ наступать:**
- Не вызывай `room.connect` повторно для уже подключённой комнаты
- При HMR в dev — обязательно cleanup в `useEffect`
- LiveKit token истекает раньше JWT NexTalk — если нужно, дёргай новый

#### 6.5 Cursor-pagination в чате

В дизайне есть scroll-up для подгрузки старых сообщений (не реализован
в моках, но layout это позволяет).

Реализация:
```ts
const onScroll = (e) => {
  if (e.target.scrollTop < 100 && !loading) {
    dispatch(loadMessages({channelId, cursor: oldest.id}));
  }
};
```

Сохраняй scrollTop при добавлении старых сообщений (классический
trick — после `setMessages` сместить scrollTop на разницу высоты).

### Этап 7 — Зачистка (полдня)

- Удали неиспользуемые компоненты из старого фронта
- Прогон ESLint, `tsc --noEmit`, `npm test`
- Проверь, что `npm run build` сильно меньше bundle не стал
  (новые SCSS могут добавить ~30 КБ — это норма)
- Проверь, что dev-сервер реконнектит SignalR при потере связи

---

## Правила, по которым ты пишешь

- **TypeScript строгий**, `any` запрещён
- **SCSS modules** на каждый компонент: `Foo.tsx` + `Foo.module.scss`
- **CSS-переменные** не дублируй — используй из `variables.scss`
- **Иконки:** не вставляй SVG inline. Все иконки из дизайна
  (`app-shell.jsx::I` объект) перенеси в существующий
  `shared/components/Icon/Icon.tsx`, добавь по имени (`hash`, `speaker`,
  `mic`, `mic-off`, `headset`, `gear`, `users`, `logout`, `send`,
  `trash`, `more`, `copy`, `check`, `chev-down`, `chev-right`,
  `arrow-out`, `shield`, `hammer`, `boot`, `link`, `phone-off`,
  `refresh`, `home`, `plus`, `x`).
- **Inline-стили запрещены** — кроме генерируемых
  (avatar gradient по hue: `linear-gradient(135deg, oklch(0.62 0.16 ${hue}), oklch(0.48 0.18 ${(hue+40)%360}))`)
- **Все UI-строки на русском** — как в дизайне
- **Никаких эмодзи в коде** кроме как в `emoji-picker.ts` (если будешь
  его делать в будущем — сейчас не надо)
- **Никаких новых зависимостей** без обоснования
- **Тёмная тема — единственная.** Светлой темы в дизайне нет. Палитра
  переключается через 4 пресета (`nextalk`, `midnight`, `emerald`, `graphite`).
  Все 4 храни в `variables.scss` через CSS-переменные.

---

## Как проверять

После каждого этапа:
1. `npm run build` — зелёный
2. Сравнить визуально с `app.html` (открой в браузере рядом)
3. Прогон Cypress / Playwright e2e если они есть в репо
4. Ручной чек:
   - Логин → OIDC redirect → callback → home
   - Создать сервер → создать канал → отправить сообщение в другом окне (вторая сессия)
   - Подключиться к голосовому каналу → проверить что viewport показывает participants
   - Дёрнуть `docker stop messaging-service` → проверить, что появляется
     reconnect-banner и потом возвращается online
   - Heartbeat: открыть DevTools → Network → WS → видеть `Heartbeat` каждые 20с
   - Закрыть вкладку → во второй сессии проверить, что аватар стал
     серым через 30 сек

После каждого этапа создавай / дополняй `docs/redesign-log.md`:

```md
## Этап N — <название>
- Сделано: ...
- Скрины до/после: ...
- Что пришлось дополнить в бэке (если что): ...
- Что осталось как TODO (gap-feature): ...
- Риски: ...
```

---

## Спорные ситуации

- **Дизайн показывает фичу, которой нет в бэке** — НЕ выдумывай эндпоинт.
  Спрячь кнопку или сделай `disabled` с tooltip «доступно после: gap-NN».
- **Старый код делает X, дизайн делает Y** — побеждает дизайн, но если
  это ломает бэк-контракт — спроси.
- **В старом коде есть лучшее решение, которого нет в дизайне** —
  оставь старое. Дизайн — про визуал, а не про код.

---

## Резюме одной строкой

> Возьми визуал из дизайн-проекта, привяжи к существующим
> slices/хуку/SignalR/LiveKit/heartbeat в NexTalk, не трогай бэк,
> не вводи фичи из gap-документа.
