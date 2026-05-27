/* global React, APP_DATA, getMember, avatarBg, Avatar, I */
/* Settings: server settings (Overview/Channels/Members/Invites/Bans/Danger),
   App settings, Profile. All bounded to actual backend FRs. */

function SettingsLayout({ nav, activeId, onSelect, header, children }) {
  return (
    <div className="settings-layout">
      <nav className="settings-nav">
        {nav.map((section, si) => (
          <React.Fragment key={si}>
            <div className="settings-nav-h">{section.label}</div>
            {section.items.map(item => (
              <button
                key={item.id}
                className={"settings-nav-item" +
                  (item.id === activeId ? " is-active" : "") +
                  (item.danger ? " is-danger" : "")}
                onClick={() => onSelect(item.id)}
              >
                <span style={{ width: 16 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
            {si < nav.length - 1 && <div style={{ height: 16 }} />}
          </React.Fragment>
        ))}
      </nav>
      <div className="settings-content">
        {header && (
          <div className="settings-section-head">
            <h1>{header.title}</h1>
            {header.subtitle && <p>{header.subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ====== Server Settings ====== */
function ServerSettings({ server, onClose, onDeleteServer, onCreateChannel, onCreateInvite, onKick, onBan }) {
  const [view, setView] = React.useState("overview");

  const nav = [
    {
      label: server.name,
      items: [
        { id: "overview", label: "Обзор",       icon: <I.Home /> },
        { id: "channels", label: "Каналы",      icon: <I.Hash /> },
        { id: "members",  label: "Участники",   icon: <I.Users /> },
        { id: "invites",  label: "Приглашения", icon: <I.Link /> },
        { id: "bans",     label: "Баны",        icon: <I.Hammer /> },
      ],
    },
    {
      label: "опасная зона",
      items: [
        { id: "danger", label: "Удалить сервер", icon: <I.Trash />, danger: true },
      ],
    },
  ];

  return (
    <>
      <div className="top">
        <div className="top-left">
          <div className="top-breadcrumb">
            <span className="crumb-server">{server.name}</span>
            <span className="crumb-sep"><I.ChevRight /></span>
            <span className="crumb-channel"><I.Gear />Настройки</span>
          </div>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={onClose} title="Закрыть"><I.X /></button>
        </div>
      </div>
      <div className="main">
        <SettingsLayout nav={nav} activeId={view} onSelect={setView}>
          {view === "overview"  && <ServerOverview server={server} />}
          {view === "channels"  && <ServerChannels onCreate={onCreateChannel} />}
          {view === "members"   && <ServerMembers onKick={onKick} onBan={onBan} />}
          {view === "invites"   && <ServerInvites onCreate={onCreateInvite} />}
          {view === "bans"      && <ServerBans />}
          {view === "danger"    && <ServerDanger server={server} onDelete={onDeleteServer} />}
        </SettingsLayout>
      </div>
    </>
  );
}
window.ServerSettings = ServerSettings;

function ServerOverview({ server }) {
  const [name, setName] = React.useState(server.name);
  return (
    <>
      <div className="settings-section-head">
        <h1>Обзор сервера</h1>
        <p>Базовые свойства сервера. Изменения применяются ко всем участникам сразу.</p>
      </div>

      <div className="settings-field">
        <label className="settings-label">Название сервера</label>
        <input
          className="settings-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
        />
        <div className="settings-help">
          От 3 до 100 символов. Использует все каналы и приглашения.
        </div>
      </div>

      <div className="settings-field">
        <label className="settings-label">Идентификатор сервера</label>
        <div className="ro-field">
          <span>guild-{server.id}-3f9c-4a55-b2f9-9c8a7c6b4321</span>
          <button className="copy-ic" title="Скопировать"><I.Copy /></button>
        </div>
        <div className="settings-help">Используется в API‑вызовах · <code className="mono" style={{ fontSize: 11 }}>GET /api/guilds/{`{id}`}</code>.</div>
      </div>

      <div className="settings-field">
        <label className="settings-label">Владелец</label>
        <div className="ro-field">
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar short="AK" hue={282} size={22} />
            Анна Каренина · @anna
          </span>
          <span className="chip mono">Owner · нельзя изменить</span>
        </div>
        <div className="settings-help">Передача владения вне рамок MVP — обратитесь к администратору инфраструктуры.</div>
      </div>

      <div className="settings-actions">
        <button className="btn-cancel">Отмена</button>
        <button className="btn-save">Сохранить</button>
      </div>
    </>
  );
}

function ServerChannels({ onCreate }) {
  const allChannels = [
    ...APP_DATA.channels.text.map(c => ({ ...c, type: "text" })),
    ...APP_DATA.channels.voice.map(c => ({ ...c, type: "voice" })),
  ];
  return (
    <>
      <div className="settings-section-head">
        <h1>Каналы</h1>
        <p>Создание и удаление каналов · {`POST /api/guilds/{id}/channels`} · <code className="mono" style={{ fontSize: 11 }}>DELETE /api/channels/{`{id}`}</code></p>
      </div>

      <div className="list-toolbar">
        <div className="left">
          <span style={{ color: "var(--fg-2)", fontSize: 13 }}>
            <b style={{ color: "var(--fg-0)" }}>{allChannels.length}</b> каналов · <b style={{ color: "var(--fg-0)" }}>{APP_DATA.channels.text.length}</b> текстовых, <b style={{ color: "var(--fg-0)" }}>{APP_DATA.channels.voice.length}</b> голосовых
          </span>
        </div>
        <button className="btn-add" onClick={onCreate}>
          <I.Plus /> Создать канал
        </button>
      </div>

      <div className="data-table">
        <div className="dt-head dt-channels">
          <span>Канал</span>
          <span>Тип</span>
          <span>Создан</span>
          <span style={{ justifySelf: "end" }}>Действия</span>
        </div>
        {allChannels.map(c => (
          <div key={c.id} className="dt-row dt-channels">
            <div className="ch-cell">
              <span className="ch-ic">
                {c.type === "voice" ? <I.Speaker /> : <I.Hash />}
              </span>
              <span className="nm">{c.name}</span>
            </div>
            <span>
              <span className={"ch-type-pill " + c.type}>
                {c.type === "voice" ? "голосовой" : "текстовый"}
              </span>
            </span>
            <span className="joined-cell">2026‑01‑15</span>
            <div className="row-actions">
              <button className="row-action-btn is-danger" title="Удалить канал">
                <I.Trash />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ServerMembers({ onKick, onBan }) {
  const [filter, setFilter] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const filtered = APP_DATA.members.filter(m => {
    if (filter && !m.name.toLowerCase().includes(filter.toLowerCase()) && !m.handle.toLowerCase().includes(filter.toLowerCase())) return false;
    if (roleFilter !== "all" && m.role.toLowerCase() !== roleFilter) return false;
    return true;
  });

  return (
    <>
      <div className="settings-section-head">
        <h1>Участники</h1>
        <p>Управление ролями, кики и баны · <code className="mono" style={{ fontSize: 11 }}>PATCH /api/guilds/{`{id}`}/members/{`{userId}`}/role</code> · <code className="mono" style={{ fontSize: 11 }}>DELETE /api/guilds/{`{id}`}/members/{`{userId}`}</code></p>
      </div>

      <div className="list-toolbar">
        <div className="left">
          <div className="list-search">
            <I.Users />
            <input
              placeholder="Поиск по имени или handle"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <button
            className="list-filter"
            onClick={() => {
              const order = ["all", "owner", "admin", "member"];
              const idx = order.indexOf(roleFilter);
              setRoleFilter(order[(idx + 1) % order.length]);
            }}
          >
            Роль: <b style={{ color: "var(--fg-0)" }}>{roleFilter === "all" ? "все" : roleFilter}</b>
            <I.ChevDown />
          </button>
        </div>
        <span style={{ fontSize: 13, color: "var(--fg-2)" }}>
          <b style={{ color: "var(--fg-0)" }}>{filtered.length}</b> из {APP_DATA.members.length}
        </span>
      </div>

      <div className="data-table">
        <div className="dt-head dt-members">
          <span>Участник</span>
          <span>Роль</span>
          <span>Вступил</span>
          <span style={{ justifySelf: "end" }}>Действия</span>
        </div>
        {filtered.map(m => (
          <div key={m.id} className="dt-row dt-members">
            <div className="nm-cell">
              <Avatar short={m.short} hue={m.hue} size={32} />
              <div className="stack">
                <div className="nm">
                  {m.name}
                  {m.isMe && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--brand-1)", fontFamily: "var(--font-mono)" }}>(вы)</span>}
                </div>
                <div className="hn">{m.handle}</div>
              </div>
            </div>
            <div>
              <span className={"role-pill " + m.role.toLowerCase()}>
                <span className="dot-r" />
                {m.role}
                {m.role !== "Owner" && <span className="ch"><I.ChevDown /></span>}
              </span>
            </div>
            <div className="joined-cell">{m.joinedAt}</div>
            <div className="row-actions">
              {m.role !== "Owner" && !m.isMe && (
                <>
                  <button className="row-action-btn" title="Кикнуть" onClick={() => onKick(m)}>
                    <I.Boot />
                  </button>
                  <button className="row-action-btn is-danger" title="Забанить" onClick={() => onBan(m)}>
                    <I.Hammer />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ServerInvites({ onCreate }) {
  const isActive = (inv) => {
    if (inv.expiresAt && new Date(inv.expiresAt) < new Date("2026-05-25")) return false;
    if (inv.maxUses && inv.uses >= inv.maxUses) return false;
    return true;
  };

  return (
    <>
      <div className="settings-section-head">
        <h1>Приглашения</h1>
        <p>Гибкие ссылки с TTL и лимитом использований · <code className="mono" style={{ fontSize: 11 }}>POST /api/guilds/{`{id}`}/invites</code> · <code className="mono" style={{ fontSize: 11 }}>POST /api/invites/{`{code}`}/accept</code></p>
      </div>

      <div className="list-toolbar">
        <div className="left">
          <span style={{ fontSize: 13, color: "var(--fg-2)" }}>
            <b style={{ color: "var(--fg-0)" }}>{APP_DATA.invites.filter(isActive).length}</b> активных, <b style={{ color: "var(--fg-2)" }}>{APP_DATA.invites.filter(i => !isActive(i)).length}</b> исчерпанных
          </span>
        </div>
        <button className="btn-add" onClick={onCreate}>
          <I.Plus /> Создать приглашение
        </button>
      </div>

      <div className="data-table">
        <div className="dt-head dt-invites">
          <span>Код</span>
          <span>Создал</span>
          <span>Использования</span>
          <span>Действует до</span>
          <span style={{ justifySelf: "end" }}>Действия</span>
        </div>
        {APP_DATA.invites.map(inv => {
          const active = isActive(inv);
          const pct = inv.maxUses ? Math.min(100, (inv.uses / inv.maxUses) * 100) : 0;
          return (
            <div key={inv.code} className="dt-row dt-invites" style={!active ? { opacity: 0.5 } : null}>
              <div className="invite-code-cell">
                <span>nextalk.io/invite/{inv.code}</span>
                <button className="invite-code-copy" title="Скопировать"><I.Copy /></button>
              </div>
              <span style={{ fontSize: 13 }}>{inv.createdBy}</span>
              <div>
                <div className="uses-cell">{inv.uses} / {inv.maxUses || "∞"}</div>
                {inv.maxUses && (
                  <div className="uses-bar">
                    <div className="uses-fill" style={{ width: pct + "%" }} />
                  </div>
                )}
              </div>
              <span className="joined-cell">{inv.expiresAt || "бессрочно"}</span>
              <div className="row-actions">
                <button className="row-action-btn is-danger" title="Отозвать">
                  <I.X />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ServerBans() {
  return (
    <>
      <div className="settings-section-head">
        <h1>Баны</h1>
        <p>Список заблокированных аккаунтов · <code className="mono" style={{ fontSize: 11 }}>GET /api/guilds/{`{id}`}/bans</code> · <code className="mono" style={{ fontSize: 11 }}>DELETE /api/guilds/{`{id}`}/bans/{`{userId}`}</code></p>
      </div>

      {APP_DATA.bans.length === 0 ? (
        <div className="empty-table-state">
          <div className="ic-blob"><I.Shield /></div>
          <div className="h">В сервере нет банов</div>
          <div className="p">Это хорошие новости.</div>
        </div>
      ) : (
        <div className="data-table">
          <div className="dt-head dt-bans">
            <span>Пользователь</span>
            <span>Причина</span>
            <span>Забанил</span>
            <span style={{ justifySelf: "end" }}>Действия</span>
          </div>
          {APP_DATA.bans.map(b => (
            <div key={b.userId} className="dt-row dt-bans">
              <div className="nm-cell">
                <Avatar short={b.displayName.split(" ").map(p => p[0]).join("").slice(0, 2)} hue={b.hue} size={32} />
                <div className="stack">
                  <div className="nm" style={{ color: "var(--fg-0)" }}>{b.displayName}</div>
                  <div className="hn">{b.handle}</div>
                </div>
              </div>
              <div className="reason">{b.reason}</div>
              <div>
                <div style={{ fontSize: 13 }}>{b.bannedBy}</div>
                <div className="hn">{b.bannedAt}</div>
              </div>
              <div className="row-actions">
                <button className="row-action-btn" title="Разбанить">
                  <I.Refresh />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ServerDanger({ server, onDelete }) {
  return (
    <>
      <div className="settings-section-head">
        <h1>Опасная зона</h1>
        <p>Необратимые действия. Подумайте дважды.</p>
      </div>

      <div className="danger-card">
        <h3>Удалить сервер «{server.name}»</h3>
        <p>
          Все каналы, сообщения, приглашения и баны будут удалены безвозвратно.
          Участники будут отключены немедленно. Операция выполняется через
          <code className="mono" style={{ fontSize: 11, marginLeft: 4 }}>DELETE /api/guilds/{`{id}`}</code>
          и доступна только владельцу.
        </p>
        <button className="btn-danger" onClick={onDelete}>Удалить навсегда</button>
      </div>
    </>
  );
}

/* ====== App Settings (client-side preferences only) ====== */
function AppSettings({ onClose, tweaks, setTweak, palettes }) {
  const [view, setView] = React.useState("appearance");

  const nav = [
    {
      label: "приложение",
      items: [
        { id: "appearance",    label: "Внешний вид",   icon: <I.Gear /> },
        { id: "audio",         label: "Звук",          icon: <I.Mic /> },
        { id: "notifications", label: "Уведомления",   icon: <I.Users /> },
      ],
    },
    {
      label: "сессия",
      items: [
        { id: "session", label: "Сессия и токены", icon: <I.Shield /> },
        { id: "logout",  label: "Выйти из аккаунта", icon: <I.Logout />, danger: true },
      ],
    },
  ];

  return (
    <>
      <div className="top">
        <div className="top-left">
          <div className="top-breadcrumb">
            <span className="crumb-channel"><I.Gear />Настройки приложения</span>
          </div>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={onClose} title="Закрыть"><I.X /></button>
        </div>
      </div>

      <div className="main">
        <SettingsLayout nav={nav} activeId={view} onSelect={(id) => {
          if (id === "logout") window.__route("auth-logout-confirm");
          else setView(id);
        }}>
          {view === "appearance"    && <AppearanceSettings tweaks={tweaks} setTweak={setTweak} palettes={palettes} />}
          {view === "audio"         && <AudioSettings />}
          {view === "notifications" && <NotificationSettings />}
          {view === "session"       && <SessionSettings />}
        </SettingsLayout>
      </div>
    </>
  );
}
window.AppSettings = AppSettings;

function AppearanceSettings({ tweaks, setTweak, palettes }) {
  return (
    <>
      <div className="settings-section-head">
        <h1>Внешний вид</h1>
        <p>Настройки клиента. Хранятся локально, на бэк не отправляются.</p>
      </div>

      <div className="settings-field">
        <label className="settings-label">Цветовая схема</label>
        <div className="radio-cards">
          {Object.entries(palettes).map(([key, p]) => (
            <div
              key={key}
              className={"radio-card" + (tweaks.palette === key ? " is-selected" : "")}
              onClick={() => setTweak("palette", key)}
            >
              <div className="ic" style={{ background: p["--grad-brand"] || "var(--grad-brand)" }} />
              <div className="name">{p.label}</div>
              <div className="desc">{p.desc || "—"}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-row">
        <div className="info">
          <div className="info-h">Плотность интерфейса</div>
          <div className="info-s">Расстояние между элементами в каналах и списках.</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["cozy", "comfortable", "airy"].map(d => (
            <button
              key={d}
              onClick={() => setTweak("density", d)}
              className={"chip" + (tweaks.density === d ? " is-brand" : "")}
              style={{ cursor: "pointer", padding: "4px 12px", height: 28 }}
            >
              {d === "cozy" ? "Cozy" : d === "comfortable" ? "Обычная" : "Воздушная"}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-row">
        <div className="info">
          <div className="info-h">Размер шрифта</div>
          <div className="info-s">Текущее значение: {(tweaks.fontScale * 100).toFixed(0)}%. Влияет на весь интерфейс.</div>
        </div>
        <input
          type="range"
          min="0.9" max="1.15" step="0.01"
          value={tweaks.fontScale}
          onChange={(e) => setTweak("fontScale", parseFloat(e.target.value))}
          style={{ width: 160 }}
        />
      </div>
    </>
  );
}

function AudioSettings() {
  return (
    <>
      <div className="settings-section-head">
        <h1>Звук</h1>
        <p>Настройки микрофона и наушников для голосовых каналов.</p>
      </div>

      <div className="settings-field">
        <label className="settings-label">Микрофон</label>
        <select className="settings-select" defaultValue="default">
          <option value="default">Системный (по умолчанию)</option>
          <option value="airpods">AirPods Pro</option>
          <option value="webcam">USB Webcam Mic</option>
        </select>
        <div className="settings-help">Используется LiveKit‑клиентом при подключении к голосовому каналу.</div>
      </div>

      <div className="settings-field">
        <label className="settings-label">Наушники / выход</label>
        <select className="settings-select" defaultValue="default">
          <option value="default">Системный (по умолчанию)</option>
          <option value="airpods">AirPods Pro</option>
          <option value="speakers">Колонки</option>
        </select>
      </div>

      <div className="settings-row">
        <div className="info">
          <div className="info-h">Эхоподавление</div>
          <div className="info-s">Обрабатывается в браузере · acousticEchoCancellation.</div>
        </div>
        <div className="toggle is-on" onClick={(e) => e.currentTarget.classList.toggle("is-on")} />
      </div>
      <div className="settings-row">
        <div className="info">
          <div className="info-h">Шумоподавление</div>
          <div className="info-s">Обрабатывается в браузере · noiseSuppression.</div>
        </div>
        <div className="toggle is-on" onClick={(e) => e.currentTarget.classList.toggle("is-on")} />
      </div>
      <div className="settings-row">
        <div className="info">
          <div className="info-h">Push‑to‑talk</div>
          <div className="info-s">По умолчанию микрофон в режиме voice activation. Включите для PTT.</div>
        </div>
        <div className="toggle" onClick={(e) => e.currentTarget.classList.toggle("is-on")} />
      </div>
    </>
  );
}

function NotificationSettings() {
  return (
    <>
      <div className="settings-section-head">
        <h1>Уведомления</h1>
        <p>Браузерные уведомления о новых сообщениях. Серверные пуш‑уведомления — за рамками MVP.</p>
      </div>

      <div className="settings-row">
        <div className="info">
          <div className="info-h">Показывать desktop‑уведомления</div>
          <div className="info-s">Требует разрешения от браузера на Notification API.</div>
        </div>
        <div className="toggle is-on" onClick={(e) => e.currentTarget.classList.toggle("is-on")} />
      </div>
      <div className="settings-row">
        <div className="info">
          <div className="info-h">Звук при новом сообщении</div>
          <div className="info-s">Только если вкладка неактивна.</div>
        </div>
        <div className="toggle" onClick={(e) => e.currentTarget.classList.toggle("is-on")} />
      </div>
      <div className="settings-row">
        <div className="info">
          <div className="info-h">Тихие часы</div>
          <div className="info-s">В этом диапазоне уведомления приходят без звука.</div>
        </div>
        <span style={{ color: "var(--fg-2)", fontSize: 13 }}>22:00 — 09:00 (UTC+3)</span>
      </div>
    </>
  );
}

function SessionSettings() {
  return (
    <>
      <div className="settings-section-head">
        <h1>Сессия и токены</h1>
        <p>Информация о текущей JWT‑сессии. Управление аккаунтом — в Zitadel.</p>
      </div>

      <div className="settings-field">
        <label className="settings-label">Идентификатор сессии</label>
        <div className="ro-field">
          <span>{APP_DATA.me.sessionId}</span>
          <button className="copy-ic"><I.Copy /></button>
        </div>
      </div>

      <div className="settings-field">
        <label className="settings-label">User ID (sub)</label>
        <div className="ro-field">
          <span>{APP_DATA.me.sub}</span>
          <button className="copy-ic"><I.Copy /></button>
        </div>
      </div>

      <div className="settings-row">
        <div className="info">
          <div className="info-h">Выдан</div>
        </div>
        <span className="mono" style={{ fontSize: 13, color: "var(--fg-1)" }}>{APP_DATA.me.issuedAt}</span>
      </div>
      <div className="settings-row">
        <div className="info">
          <div className="info-h">Истекает</div>
        </div>
        <span className="mono" style={{ fontSize: 13, color: "var(--fg-1)" }}>{APP_DATA.me.expiresAt}</span>
      </div>

      <div className="settings-row">
        <div className="info">
          <div className="info-h">Управление аккаунтом</div>
          <div className="info-s">Смена пароля, email, 2FA, аватар — в Zitadel. NexTalk эти данные не хранит.</div>
        </div>
        <a href="#" className="profile-zitadel-btn">
          <I.ArrowOut />Открыть Zitadel
        </a>
      </div>
    </>
  );
}

/* ====== Profile (read-only from JWT) ====== */
function ProfilePage({ onClose }) {
  return (
    <>
      <div className="top">
        <div className="top-left">
          <div className="top-breadcrumb">
            <span className="crumb-channel"><I.Users />Профиль</span>
          </div>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={onClose}><I.X /></button>
        </div>
      </div>
      <div className="main">
        <div className="profile-shell">
        <div className="profile-card-big">
          <div className="profile-banner-big" />
          <div className="profile-head">
            <span className="profile-av" style={{ background: avatarBg(APP_DATA.me.hue) }}>
              {APP_DATA.me.short}
            </span>
            <div className="info">
              <div className="nm">{APP_DATA.me.displayName}</div>
              <div className="hn">{APP_DATA.me.handle}</div>
            </div>
          </div>
          <div className="profile-body">
            <div className="profile-field">
              <span className="lbl">email</span>
              <span className="val">{APP_DATA.me.email}</span>
            </div>
            <div className="profile-field">
              <span className="lbl">user id (sub)</span>
              <span className="val" style={{ fontSize: 11 }}>{APP_DATA.me.sub}</span>
            </div>
            <div className="profile-field">
              <span className="lbl">источник</span>
              <span className="val">
                <span className="chip is-brand" style={{ marginRight: 6 }}>Zitadel · OIDC</span>
                управляется в IdP
              </span>
            </div>
            <div className="profile-field">
              <span className="lbl">серверов</span>
              <span className="val">{APP_DATA.servers.length}</span>
            </div>
          </div>
          <div className="profile-action-bar">
            <span className="lead-text">
              Имя, email, аватар и пароль изменяются в Zitadel — NexTalk эти данные не хранит.
            </span>
            <a href="#" className="profile-zitadel-btn">
              <I.ArrowOut />Открыть профиль в Zitadel
            </a>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
window.ProfilePage = ProfilePage;
