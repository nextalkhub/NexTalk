/* global React, CHAT_DATA, getAuthor, avatarBg, Avatar, Icons */
/* Voice view + Right rail variants (Members, Threads, Pinned, Search, Inbox) */

const {
  I_Mic, I_MicOff, I_Headset, I_Screen, I_Camera, I_PhoneOff, I_Gear,
  I_Thread, I_Pin, I_Inbox, I_Search,
} = window.Icons;

/* ====== Voice Stage ====== */
function VoiceStage({ channel }) {
  // Tiles: include the viewer + channel users + some extras
  const initialUsers = channel.users.map(u => ({
    short: u.short, name: u.name, hue: u.hue, muted: u.muted, speaking: u.speaking,
    role: CHAT_DATA.members.find(m => m.short === u.short)?.role
  }));
  const tiles = [
    { short: "ВЫ", name: "Виктория Ю.", hue: 250, muted: false, speaking: false, self: true },
    ...initialUsers,
  ];

  // Rotate speaker every few seconds
  const [speakerIdx, setSpeakerIdx] = React.useState(2);
  React.useEffect(() => {
    const t = setInterval(() => {
      setSpeakerIdx(idx => (idx + 1) % tiles.length);
    }, 3500);
    return () => clearInterval(t);
  }, [tiles.length]);

  const [selfMuted, setSelfMuted] = React.useState(false);
  const [selfDeaf, setSelfDeaf]   = React.useState(false);
  const [selfCam, setSelfCam]     = React.useState(false);
  const [selfScreen, setSelfScreen] = React.useState(false);

  return (
    <div className="voice-stage">
      <div className="voice-stage-meta">
        <div className="voice-stage-meta-left">
          <h2>{channel.name}</h2>
          <span className="chip is-ok"><span className="dot online" />LiveKit подключён</span>
        </div>
        <div className="voice-stage-meta-stats">
          <span className="chip">{tiles.length} в комнате</span>
          <span className="chip is-info">SRTP · DTLS 1.2</span>
          <span className="chip">87 ms · RTT</span>
        </div>
      </div>

      <div className="voice-grid">
        {tiles.map((t, i) => {
          const speaking = i === speakerIdx && !(t.self && selfMuted);
          const muted = t.self ? selfMuted : t.muted;
          return (
            <div key={t.short + i} className={
              "voice-tile" +
              (t.self ? " is-self" : "") +
              (speaking ? " is-speaking" : "")
            }>
              <div className="voice-tile-indicator">
                {muted && <span className="ind muted" title="muted"><I_MicOff /></span>}
                {t.self && selfCam && <span className="ind video" title="camera"><I_Camera /></span>}
                {t.self && selfScreen && <span className="ind video" title="screen"><I_Screen /></span>}
              </div>
              <Avatar short={t.short} hue={t.hue} size={84} />
              <div className="voice-tile-name">{t.name}</div>
              <div className="voice-tile-tags">
                {t.self && <span className="chip is-brand">вы</span>}
                {t.role === "Owner" && <span className="chip is-warn">Owner</span>}
                {t.role === "Admin" && <span className="chip" style={{ color: "var(--brand-2)", background: "rgba(144,97,255,.10)", borderColor: "rgba(144,97,255,.25)" }}>Admin</span>}
              </div>
              <div className="tile-wave">
                {Array.from({length: 10}).map((_, k) => <i key={k}/>)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="voice-controls">
        <div className="vc-info">
          <span className="vc-status">
            <span className="dot online" />
            подключено · {channel.name}
          </span>
          <div className="vc-stats">
            <span className="chip">↓ 32 kbit/s</span>
            <span className="chip">↑ 28 kbit/s</span>
            <span className="chip is-ok">opus · 48 kHz</span>
          </div>
        </div>
        <div className="vc-buttons">
          <button
            className={"vc-btn" + (selfMuted ? " is-muted" : "")}
            onClick={() => setSelfMuted(v => !v)}
            title="Микрофон"
          >
            {selfMuted ? <I_MicOff /> : <I_Mic />}
          </button>
          <button
            className={"vc-btn" + (selfDeaf ? " is-muted" : "")}
            onClick={() => setSelfDeaf(v => !v)}
            title="Наушники"
          >
            <I_Headset />
          </button>
          <button
            className={"vc-btn" + (selfCam ? " is-active" : "")}
            onClick={() => setSelfCam(v => !v)}
            title="Камера"
          >
            <I_Camera />
          </button>
          <button
            className={"vc-btn" + (selfScreen ? " is-active" : "")}
            onClick={() => setSelfScreen(v => !v)}
            title="Демонстрация экрана"
          >
            <I_Screen />
          </button>
          <button className="vc-btn" title="Настройки"><I_Gear /></button>
          <button className="vc-btn is-leave" title="Покинуть">
            <I_PhoneOff /> Отключиться
          </button>
        </div>
      </div>
    </div>
  );
}
window.VoiceStage = VoiceStage;

/* ====== Right Rail ====== */
function RightRail({ view, onView }) {
  const tabs = [
    { id: "members", label: "Участники", count: CHAT_DATA.members.filter(m => m.status !== "offline").length, icon: null },
    { id: "thread",  label: "Треды",     count: CHAT_DATA.threads.length },
    { id: "pinned",  label: "Закреп.",   count: CHAT_DATA.pinned.length },
    { id: "search",  label: "Поиск",     count: CHAT_DATA.search.length },
    { id: "inbox",   label: "Inbox",     count: CHAT_DATA.inbox.length },
  ];

  return (
    <div className="right">
      <div className="right-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={"right-tab" + (view === t.id ? " is-active" : "")}
            onClick={() => onView(t.id)}
          >
            {t.label}
            <span className="ct">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="right-body">
        {view === "members" && <MembersRail />}
        {view === "thread"  && <ThreadsRail />}
        {view === "pinned"  && <PinnedRail />}
        {view === "search"  && <SearchRail />}
        {view === "inbox"   && <InboxRail />}
      </div>
    </div>
  );
}
window.RightRail = RightRail;

function ThreadsRail() {
  return (
    <div className="right-thread-list">
      <div style={{ padding: "12px 4px 4px", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        активные треды
      </div>
      {CHAT_DATA.threads.map(t => (
        <div key={t.id} className="right-card">
          <div className="right-card-head">
            <I_Thread />
            <b>{t.title}</b>
            <span className="time">{t.lastAgo}</span>
          </div>
          <div className="right-card-text">{t.excerpt}</div>
          <div className="right-card-meta">
            <span className="ch">#{t.parent}</span>
            <span>· {t.replies} ответов · последний: {t.lastBy}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PinnedRail() {
  return (
    <div className="right-pinned-list">
      <div style={{ padding: "12px 4px 4px", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        закреплённое
      </div>
      {CHAT_DATA.pinned.map((p, i) => (
        <div key={i} className="right-card">
          <div className="right-card-head">
            <Avatar short={p.authorShort} hue={p.hue} size={18} />
            <b>{p.author}</b>
            <span className="time">{p.time}</span>
          </div>
          <div className="right-card-text">{p.text}</div>
          <div className="right-card-meta">
            <span className="ch">#{p.ch}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchRail() {
  return (
    <div className="right-search-list">
      <div style={{ padding: "12px 4px 4px", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        3 результата по «outbox»
      </div>
      {CHAT_DATA.search.map((r, i) => (
        <div key={i} className="right-card">
          <div className="right-card-head">
            <Avatar short={r.short} hue={r.author === "release-bot" ? 198 : (r.author === "Анна" ? 282 : 218)} size={18} />
            <b>{r.author}</b>
            <span className="time">{r.time}</span>
          </div>
          <div className="right-card-text" dangerouslySetInnerHTML={{ __html: r.excerpt.replace(/\*\*([^*]+)\*\*/g, '<mark style="background: rgba(255,181,71,.20); color: var(--mention); padding: 0 2px; border-radius: 2px;">$1</mark>') }} />
          <div className="right-card-meta">
            <span className="ch">#{r.ch}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function InboxRail() {
  return (
    <div className="right-inbox-list">
      <div style={{ padding: "12px 4px 4px", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        непрочитанное · {CHAT_DATA.inbox.length}
      </div>
      {CHAT_DATA.inbox.map((it, i) => (
        <div key={i} className="right-card">
          <div className="right-card-head">
            {it.kind === "mention"  && <span style={{ color: "var(--mention)" }}>@</span>}
            {it.kind === "thread"   && <I_Thread />}
            {it.kind === "reaction" && <span>😊</span>}
            <b>{it.from}</b>
            <span className="time">{it.time}</span>
          </div>
          <div className="right-card-text">{it.excerpt}</div>
          <div className="right-card-meta">
            <span className="ch">#{it.ch}</span>
          </div>
        </div>
      ))}
      <div className="right-empty" style={{ paddingTop: 30 }}>
        <div className="icon-blob"><I_Inbox /></div>
        <div>Это всё. Чисто и спокойно.</div>
      </div>
    </div>
  );
}
