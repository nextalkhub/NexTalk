/* global React */
/* Mock data for MVP app — shapes match real backend DTOs */

const APP_DATA = {
  // Current user — what JWT claims would give us (FR-04, FR-05)
  me: {
    sub: "8e1e0c12-4a55-4f3b-b2f9-9c8a7c6b4321",
    handle: "@viktoria",
    displayName: "Виктория Ю.",
    email: "viktoria@nextalk.io",
    hue: 250,
    short: "ВЮ",
    sessionId: "sess-2026-05-25-1834",
    issuedAt: "2026-05-25 18:34:12 +03:00",
    expiresAt: "2026-05-26 02:34:12 +03:00",
  },

  // Servers user belongs to (FR-12)
  servers: [
    { id: "core",  name: "NexTalk Core",  letter: "N", role: "Owner",  members: 21, online: 7,  active: true,  iconBg: "linear-gradient(135deg, #4F7CFF, #9061FF, #C254FF)" },
    { id: "design", name: "Design Guild", letter: "D", role: "Admin",  members: 14, online: 5 },
    { id: "be",    name: "Backend",       letter: "B", role: "Member", members: 38, online: 11 },
    { id: "ops",   name: "Ops & SRE",     letter: "O", role: "Member", members: 9,  online: 3 },
  ],

  // Channels for currently selected server (FR-13, FR-14)
  channels: {
    text: [
      { id: "general",  name: "общий" },
      { id: "releases", name: "релизы" },
      { id: "design",   name: "дизайн" },
      { id: "decisions", name: "решения" },
      { id: "random",   name: "рандом" },
    ],
    voice: [
      {
        id: "war",  name: "Воен. комната", users: [
          { short: "AK", name: "Анна",   hue: 282, muted: false },
          { short: "MS", name: "Михаил", hue: 218, muted: false },
          { short: "PR", name: "Полина", hue: 332, muted: false },
        ]
      },
      { id: "pair", name: "Pair programming", users: [
          { short: "IV", name: "Иван", hue: 162, muted: true },
      ]},
      { id: "afk",  name: "AFK", users: [] },
    ],
  },

  // Members of the selected server (FR-19), with roles (FR-20)
  members: [
    { id: "ak", short: "AK", name: "Анна Каренина",   handle: "@anna",   role: "Owner",  hue: 282, status: "online",  joinedAt: "2026-01-15" },
    { id: "ms", short: "MS", name: "Михаил Седов",    handle: "@mike",   role: "Admin",  hue: 218, status: "online",  joinedAt: "2026-01-15" },
    { id: "pr", short: "PR", name: "Полина Рунге",    handle: "@polina", role: "Admin",  hue: 332, status: "online",  joinedAt: "2026-02-02" },
    { id: "iv", short: "IV", name: "Иван Волков",     handle: "@ivan",   role: "Member", hue: 162, status: "online",  joinedAt: "2026-02-14" },
    { id: "do", short: "DO", name: "Дарья Орлова",    handle: "@dasha",  role: "Member", hue: 38,  status: "online",  joinedAt: "2026-03-01" },
    { id: "sp", short: "SP", name: "Семён Поляков",   handle: "@semyon", role: "Member", hue: 196, status: "online",  joinedAt: "2026-03-09" },
    { id: "ka", short: "KA", name: "Карина Аствац",   handle: "@karina", role: "Member", hue: 56,  status: "online",  joinedAt: "2026-03-20" },
    { id: "on", short: "ON", name: "Олег Никольский", handle: "@oleg",   role: "Member", hue: 256, status: "offline", joinedAt: "2026-04-05" },
    { id: "rg", short: "RG", name: "Регина Тимофеева",handle: "@regina", role: "Member", hue: 12,  status: "offline", joinedAt: "2026-04-10" },
    { id: "vk", short: "ВЮ", name: "Виктория Ю.",     handle: "@viewer", role: "Member", hue: 250, status: "online",  joinedAt: "2026-04-22", isMe: true },
  ],

  // Messages (FR-09): only the fields the MVP backend actually persists.
  // Plain text content + author + channel + createdAt + id.
  messages: [
    { id: "01HRZ001", authorId: "ak", time: "13:54", text: "Доброе утро. Сегодня катим в стейджинг, план на канбане." },
    { id: "01HRZ002", authorId: "ms", time: "13:58", text: "Я закрыл #423 (idempotency keys на cleanup), осталось проверить под нагрузкой." },
    { id: "01HRZ003", authorId: "pr", time: "14:05", text: "Нагрузочный прогнал — Outbox держит 60 msg/s, p95 = 132 ms.\nЕсли никаких возражений — мержим." },
    { id: "01HRZ004", authorId: "ak", time: "14:08", text: "Класс. Иван — добавишь это в release notes? И мерж в main после ревью." },
    { id: "01HRZ005", authorId: "iv", time: "14:09", text: "Принял. Заодно подтяну CHANGELOG из conventional commits." },
    { id: "01HRZ006", authorId: "iv", time: "14:09", text: "Команда:", code: { lang: "bash", body: "$ npx conventional-changelog-cli -p angular -i CHANGELOG.md -s -r 0" } },
    { id: "01HRZ007", authorId: "do", time: "14:12", text: "К релизу обновила changelog‑карточку и баннер на onboarding‑экране. Ссылка в Figma." },
  ],

  // Active invites (FR-15, FR-16)
  invites: [
    { code: "k4t-pony-42",  createdBy: "Анна",   createdAt: "2026-05-21", expiresAt: "2026-05-28", maxUses: 50, uses: 23 },
    { code: "next-river-7", createdBy: "Михаил", createdAt: "2026-05-23", expiresAt: "2026-06-23", maxUses: 5,  uses: 5 },
    { code: "core-onboard", createdBy: "Анна",   createdAt: "2026-05-25", expiresAt: null,         maxUses: null, uses: 4 },
  ],

  // Bans list (FR-23). user_id + reason + when + by whom.
  bans: [
    { userId: "spammer-001", displayName: "Stas Spammer",  handle: "@spammer1", hue: 12,  reason: "флуд, нецензурная брань в #общий", bannedBy: "Анна", bannedAt: "2026-05-12 14:22" },
    { userId: "bot-bad-fff", displayName: "AdsBot",        handle: "@adsbot",   hue: 198, reason: "автоматическая реклама ссылок",     bannedBy: "Михаил", bannedAt: "2026-05-08 09:01" },
  ],
};

window.APP_DATA = APP_DATA;
window.getMember = (id) => APP_DATA.members.find(m => m.id === id);
window.avatarBg = (hue) =>
  `linear-gradient(135deg, oklch(0.62 0.16 ${hue}), oklch(0.48 0.18 ${(hue + 40) % 360}))`;
