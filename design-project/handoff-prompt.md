# Хэндофф: интегрировать дизайн-прототип NexTalk в реальное приложение

> Скопируйте всё ниже и передайте агенту-разработчику (Claude Code,
> Cursor, или другому), который имеет доступ к репозиторию NexTalk.
> Он сам прочитает прототип и план работ, и реализует пошагово.

---

## Твоя миссия

Интегрировать дизайн-прототип нового чата NexTalk
(`chat.html` + `chat-*.jsx` + `chat-*.css` + `gap.html` в корне дизайн-проекта)
в реальное приложение NexTalk (`src/web/` — React 18 + TypeScript + Vite +
SCSS modules + Redux Toolkit + SignalR + LiveKit).

Цель: фронт выглядит **точно как в прототипе**, работает на **реальном
бэкенде**, а в местах, где прототип показывает новые фичи (реакции, треды,
mentions, edit, pin, поиск, inbox, typing, extended presence, channel topic) —
ты по `gap.html` либо доводишь до рабочей фичи (если volna 1 — лёгкие),
либо оставляешь честную заглушку с TODO, ссылкой на пункт gap-документа
и фиче-флагом.

**Никакой ложной функциональности.** Если кнопка нарисована — она либо
работает, либо явно `disabled` с tooltip «доступно после ...».
Любая мокнутая логика — за фиче-флагом.

---

## Проект в двух словах

NexTalk — самохостимая платформа для серверов/каналов/голоса (аналог
Discord), микросервисы на .NET 9 (Guild + Messaging + Voice + WebSocket
Gateway), фронт — React SPA. Подробности в `README.md` и `docs/`.

Бизнес-функции MVP перечислены в README §5 (FR-1 ... FR-28). За рамки MVP
по README выходят: вложения, аватары, DM, OAuth, distributed Redis,
E2EE. Прототип сознательно показывает несколько фич, которых ещё нет
на бэке — гэп-документ говорит, что именно.

---

## Файлы — прочитай в этом порядке

1. **`README.md`** — особенно §4 (архитектура), §5 (FR), §6 (сервисы и их
   эндпоинты), §10 (стек фронта).
2. **`docs/schema.md`** + **`docs/schema.dbml`** — текущая схема БД.
3. **`gap.html`** в дизайн-проекте — **главный источник истины** о том,
   что есть и чего нет. Все 17 пунктов с эффортом, миграциями, эндпоинтами,
   WS-событиями. План работ в секции «Дорожная карта».
4. **`src/web/src/`** — текущий фронт. Читай в таком порядке:
   - `shared/styles/variables.scss`, `global.scss`, `mixins.scss` — токены
   - `shared/components/` — Button, Input, Icon, GradientBackground, Layout
   - `shared/slices/` — `chatSlice`, `channelSlice`, `serverSlice`, `memberSlice`, `voiceSlice`, `authSlice`, `inviteSlice`
   - `shared/hooks/useSignalR`, `signalRContext`, `useGatewayEvents`, `useVoice`
   - `processes/` — axios-инстанс и REST-вызовы
   - `modules/channels/pages/ChannelChatPage.tsx` — каркас текущего чата
   - `modules/chat/components/` — Message, MessageInput, MessageList
   - `modules/voice/pages/VoiceChannelPage.tsx` и `components/`
   - `modules/auth/`, `modules/servers/`, `modules/members/`, `modules/invite/`
5. **Дизайн-прототип** (в этом проекте, тот, что я тебе передал):
   - `chat.html` — точка входа
   - `chat-data.jsx` — все моковые данные (это твой словарь:
     что-куда мапить из реальных слайсов)
   - `chat-shell.jsx` — ServerRail, ChannelSidebar, TopBar, MembersRail
   - `chat-content.jsx` — Message, Composer, ChatView, CmdMenu (slash + @ menu),
     CodeBlock с подсветкой
   - `chat-views.jsx` — VoiceStage, RightRail и его вкладки (threads, pinned,
     search, inbox)
   - `chat-app.jsx` — корневая App + Tweaks
   - `chat.css` + `chat-views.css` — стили
