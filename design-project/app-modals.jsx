/* global React, APP_DATA, Avatar, avatarBg, I */
/* Modals + system pages (404, error, reconnecting banner) */

function Modal({ children, onClose, danger }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={"modal" + (danger ? " modal-danger" : "")} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
window.Modal = Modal;

/* ====== Create Server modal (FR-12) ====== */
function CreateServerModal({ onClose, onCreate }) {
  const [name, setName] = React.useState("");
  return (
    <Modal onClose={onClose}>
      <div className="modal-head">
        <h2>Создать сервер</h2>
        <p>Новый сервер появится у вас слева. Вы — владелец.</p>
      </div>
      <div className="modal-body">
        <div className="settings-field">
          <label className="settings-label">Название сервера</label>
          <input
            autoFocus
            className="settings-input"
            placeholder="Например, «Команда NexTalk»"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
          <div className="settings-help">От 3 до 100 символов · POST /api/guilds</div>
        </div>
        <div className="settings-field" style={{ marginBottom: 0 }}>
          <label className="settings-label">Первый канал</label>
          <div className="ro-field" style={{ background: "rgba(79,124,255,.06)", borderColor: "rgba(79,124,255,.2)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fg-0)" }}>
              <I.Hash />общий
            </span>
            <span className="chip mono">создаётся автоматически</span>
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn-cancel" onClick={onClose}>Отмена</button>
        <button
          className="btn-save"
          disabled={name.trim().length < 3}
          onClick={() => { onCreate(name.trim()); onClose(); }}
        >
          Создать сервер
        </button>
      </div>
    </Modal>
  );
}
window.CreateServerModal = CreateServerModal;

/* ====== Create Channel modal (FR-13) ====== */
function CreateChannelModal({ onClose, onCreate }) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("text");

  return (
    <Modal onClose={onClose}>
      <div className="modal-head">
        <h2>Создать канал</h2>
        <p>POST /api/guilds/{`{id}`}/channels</p>
      </div>
      <div className="modal-body">
        <div className="settings-field">
          <label className="settings-label">Тип канала</label>
          <div className="radio-cards">
            <div
              className={"radio-card" + (type === "text" ? " is-selected" : "")}
              onClick={() => setType("text")}
            >
              <div className="ic"><I.Hash /></div>
              <div className="name">Текстовый</div>
              <div className="desc">Сообщения с историей и реал‑тайм доставкой через SignalR.</div>
            </div>
            <div
              className={"radio-card" + (type === "voice" ? " is-selected" : "")}
              onClick={() => setType("voice")}
            >
              <div className="ic"><I.Speaker /></div>
              <div className="name">Голосовой</div>
              <div className="desc">Голосовые комнаты через LiveKit · до 25 участников.</div>
            </div>
          </div>
        </div>
        <div className="settings-field" style={{ marginBottom: 0 }}>
          <label className="settings-label">Название</label>
          <input
            autoFocus
            className="settings-input"
            placeholder={type === "text" ? "общий, релизы, дизайн..." : "общая, pair, AFK..."}
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
            maxLength={50}
          />
          <div className="settings-help">Только латиница, цифры, дефисы. До 50 символов.</div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn-cancel" onClick={onClose}>Отмена</button>
        <button
          className="btn-save"
          disabled={name.trim().length < 2}
          onClick={() => { onCreate(name.trim(), type); onClose(); }}
        >
          Создать канал
        </button>
      </div>
    </Modal>
  );
}
window.CreateChannelModal = CreateChannelModal;

