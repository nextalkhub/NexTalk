/* global React */
/* Mock data for the chat app prototype */

const CHAT_DATA = {
  servers: [
    { id: "core",   name: "NexTalk Core",  letter: "N", unread: false, mentions: 0, active: true,  banner: "linear-gradient(135deg, #4F7CFF, #9061FF, #C254FF)" },
    { id: "design", name: "Design Guild",  letter: "D", unread: true,  mentions: 2 },
    { id: "be",     name: "Backend",       letter: "B", unread: true,  mentions: 0 },
    { id: "ops",    name: "Ops & SRE",     letter: "O", unread: false, mentions: 0 },
    { id: "rd",     name: "R&D",           letter: "▲", unread: false, mentions: 0 },
    { id: "dao",    name: "Open Source",   letter: "◇", unread: false, mentions: 0 },
  ],

  guildMeta: {
    name: "NexTalk Core",
    members: 21,
    online: 7,
    description: "Команда разработки NexTalk · MVP → k3s",
  },

  channels: {
    pinned: [
      { id: "general",     name: "общий",       topic: "Общий канал для команды NexTalk Core" },
    ],
    text: [
      { id: "general",     name: "общий",        unread: 0, topic: "Общий канал для команды NexTalk Core", active: true },
      { id: "releases",    name: "релизы",       unread: 12, topic: "Чейнджлоги и анонсы" },
      { id: "design",      name: "дизайн",       unread: 0,  topic: "Макеты, фигма, ревью" },
      { id: "incidents",   name: "incident-room",unread: 3, mentions: 2, live: true, topic: "Дежурные сидят здесь · /911 чтобы позвать" },
      { id: "random",      name: "рандом",       unread: 0, topic: "Внерабочая болтовня" },
      { id: "decisions",   name: "решения",      unread: 0, topic: "ADR и архитектурные решения. Только важное." },
    ],
    voice: [
      {
        id: "war", name: "Воен. комната", users: [
          { short: "AK", name: "Анна",   hue: 282, muted: false, speaking: false },
          { short: "MS", name: "Михаил", hue: 218, muted: false, speaking: false },
          { short: "PR", name: "Полина", hue: 332, muted: false, speaking: true  },
        ], active: true
      },
      { id: "pair", name: "Pair programming", users: [
          { short: "IV", name: "Иван", hue: 162, muted: true, speaking: false },
      ]},
      { id: "afk", name: "AFK", users: [] },
    ],
  },

  members: [
    { id: "ak", short: "AK", name: "Анна Каренина",  handle: "@anna",    role: "Owner",  hue: 282, status: "online",  bio: "руководитель направления", activity: "редактирует Helm chart" },
    { id: "ms", short: "MS", name: "Михаил Седов",   handle: "@mike",    role: "Admin",  hue: 218, status: "online",  activity: "в #incident-room" },
    { id: "pr", short: "PR", name: "Полина Рунге",   handle: "@polina",  role: "Admin",  hue: 332, status: "online",  activity: "говорит в Воен. комнате" },
    { id: "iv", short: "IV", name: "Иван Волков",    handle: "@ivan",    role: "Member", hue: 162, status: "online",  activity: "в Pair programming" },
    { id: "do", short: "DO", name: "Дарья Орлова",   handle: "@dasha",   role: "Member", hue: 38,  status: "online" },
    { id: "sp", short: "SP", name: "Семён Поляков",  handle: "@semyon",  role: "Member", hue: 196, status: "idle",    activity: "AFK · 12 мин" },
    { id: "ka", short: "KA", name: "Карина Аствац",  handle: "@karina",  role: "Member", hue: 56,  status: "dnd",     activity: "не беспокоить · фокус" },
    { id: "on", short: "ON", name: "Олег Никольский",handle: "@oleg",    role: "Member", hue: 256, status: "offline" },
    { id: "rg", short: "RG", name: "Регина Тимофеева",handle: "@regina", role: "Member", hue: 12,  status: "offline" },
    { id: "bt", short: "BT", name: "release-bot",    handle: "#bot",     role: "Bot",    hue: 198, status: "online" },
  ],

  messages: [
    {
      id: "m1", authorId: "ak", time: "13:54",
      text: "Доброе утро 👋 Сегодня катим в стейджинг, план на канбане. Если есть блокеры — пишите в этот тред.",
    },
    {
      id: "m2", authorId: "ms", time: "13:58",
      text: "Я закрыл #423 (idempotency keys на cleanup), осталось проверить под нагрузкой.",
      reactions: [
        { emoji: "🚀", count: 4, mine: true },
        { emoji: "👀", count: 2, mine: false },
      ],
    },
    {
      id: "m3", authorId: "bt", time: "14:01",
      isBot: true,
      text: "Сборка messaging‑service:1.4.2 готова. Проверки CI прошли за 3m 18s.",
      attachments: [{
        kind: "link", site: "ci.nextalk.io", title: "messaging-service · pipeline #2814",
        desc: "✓ build · ✓ unit · ✓ integration · ✓ contract · ✓ helm-lint"
      }],
    },
    {
      id: "m4", authorId: "pr", time: "14:05",
      replyTo: { authorId: "ms", text: "Я закрыл #423 (idempotency keys на cleanup)..." },
      text: "Нагрузочный прогнал — Outbox держит 60 msg/s, p95 = 132 ms.",
      attachments: [{ kind: "image", label: "grafana-outbox-2026-05-25.png" }],
      reactions: [{ emoji: "✅", count: 5, mine: true }, { emoji: "🔥", count: 2 }],
      thread: { count: 4, lastTime: "только что", avatars: ["AK", "MS", "IV"] },
    },
    {
      id: "m5", authorId: "ak", time: "14:08",
      text: "Класс. @Иван — добавишь это в release notes? И мерж в main после ревью.",
      mention: "iv",
    },
    {
      id: "m6", authorId: "iv", time: "14:09",
      text: "Принял. Заодно подтяну CHANGELOG из conventional commits.",
      code: {
        lang: "bash",
        body: "$ npx conventional-changelog-cli -p angular \\\n    -i CHANGELOG.md -s -r 0",
      },
    },
    {
      id: "m7", authorId: "ms", time: "14:11", isMention: true,
      mention: "self",
      text: "@you — глянь PR #284, там твой ник в CODEOWNERS попадает на canary‑configs. Окей замержить?",
    },
    {
      id: "m8", authorId: "do", time: "14:12",
      text: "К релизу обновила changelog‑карточку и баннер на onboarding‑экране.",
      edited: true,
      reactions: [{ emoji: "🎨", count: 3 }],
    },
  ],

  pinned: [
    { ch: "общий", authorShort: "AK", author: "Анна", hue: 282, time: "вчера, 18:24", text: "Правила канала закреплены в гайде. TL;DR — без флуда, обсуждаем дело." },
    { ch: "релизы", authorShort: "BT", author: "release-bot", hue: 198, time: "пн, 09:01", text: "messaging-service:1.4.0 → production · uptime 99.94% · 0 incidents за неделю." },
  ],

  threads: [
    { id: "t1", title: "Outbox latency — почему p95 пляшет?", parent: "релизы", replies: 12, lastBy: "Полина", lastAgo: "5 мин", excerpt: "Если убрать гранулярный fsync, можем потерять at-least-once гарантию." },
    { id: "t2", title: "Кто чинит circuit breaker на Voice?", parent: "incident-room", replies: 4, lastBy: "Михаил", lastAgo: "час", excerpt: "Раз в день фолбэк уходит в OPEN из-за таймаута Guild Service." },
    { id: "t3", title: "Дизайн composer'a v3", parent: "дизайн", replies: 27, lastBy: "Дарья", lastAgo: "2 ч", excerpt: "Сделала пайплайн загрузки файлов с превью на drop-сенсор. Гляньте Figma." },
  ],

  search: [
    { ch: "общий", author: "Анна", hue: 282, time: "вчера", excerpt: "...держит **60 msg/s** без капельки потерь.", short: "AK" },
    { ch: "релизы", author: "release-bot", hue: 198, time: "вчера", excerpt: "...messaging-service:1.4.1 → **production**", short: "BT" },
    { ch: "incident-room", author: "Михаил", hue: 218, time: "3 дн.", excerpt: "...настроил алерт **>5 ошибок за 30s** в Prometheus.", short: "MS" },
  ],

  inbox: [
    { kind: "mention",  ch: "релизы",        time: "5 мин",  from: "Анна",   excerpt: "@you — глянь PR #284, там твой ник в CODEOWNERS..." },
    { kind: "thread",   ch: "incident-room", time: "15 мин", from: "Полина", excerpt: "Новый ответ в треде «Outbox latency...»" },
    { kind: "reaction", ch: "общий",         time: "1 ч",    from: "Михаил", excerpt: "Реакция 🚀 на ваше сообщение." },
  ],

  slashCommands: [
    { cmd: "/911",        desc: "позвать дежурного в этот канал", kbd: "Enter" },
    { cmd: "/poll",       desc: "опрос с реакциями",  kbd: "Enter" },
    { cmd: "/giphy",      desc: "вставить gif",       kbd: "Enter" },
    { cmd: "/code",       desc: "блок кода с подсветкой", kbd: "Enter" },
    { cmd: "/remind",     desc: "напоминание для канала или себя", kbd: "Enter" },
    { cmd: "/incident",   desc: "открыть инцидент-канал из шаблона", kbd: "Enter" },
  ],

  emojis: ["👍", "❤️", "🚀", "✅", "👀", "🔥", "🎉", "🤔", "💡", "👏"],
};

window.CHAT_DATA = CHAT_DATA;

/* Helpers */

window.getAuthor = (id) => CHAT_DATA.members.find(m => m.id === id) || null;
window.avatarBg = (hue) =>
  `linear-gradient(135deg, oklch(0.62 0.16 ${hue}), oklch(0.48 0.18 ${(hue + 40) % 360}))`;
window.initials = (name) =>
  name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