6. **`docs/api-documentation.md`** — формат и контракты эндпоинтов.

---

## Что считается «готово»

1. `ChannelChatPage.tsx` визуально эквивалентен `chat.html` при тех же
   данных. Никаких видимых отличий в layout, типографике, отступах,
   ховерах, состояниях.
2. Все существующие FR (FR-1 ... FR-28) работают на реальном бэке через
   уже существующие slice'ы и SignalR — без mock-данных.
3. Каждая «новая» фича из `gap.html` либо реализована полностью (бэк +
   фронт), либо скрыта за фиче-флагом и помечена TODO с явной ссылкой
   `// FEATURE-GAP: <номер пункта gap.html>` в комментарии.
4. Никакого мёртвого CSS, никаких заглушечных кнопок, которые ничего
   не делают и не задизейблены.
5. Lint, type-check, build проходят. Существующие тесты зелёные.

---

## План работ

Делай **итеративно**, по волнам из дорожной карты `gap.html`. Не пытайся
сделать всё сразу — после каждой волны останавливайся, показывай результат,
жди фидбэка.

### Этап 0 — Подготовка (~0.5 дня)

- Перенеси токены палитры из `chat.css` (`:root`) в
  `shared/styles/variables.scss`. Сохрани все существующие переменные.
  Новые добавь без замены — `$bg-3`, `$bg-4`, `$bg-5`, `$bd-1..3`, `$mention`,
  `$ok`, `$warn`, `$live`, `$info` и т.д.
- Подключи шрифты Space Grotesk + Manrope + JetBrains Mono через
  `@import` в `global.scss` или через ссылку в `index.html`.
- Добавь утилитарные миксины в `mixins.scss` (chip, dot, avatar,
  scrollbar — есть в прототипе).
- Прогоны: `npm run build` зелёный.

### Этап 1 — Layout shell (~1 день)

Сделай 4-колоночный layout:
`ServerRail | ChannelSidebar | (TopBar + main) | RightRail`.

- Перепиши `ServerSidebar.tsx` → визуал из `ServerRail` в `chat-shell.jsx`.
  Данные — `useAppSelector(state => state.server.servers)`.
  Активная гильдия — из роута `:serverId`.
- Перепиши `ChannelSidebar.tsx`. Категории «текстовые» / «голосовые»
  свёрнутые/развёрнутые в `useState`. Live-индикатор и unread-bagdes —
  пока **визуальные заглушки** (вернёмся в Этап 4).
- `TopBar.tsx` — новый компонент. `channelName` и (новое поле) `topic` —
  из `channelSlice`. Поле `topic` появится в gap-пункте 07; пока — `""`.
  Action-иконки (треды/закреп/inbox/участники) рендерятся, но переключают
  только `state.rightView` — содержимое подключим в Этап 3.
- `MembersRail.tsx` — отдельная панель в правом райле, использует
  `memberSlice`. Группы по ролям + presence-точка.
  Activity text (`«в Pair programming»`) пока пусто — задел под gap-пункт 10.
- Сделай `useSignalR` соединение работающим на этой странице как раньше
  (никакой регрессии).

**Чекпойнт**: визуал shell'а совпадает с прототипом, навигация по
каналам работает, все списки на реальных данных. Сообщения и голос —
ещё нет.

### Этап 2 — Сообщения и композер (~2 дня)

Перепиши `Message.tsx`, `MessageList.tsx`, `MessageInput.tsx`. Источник
дизайна — `chat-content.jsx`.

- `Message`: группировка по автору, role-badge (Owner/Admin/Bot),
  hover-bar (только реальные действия: ответить, удалить — остальные
  скрыть до фичи-флага).
  - `renderRich()` (см. `chat-content.jsx`) — оставь как есть, обогащает
    текст mentions/каналами/кодом. Безопасный парсинг, без `dangerouslySetInnerHTML`
    кроме поиска.
  - `CodeBlock` с подсветкой — оставь.