/* ====== Create Invite modal (FR-15) ====== */
function CreateInviteModal({ onClose, onCreate }) {
  const [ttl, setTtl] = React.useState("7d");
  const [maxUses, setMaxUses] = React.useState("50");
  const code = "next-coral-" + Math.floor(Math.random() * 90 + 10);

  return (
    <Modal onClose={onClose}>
      <div className="modal-head">
        <h2>Создать приглашение</h2>
        <p>POST /api/guilds/{`{id}`}/invites</p>
      </div>
      <div className="modal-body">
        <div className="settings-field">
          <label className="settings-label">Ссылка</label>
          <div className="ro-field" style={{ background: "rgba(79,124,255,.06)", borderColor: "rgba(79,124,255,.25)" }}>
            <span style={{ color: "var(--brand-1)" }}>nextalk.io/invite/{code}</span>
            <button className="copy-ic"><I.Copy /></button>
          </div>
          <div className="settings-help">Код генерируется при создании · регенерация не предусмотрена.</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="settings-field" style={{ marginBottom: 0 }}>
            <label className="settings-label">Срок действия</label>
            <select className="settings-select" value={ttl} onChange={(e) => setTtl(e.target.value)}>
              <option value="1h">1 час</option>
              <option value="6h">6 часов</option>
              <option value="1d">1 день</option>
              <option value="7d">7 дней</option>
              <option value="30d">30 дней</option>
              <option value="never">Бессрочно</option>
            </select>
          </div>
          <div className="settings-field" style={{ marginBottom: 0 }}>
            <label className="settings-label">Лимит использований</label>
            <select className="settings-select" value={maxUses} onChange={(e) => setMaxUses(e.target.value)}>
              <option value="1">1</option>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="0">Без лимита</option>
            </select>
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn-cancel" onClick={onClose}>Отмена</button>
        <button className="btn-save" onClick={() => { onCreate({ code, ttl, maxUses }); onClose(); }}>
          Создать приглашение
        </button>
      </div>
    </Modal>
  );
}
window.CreateInviteModal = CreateInviteModal;

/* ====== Kick member modal (FR-21) ====== */
function KickModal({ member, onClose, onConfirm }) {
  return (
    <Modal onClose={onClose} danger>
      <div className="modal-head">
        <h2>Кикнуть {member.name}?</h2>
        <p>Участник будет немедленно отключён от всех каналов и WebSocket‑соединений. Он сможет вернуться по новому приглашению.</p>
      </div>
      <div className="modal-body">
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,.04)", border: "1px solid var(--bd-2)", borderRadius: 10 }}>
          <Avatar short={member.short} hue={member.hue} size={36} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, color: "var(--fg-0)" }}>{member.name}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)" }}>{member.handle} · {member.role}</div>
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
          DELETE /api/guilds/{`{id}`}/members/{member.id} · публикует <code style={{ background: "rgba(0,0,0,.4)", padding: "1px 6px", borderRadius: 4 }}>guild.member.kicked</code>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn-cancel" onClick={onClose}>Отмена</button>
        <button className="btn-danger" onClick={() => { onConfirm(member); onClose(); }}>
          Кикнуть
        </button>
      </div>
    </Modal>
  );
}
window.KickModal = KickModal;

/* ====== Ban member modal (FR-22) ====== */
function BanModal({ member, onClose, onConfirm }) {
  const [reason, setReason] = React.useState("");
  return (
    <Modal onClose={onClose} danger>
      <div className="modal-head">
        <h2>Забанить {member.name}?</h2>
        <p>Участник будет отключён и не сможет вернуться даже по приглашению. Решение можно отменить во вкладке «Баны».</p>
      </div>
      <div className="modal-body">
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,.04)", border: "1px solid var(--bd-2)", borderRadius: 10, marginBottom: 16 }}>
          <Avatar short={member.short} hue={member.hue} size={36} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, color: "var(--fg-0)" }}>{member.name}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)" }}>{member.handle} · {member.role}</div>
          </div>
        </div>
        <div className="settings-field" style={{ marginBottom: 0 }}>
          <label className="settings-label">Причина (опционально)</label>
          <textarea
            className="settings-textarea"
            placeholder="Кратко опишите причину. Видно только админам в списке банов."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn-cancel" onClick={onClose}>Отмена</button>
        <button className="btn-danger" onClick={() => { onConfirm(member, reason); onClose(); }}>
          Забанить
        </button>
      </div>
    </Modal>
  );
}
window.BanModal = BanModal;

