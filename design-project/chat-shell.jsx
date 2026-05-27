/* global React, CHAT_DATA, getAuthor, avatarBg, initials */
/* Shell: server rail, channel sidebar, top bar, members rail */

/* ====== Icons ====== */
function I_Hash()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 9h16M4 15h16M10 3l-2 18M16 3l-2 18"/></svg>; }
function I_Speaker()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>; }
function I_Mic()       { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/></svg>; }
function I_MicOff()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l22 22"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12L9 9z"/><path d="M12 2a3 3 0 0 1 3 3v6"/><path d="M19 10v1a7 7 0 0 1-.7 3.06M15.91 18.91A7 7 0 0 1 5 12v-1M12 18v4"/></svg>; }
function I_Headset()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-7h3v5zM3 19a2 2 0 0 0 2 2h1v-7H3v5z"/></svg>; }
function I_Gear()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.1l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>; }
function I_Search()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>; }
function I_Pin()       { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5M9 10.76V6a2 2 0 0 1 4 0v4.76a3 3 0 0 1 1 2.24V17H8v-4a3 3 0 0 1 1-2.24z"/></svg>; }
function I_Bell()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>; }
function I_Users()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function I_Inbox()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6L5.5 5z"/></svg>; }
function I_Thread()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function I_Plus()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>; }
function I_X()         { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>; }
function I_ChevDown()  { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>; }
function I_Emoji()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>; }
function I_Gif()       { return <span style={{fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: ".05em"}}>GIF</span>; }
function I_At()        { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg>; }
function I_Bold()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4h7a4 4 0 0 1 0 8H7zM7 12h8a4 4 0 0 1 0 8H7z"/></svg>; }
function I_Code()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>; }
function I_Send()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6 3 10l12 2-12 2z"/></svg>; }
function I_Reply()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>; }
function I_More()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>; }
function I_Trash()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>; }
function I_Pencil()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>; }
function I_Down()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>; }
function I_PhoneOff()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-3.66-2.91M22 2L2 22"/><path d="M2 12a16 16 0 0 1 .85-4.83A2 2 0 0 1 4.81 6h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11l-1.27 1.27"/></svg>; }
function I_Screen()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>; }
function I_Camera()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>; }
function I_Reaction()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>; }

window.Icons = {
  I_Hash, I_Speaker, I_Mic, I_MicOff, I_Headset, I_Gear, I_Search, I_Pin,
  I_Bell, I_Users, I_Inbox, I_Thread, I_Plus, I_X, I_ChevDown, I_Emoji,
  I_Gif, I_At, I_Bold, I_Code, I_Send, I_Reply, I_More, I_Trash, I_Pencil,
  I_Down, I_PhoneOff, I_Screen, I_Camera, I_Reaction,
};

/* ====== Avatar ====== */
function Avatar({ short, hue, size = 32, className = "" }) {
  const style = { width: size, height: size, fontSize: size * 0.36, background: avatarBg(hue) };
  return <span className={"av " + className} style={style}>{short}</span>;
}
window.Avatar = Avatar;

/* ====== Server Rail ====== */
function ServerRail({ activeId, onSelect }) {
  return (
    <div className="rail">
      <div className="rail-inner">
        {CHAT_DATA.servers.map((s, i) => (
          <React.Fragment key={s.id}>
            <button
              className={
                "rail-icon" +
                (s.id === activeId ? " is-active" : "") +
                (s.unread ? " has-unread" : "")
              }
              onClick={() => onSelect(s.id)}
              title={s.name}
              style={s.id === activeId ? { background: s.banner } : null}
            >
              {s.letter}
              {s.mentions > 0 && <span className="rail-mention-badge">{s.mentions}</span>}
            </button>
            {i === 0 && <div className="rail-sep" />}
          </React.Fragment>
        ))}
        <div className="rail-sep" />
        <button className="rail-icon rail-icon-ghost" title="Создать сервер">+</button>
        <button className="rail-icon rail-icon-ghost" title="Открыть инвайт" style={{ fontSize: 16 }}>↗</button>
      </div>
    </div>
  );
}