- `Composer`: auto-grow textarea, кнопки `attach`, `@`, `gif`, `emoji`,
  `send`. Кнопки `bold`, `code` пока косметические (фокус и применяют
  префикс/обёртку в тексте — это чисто клиентское).
  - Slash-меню `/` → клиентские команды только. На каждый item — TODO с
    пунктом gap-доки 11.
  - @-меню — рендерим из `memberSlice`. Вставка имени в текст работает.
    Бэкенда mentions нет (gap 05) — это пока **визуальная** функция.
- Отправка: `connection.invoke('SendMessage', channelId, text, crypto.randomUUID())`
  как сейчас в `ChannelChatPage.tsx`. Аттачи/реакции/треды/edit —
  **не отправляются** (gap 01, 03, 04, 16).
- Новые сообщения через `useGatewayEvents` → `message.created` →
  `chatSlice`. Анимация появления (см. `.is-new` в `chat-views.css`).

**Чекпойнт**: реальный чат работает на реальном SignalR. Текст +
группировка + удаление + ответ-цитата = ОК. Реакции/треды/edit
видны в UI пустыми/задизейбленными.

### Этап 3 — Right Rail (~1 день)

`RightRail.tsx` с 5 вкладками: Members / Threads / Pinned / Search / Inbox.

- Members — работает (gap 15: hover card можно сделать сразу, данных
  достаточно).
- Threads / Pinned / Inbox — пустые состояния с TODO и ссылкой на
  gap 03, 06, 13.
- Search — поле ввода работает локально (фильтрует уже загруженные
  сообщения через `.includes()`), серверный поиск — TODO gap 12.

### Этап 4 — Voice Stage (~1–2 дня)

Перепиши `VoiceChannelPage.tsx` под `VoiceStage` из `chat-views.jsx`.

- Сетка плиток на `useVoice().participants`.
- Speaking detection — из `LiveKitRoom` event `activeSpeakersChanged`
  (нужно расширить `useVoice` если ещё не пробрасывает).
- Self-controls (mic/headset/camera/screen/leave). Mic и leave работают
  как сейчас. Camera/screen — TODO gap 17 если бэк не выдаёт grants
  на video/screen_share.
- Waveform + glow вокруг говорящего — чистый CSS, без бэка.

### Этап 5 — Wave 1 features из gap (~3–5 дней)

Только то, что не требует серьёзной БД:

- **gap 07 — Channel topic**. Миграция `alter table guild.channels
  add column topic varchar(1024) null`. Контроллер
  `PATCH /api/guilds/{guildId}/channels/{channelId}`. WS-событие
  `channel.updated`. На фронте — `TopBar` уже готов.
- **gap 04 — Edit message**. Миграция в `messaging.messages`. Контроллер
  `PATCH /api/messages/{id}`. WS `message.edited`. Frontend — раскрой
  кнопку edit в hover-bar; редактирование на месте, inline-textarea.
- **gap 08 — Typing**. SignalR client method `Typing(channelId)` →
  Hub-метод → broadcast. In-memory TTL в WS Gateway. Без БД.
  Frontend — диспатчить throttled (1/sec) при изменениях в textarea.
- **gap 10 — Extended presence** (без БД, in-memory): `SetPresence`
  hub-метод, payload в `presence.online` расширен полями `status` и
  `customText`. UI: dropdown в `SelfStatus` (online/idle/dnd).
- **gap 17 — VAD + screen share UI**: только если LiveKit token-grants
  уже разрешают video/screen.

**После каждого этапа** — пиши краткий changelog и жди ОК.

### Этапы 6–7 — Wave 2/3

Делай по дорожной карте `gap.html` строго в указанном порядке.
Reactions → Mentions → Pin → Unread → Threads → Search → Inbox.
Каждая фича — отдельная ветка/PR.

---

## Маппинг: что брать из прототипа vs из реального кода