/* ====== Delete server confirm modal (FR-26) ====== */
function DeleteServerModal({ server, onClose, onConfirm }) {
  const [text, setText] = React.useState("");
  const matches = text === server.name;
  return (
    <Modal onClose={onClose} danger>
      <div className="modal-head">
        <h2>Удалить «{server.name}»?</h2>
        <p>Это действие нельзя отменить. Все каналы, сообщения, приглашения и баны удалятся безвозвратно.</p>
      </div>
      <div className="modal-body">
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--fg-1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--live)" }}>×</span>
            <span><b>{server.members}</b> участников будут отключены</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--live)" }}>×</span>
            <span>Удалятся все каналы и сообщения</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--live)" }}>×</span>
            <span>Все активные приглашения станут неактивны</span>
          </div>
        </div>

        <div className="confirm-typing">
          <p>Для подтверждения введите название сервера: <code>{server.name}</code></p>
          <input
            className="settings-input"
            placeholder={server.name}
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ background: "rgba(0,0,0,.4)" }}
          />
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn-cancel" onClick={onClose}>Отмена</button>
        <button
          className="btn-danger"
          disabled={!matches}
          onClick={() => { onConfirm(); onClose(); }}
          style={!matches ? { opacity: .4, cursor: "not-allowed" } : null}
        >
          Удалить навсегда
        </button>
      </div>
    </Modal>
  );
}
window.DeleteServerModal = DeleteServerModal;

/* ====== Logout confirm modal ====== */
function LogoutModal({ onClose, onConfirm }) {
  return (
    <Modal onClose={onClose}>
      <div className="modal-head">
        <h2>Выйти из NexTalk?</h2>
        <p>Сессия будет завершена, токен отозван. При следующем входе вас перенаправит в Zitadel.</p>
      </div>
      <div className="modal-foot">
        <button className="btn-cancel" onClick={onClose}>Отмена</button>
        <button className="btn-danger" onClick={() => { onConfirm(); onClose(); }}>
          Выйти
        </button>
      </div>
    </Modal>
  );
}
window.LogoutModal = LogoutModal;

/* ====== Toast for in-app notifications ====== */
function Toast({ message, kind, onDismiss }) {
  React.useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const color = kind === "error" ? "var(--live)" : kind === "warn" ? "var(--warn)" : "var(--ok)";
  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      left: "50%",
      transform: "translateX(-50%)",
      background: "var(--bg-4)",
      border: "1px solid var(--bd-2)",
      borderLeft: "3px solid " + color,
      borderRadius: 10,
      padding: "10px 18px",
      fontSize: 13,
      color: "var(--fg-0)",
      zIndex: 300,
      boxShadow: "0 20px 40px -20px rgba(0,0,0,.6)",
      animation: "modal-card-in .25s ease",
    }}>
      {message}
    </div>
  );
}
window.Toast = Toast;

/* ====== System pages: 404, error, reconnecting ====== */
function NotFoundPage({ onHome }) {
  return (
    <div className="system-page">
      <div className="system-card">
        <div className="system-code">404</div>
        <h1>Страница не найдена</h1>
        <p>Возможно, ссылка устарела или у вас нет доступа к этой гильдии или каналу.</p>
        <button className="home-link" onClick={onHome}>
          <I.Home />
          На главную
        </button>
      </div>
    </div>
  );
}
window.NotFoundPage = NotFoundPage;

function ErrorPage({ onHome, code, message }) {
  return (
    <div className="system-page">
      <div className="system-card">
        <div className="system-code" style={{ background: "linear-gradient(135deg, #FF5A6E, #F5C451)", WebkitBackgroundClip: "text", backgroundClip: "text" }}>
          {code || "500"}
        </div>
        <h1>{message || "Что-то пошло не так"}</h1>
        <p>Один из сервисов недоступен. Polly Circuit Breaker открыт — повторим запрос через 15 секунд автоматически. Если проблема не решится — посмотрите статус‑страницу.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="home-link" onClick={onHome}>
            <I.Home />
            На главную
          </button>
          <a href="#" className="home-link" style={{ background: "rgba(255,255,255,.06)", color: "var(--fg-0)" }}>
            <I.ArrowOut />
            status.nextalk.io
          </a>
        </div>
      </div>
    </div>
  );
}
window.ErrorPage = ErrorPage;