/* ====== Channel Sidebar ====== */
function ChannelSidebar({ activeChannel, onPickChannel, voiceJoinedId, onJoinVoice }) {
  const [collapsed, setCollapsed] = React.useState({});
  const toggle = (k) => setCollapsed(c => ({ ...c, [k]: !c[k] }));

  return (
    <div className="side">
      <div className="side-banner">
        <div className="side-guild">
          <div className="side-guild-name">{CHAT_DATA.guildMeta.name}</div>
          <div className="side-guild-meta">
            <span className="dot"/>{CHAT_DATA.guildMeta.online} онлайн · {CHAT_DATA.guildMeta.members} участников
          </div>
        </div>
      </div>

      <div className="side-search">
        <div className="side-search-input">
          <I_Search />
          <span>Поиск по каналам</span>
          <kbd>⌘K</kbd>
        </div>
      </div>

      <div className="side-list">
        <div className={"side-section" + (collapsed.text ? " collapsed" : "")}>
          <div className="side-section-h" onClick={() => toggle("text")}>
            <span><span className="chev">▾</span>текстовые</span>
            <button className="add" title="Создать канал"><I_Plus /></button>
          </div>
          <div className="side-rows">
            {CHAT_DATA.channels.text.map(c => (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                className={"side-row" +
                  (c.id === activeChannel ? " is-active" : "") +
                  (c.unread ? " has-unread" : "")}
                onClick={() => onPickChannel(c.id, "text")}
              >
                <span className="hash">#</span>
                <span className="side-row-name">{c.name}</span>
                {c.live && <span className="live-pill"><span className="live-dot" />LIVE</span>}
                {c.mentions > 0 && <span className="unread-pill is-mention">{c.mentions}</span>}
                {!c.mentions && c.unread > 0 && <span className="unread-pill">{c.unread}</span>}
                <span className="side-row-actions">
                  <button title="Закрепить" onClick={(e) => e.stopPropagation()}><I_Pin /></button>
                  <button title="Заглушить" onClick={(e) => e.stopPropagation()}><I_Bell /></button>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={"side-section" + (collapsed.voice ? " collapsed" : "")}>
          <div className="side-section-h" onClick={() => toggle("voice")}>
            <span><span className="chev">▾</span>голосовые</span>
            <button className="add" title="Создать канал"><I_Plus /></button>
          </div>
          <div className="side-rows">
            {CHAT_DATA.channels.voice.map(c => {
              const joined = voiceJoinedId === c.id;
              return (
                <React.Fragment key={c.id}>
                  <button
                    className={"side-row" + (joined ? " is-active" : "")}
                    onClick={() => onJoinVoice(c.id)}
                  >
                    <span className="hash" style={{ fontSize: 13, marginTop: 1 }}><I_Speaker /></span>
                    <span className="side-row-name">{c.name}</span>
                    {c.users.length > 0 && <span className="unread-pill">{c.users.length}</span>}
                  </button>
                  {c.users.length > 0 && (
                    <div className="voice-nested">
                      {c.users.map(u => (
                        <div key={u.short} className={"voice-user-row" + (u.speaking ? " speaking" : "")}>
                          <Avatar short={u.short} hue={u.hue} size={22} />
                          <span className="nm">{u.name}</span>
                          {u.muted && <span className="muted-icon" title="muted"><I_MicOff /></span>}
                        </div>
                      ))}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      <SelfStatus />
    </div>
  );
}

function SelfStatus() {
  return (
    <div className="side-self">
      <Avatar short="ВЫ" hue={250} size={32} />
      <div className="side-self-text">
        <div className="side-self-name">Виктория Ю.</div>
        <div className="side-self-status">@viewer · в сети</div>
      </div>
      <div className="side-self-actions">
        <button className="icon-btn" title="Микрофон"><I_Mic /></button>
        <button className="icon-btn" title="Наушники"><I_Headset /></button>
        <button className="icon-btn" title="Настройки"><I_Gear /></button>
      </div>
    </div>
  );
}

/* ====== Top Bar ====== */
function TopBar({ channel, view, rightView, onRightView, onToggleRight, isVoice }) {
  return (
    <div className="top">
      <div className="top-left">
        <div className="top-channel-title">
          {isVoice ? <span className="hash"><I_Speaker /></span> : <span className="hash">#</span>}
          <h1>{channel.name}</h1>
        </div>
        {channel.topic && <div className="top-topic">{channel.topic}</div>}
      </div>
      <div className="top-actions">
        <div className="top-search">
          <I_Search />
          <input placeholder="Поиск" defaultValue={rightView === "search" ? "outbox" : ""} />
        </div>
        <button className={"icon-btn" + (rightView === "thread" ? " is-active" : "")} onClick={() => onRightView("thread")} title="Треды"><I_Thread /></button>
        <button className={"icon-btn" + (rightView === "pinned" ? " is-active" : "")} onClick={() => onRightView("pinned")} title="Закреплённое"><I_Pin /></button>
        <button className={"icon-btn" + (rightView === "inbox" ? " is-active" : "")} onClick={() => onRightView("inbox")} title="Входящие"><I_Inbox /></button>
        <button className={"icon-btn" + (rightView === "members" ? " is-active" : "")} onClick={() => { onRightView("members"); onToggleRight(true); }} title="Участники"><I_Users /></button>
      </div>
    </div>
  );
}

/* ====== Members Rail ====== */
function MembersRail() {
  const [hover, setHover] = React.useState(null);

  const grouped = {
    Owner:  CHAT_DATA.members.filter(m => m.role === "Owner"),
    Admin:  CHAT_DATA.members.filter(m => m.role === "Admin"),
    Bot:    CHAT_DATA.members.filter(m => m.role === "Bot"),
    Member: CHAT_DATA.members.filter(m => m.role === "Member" && m.status !== "offline"),
    Offline:CHAT_DATA.members.filter(m => m.status === "offline" && m.role !== "Owner" && m.role !== "Admin"),
  };
  const order = [
    ["Owner",   "владелец"],
    ["Admin",   "админы"],
    ["Bot",     "боты"],
    ["Member",  "участники в сети"],
    ["Offline", "офлайн"],
  ];

  return (
    <div className="members-list">
      {order.map(([key, label]) => grouped[key].length > 0 && (
        <React.Fragment key={key}>
          <div className="members-section-h">
            <span>{label}</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{grouped[key].length}</span>
          </div>
          {grouped[key].map(m => (
            <div
              key={m.id}
              className={"member-row " + m.status}
              onMouseEnter={(e) => setHover({ m, y: e.currentTarget.getBoundingClientRect().top })}
              onMouseLeave={() => setHover(null)}
            >
              <div className="av-wrap">
                <Avatar short={m.short} hue={m.hue} size={28} />
              </div>
              <div className="info">
                <div className="nm">
                  {m.name.split(" ")[0]}
                  {m.role === "Owner" && <span className="role-tag" style={{ marginLeft: 6, color: "var(--warn)", background: "rgba(245,196,81,.10)", borderColor: "rgba(245,196,81,.25)" }}>OWN</span>}
                  {m.role === "Admin" && <span className="role-tag" style={{ marginLeft: 6 }}>ADM</span>}
                  {m.role === "Bot"   && <span className="role-tag" style={{ marginLeft: 6, color: "var(--info)", background: "rgba(108,214,255,.10)", borderColor: "rgba(108,214,255,.25)" }}>BOT</span>}
                </div>
                {m.activity && <div className="st">{m.activity}</div>}
              </div>
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

window.ServerRail = ServerRail;
window.ChannelSidebar = ChannelSidebar;
window.TopBar = TopBar;
window.MembersRail = MembersRail;