| Прототип | Реальный код |
|---|---|
| `CHAT_DATA.servers` | `state.server.servers` (`serverSlice`) |
| `CHAT_DATA.channels.text/voice` | `state.channels.channels` (`channelSlice`), `type: 'text'\|'voice'` |
| `CHAT_DATA.members` | `state.member.members` (`memberSlice`) |
| `CHAT_DATA.messages` | `state.chat.messages[channelId].items` (`chatSlice`) |
| `CHAT_DATA.guildMeta` | Поле гильдии из `serverSlice`. `members.length` + presence-агрегация |
| `CHAT_DATA.slashCommands` | Захардкоженный массив в новом `useSlashCommands.ts` |
| `CHAT_DATA.emojis` | Захардкоженный массив, доставать топ-10 из localStorage по частоте использования (опционально) |
| `CHAT_DATA.pinned/threads/search/inbox` | **Заглушки** — оставить пустыми с TODO до gap 03/06/12/13 |
| `chat-data.jsx → avatarBg(hue)` | Перенеси в `shared/utils/avatar.ts`. Hue считай детерминированно из `userId` hash |
| `chat-data.jsx → getAuthor(id)` | Селектор `selectMemberById` |

## Правила, по которым ты пишешь код

- **TypeScript строгий**, никаких `any`. Все DTO из `shared/types/`.
- **SCSS modules** для всего нового. Один компонент = один `.module.scss`.
- **Никаких inline-стилей**, кроме генерируемых (avatar gradient по hue).
- **Иконки** — используй существующий `shared/components/Icon/Icon.tsx`.
  Если нужна новая иконка — **добавь её в `Icon.tsx`**, не вставляй
  inline SVG в компонент.
- Все новые React-компоненты — функциональные с типизированными пропсами.
- Импорты — относительные, как уже принято в репо.
- Никаких новых зависимостей без обоснования. Полнотекстовый поиск — на
  Postgres FTS (см. gap 12), а не отдельный Elasticsearch на фронт.
- Структура папок: новые компоненты кладёшь в соответствующий
  `modules/<domain>/components/`. Шейр — в `shared/`. Не плоди дубли.
- Все строки в UI — на русском, как в существующих компонентах.
- **Никаких эмодзи в кодовой базе** кроме как в `slashCommands.ts` и
  emoji-picker'е.

## Конвенции бэка

Когда пишешь .NET-код для Wave 1 миграций:

- EF Core migrations через `dotnet ef migrations add <Name>` в
  соответствующем сервисе. Имя — `<Date>_<FeatureName>`.
- DTO — отдельным классом в `Contracts/`, не примешивай к Entity.
- Контроллеры — REST согласно README §6 (правила маршрутизации /api/*).
- Health checks не трогай.
- SignalR события публикуются через Outbox, как у `message.created`
  (см. `Messaging.Service/Application/Outbox/`).
- Rate limit `[EnableRateLimiting("per-user")]` на каждый новый endpoint.
- Idempotency-Key для POST с побочкой.

## Что **запрещено**

- **Не реализуй фичи из Wave 2/3 в одном PR с интеграцией**. Сначала всё
  работает на текущем бэке, потом по одной фиче.
- **Не трогай LiveKit / Voice Service** кроме как для screen-share grants
  и активных-говорящих ивентов.
- **Не вводи новых сервисов** (Elastic, RabbitMQ, Kafka, MinIO). Они в
  backlog за рамками MVP.
- **Не меняй контракты существующих эндпоинтов несовместимо**. Только
  расширяй (новые поля optional).
- **Не делай Direct Messages** — за рамками MVP.

## Формат вывода

После каждого этапа создавай / обновляй файл `docs/integration-log.md`:

```md
## Этап N — <название>
- Сделано: <bullets>
- Скрин до/после: <если применимо>
- Что осталось как TODO: <список с пунктами gap>
- Риски / вопросы: <список>
```

## Когда сомневаешься

- Если непонятно, **что брать из прототипа vs существующего кода** —
  бери существующее. Прототип уступает реальному.
- Если в gap-документе **противоречие с README** — README важнее, gap
  это «как хотелось бы».
- Если **миграция данных нужна** — НЕ делай её сам, опиши шаги в логе
  и спроси.

---

## Резюме одной строкой

> Перенеси визуал из дизайн-прототипа `chat.html` в `src/web/src/`,
> подключи к реальным slice'ам и SignalR, для фичей из `gap.html`
> сделай Wave 1, остальное — TODO за флагами. Никакой имитации.
