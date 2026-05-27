/* global React, APP_DATA, getMember, avatarBg */
/* Shell: server rail, channel sidebar, top bar, members rail.
   Stripped to MVP backend capabilities only. */

const I = {
  Hash:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 9h16M4 15h16M10 3l-2 18M16 3l-2 18"/></svg>,
  Speaker:() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
  Mic:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/></svg>,
  MicOff: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l22 22"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12L9 9z"/><path d="M12 2a3 3 0 0 1 3 3v6"/><path d="M19 10v1a7 7 0 0 1-.7 3.06M15.91 18.91A7 7 0 0 1 5 12v-1M12 18v4"/></svg>,
  Headset:() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-7h3v5zM3 19a2 2 0 0 0 2 2h1v-7H3v5z"/></svg>,
  Gear:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.1l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
  Plus:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  X:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>,
  Users:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Logout: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Send:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6 3 10l12 2-12 2z"/></svg>,
  Trash:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  More:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>,
  Copy:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Check:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>,
  ChevDown:() => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>,
  ChevRight:() => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>,
  ArrowOut:() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  Shield: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Hammer: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 7l5 5M3 17l8-8 5 5-8 8H3v-5zM12 5l3-3 7 7-3 3-7-7z"/></svg>,
  Boot:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  Link:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"/></svg>,
  PhoneOff:() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-3.66-2.91M22 2L2 22"/><path d="M2 12a16 16 0 0 1 .85-4.83A2 2 0 0 1 4.81 6h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11l-1.27 1.27"/></svg>,
  Refresh:() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  Home:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-7H10v7H6a2 2 0 0 1-2-2V9z"/></svg>,
};
window.I = I;

/* Avatar primitive */
function Avatar({ short, hue, size = 32, className = "" }) {
  return <span
    className={"av " + className}
    style={{ width: size, height: size, fontSize: size * 0.36, background: avatarBg(hue) }}
  >{short}</span>;
}
window.Avatar = Avatar;

/* ====== Server rail ====== */
function ServerRail({ activeId, onSelect, onGoHome, onOpenCreateServer }) {
  return (
    <div className="rail">
      <div className="rail-inner">
        <button
          className={"rail-icon" + (activeId == null ? " is-active" : "")}
          onClick={onGoHome}
          title="Главная"
        ><I.Home /></button>
        <div className="rail-sep" />
        {APP_DATA.servers.map(s => (
          <button
            key={s.id}
            className={"rail-icon" + (s.id === activeId ? " is-active" : "")}
            onClick={() => onSelect(s.id)}
            title={s.name}
            style={s.id === activeId ? { background: s.iconBg } : null}
          >
            {s.letter}
          </button>
        ))}
        <button className="rail-icon rail-icon-ghost" title="Создать сервер" onClick={onOpenCreateServer}>+</button>
      </div>
    </div>
  );
}
window.ServerRail = ServerRail;

/* ====== Channel sidebar ====== */
function ChannelSidebar({
  server, activeChannelId, channelType, joinedVoiceId,
  onPickChannel, onJoinVoice, onLeaveVoice, onOpenCreateChannel, onOpenServerSettings,
}) {
  const [collapsed, setCollapsed] = React.useState({});
  const toggle = (k) => setCollapsed(c => ({ ...c, [k]: !c[k] }));

  const canManage = server.role === "Owner" || server.role === "Admin";

  return (
    <div className="side">
      <div className="side-banner" style={server.iconBg ? { background: server.iconBg } : null}>
        <div className="side-guild">
          <div className="side-guild-name">{server.name}</div>
          <div className="side-guild-meta">
            <span className="dot"/>{server.online} онлайн · {server.members} участников
          </div>
        </div>
        {canManage && (
          <button
            onClick={onOpenServerSettings}
            title="Настройки сервера"
            style={{
              marginLeft: "auto",
              width: 28, height: 28,
              borderRadius: 8,
              background: "rgba(0,0,0,.25)",
              color: "white",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(255,255,255,.18)",
              zIndex: 1,
            }}
          ><I.Gear /></button>
        )}
      </div>

      <div className="side-list">
        <div className={"side-section" + (collapsed.text ? " collapsed" : "")}>
          <div className="side-section-h">
            <span onClick={() => toggle("text")}>
              <span className="chev">▾</span>текстовые
            </span>
            {canManage && (
              <button className="add" title="Создать канал" onClick={onOpenCreateChannel}>
                <I.Plus />
              </button>
            )}
          </div>
          <div className="side-rows">
            {APP_DATA.channels.text.map(c => (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                className={"side-row" +
                  (c.id === activeChannelId && channelType === "text" ? " is-active" : "")}
                onClick={() => onPickChannel(c.id, "text")}
              >
                <span className="hash">#</span>
                <span className="side-row-name">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={"side-section" + (collapsed.voice ? " collapsed" : "")}>
          <div className="side-section-h">
            <span onClick={() => toggle("voice")}>
              <span className="chev">▾</span>голосовые
            </span>
            {canManage && (
              <button className="add" title="Создать канал" onClick={onOpenCreateChannel}>
                <I.Plus />
              </button>
            )}
          </div>
          <div className="side-rows">
            {APP_DATA.channels.voice.map(c => {
              const joined = joinedVoiceId === c.id;
              const showSelfHere = joined;
              return (
                <React.Fragment key={c.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    className={"side-row" +
                      (joined ? " is-active" : "")}
                    onClick={() => onJoinVoice(c.id)}
                  >
                    <span className="hash" style={{ display: "inline-flex" }}><I.Speaker /></span>
                    <span className="side-row-name">{c.name}</span>
                    {(c.users.length + (joined ? 1 : 0)) > 0 && (
                      <span className="unread-pill">{c.users.length + (joined ? 1 : 0)}</span>
                    )}
                  </div>
                  {(c.users.length > 0 || showSelfHere) && (
                    <div className="voice-nested">
                      {showSelfHere && (
                        <div className="voice-user-row">
                          <Avatar short="ВЫ" hue={250} size={22} />
                          <span className="nm">Вы</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); onLeaveVoice(); }}
                            title="Отключиться"
                            style={{ color: "var(--live)", padding: 2, borderRadius: 4 }}
                          ><I.PhoneOff /></button>
                        </div>
                      )}
                      {c.users.map(u => (
                        <div key={u.short} className="voice-user-row">
                          <Avatar short={u.short} hue={u.hue} size={22} />
                          <span className="nm">{u.name}</span>
                          {u.muted && <span className="muted-icon"><I.MicOff /></span>}
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
window.ChannelSidebar = ChannelSidebar;

function SelfStatus({ onOpenProfile, onOpenSettings, onLogout }) {
  return (
    <div className="side-self">
      <Avatar short={APP_DATA.me.short} hue={APP_DATA.me.hue} size={32} />
      <div className="side-self-text">
        <div className="side-self-name">{APP_DATA.me.displayName}</div>
        <div className="side-self-status">{APP_DATA.me.handle} · в сети</div>
      </div>
      <div className="side-self-actions">
        <button className="icon-btn" title="Микрофон"><I.Mic /></button>
        <button className="icon-btn" title="Наушники"><I.Headset /></button>
        <button className="icon-btn" title="Настройки" onClick={() => window.__route("settings")}><I.Gear /></button>
      </div>
    </div>
  );
}

/* ====== Top bar (chat/voice variant) ====== */
function TopBarChannel({ server, channel, channelType, onOpenMembers, membersOpen }) {
  return (
    <div className="top">
      <div className="top-left">
        <div className="top-breadcrumb">
          <span className="crumb-server">{server.name}</span>
          <span className="crumb-sep"><I.ChevRight /></span>
          <span className="crumb-channel">
            {channelType === "voice" ? <I.Speaker /> : <span className="hash">#</span>}
            {channel.name}
          </span>
        </div>
      </div>
      <div className="top-actions">
        <button
          className={"icon-btn" + (membersOpen ? " is-active" : "")}
          title="Участники"
          onClick={onOpenMembers}
        ><I.Users /></button>
        <button
          className="icon-btn"
          title="Выйти"
          onClick={() => window.__route("auth-logout-confirm")}
        ><I.Logout /></button>
      </div>
    </div>
  );
}
window.TopBarChannel = TopBarChannel;

/* ====== Members panel ====== */
function MembersPanel() {
  const grouped = {
    Owner:  APP_DATA.members.filter(m => m.role === "Owner"),
    Admin:  APP_DATA.members.filter(m => m.role === "Admin"),
    Member: APP_DATA.members.filter(m => m.role === "Member" && m.status === "online"),
    Offline:APP_DATA.members.filter(m => m.status === "offline" && m.role === "Member"),
  };
  const order = [
    ["Owner",   "владелец"],
    ["Admin",   "админы"],
    ["Member",  "в сети"],
    ["Offline", "офлайн"],
  ];

  return (
    <div className="right">
      <div className="right-tabs">
        <button className="right-tab is-active">
          Участники
          <span className="ct">{APP_DATA.members.length}</span>
        </button>
      </div>
      <div className="right-body">
        <div className="members-list">
          {order.map(([key, label]) => grouped[key].length > 0 && (
            <React.Fragment key={key}>
              <div className="members-section-h">
                <span>{label}</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{grouped[key].length}</span>
              </div>
              {grouped[key].map(m => (
                <div key={m.id} className={"member-row " + m.status}>
                  <div className="av-wrap">
                    <Avatar short={m.short} hue={m.hue} size={28} />
                  </div>
                  <div className="info">
                    <div className="nm">
                      {m.name.split(" ")[0]}
                      {m.role === "Owner" && <span className="role-tag" style={{ marginLeft: 6, color: "var(--warn)", background: "rgba(245,196,81,.10)", borderColor: "rgba(245,196,81,.25)" }}>OWN</span>}
                      {m.role === "Admin" && <span className="role-tag" style={{ marginLeft: 6 }}>ADM</span>}
                      {m.isMe && <span className="role-tag" style={{ marginLeft: 6, color: "var(--brand-1)", background: "rgba(79,124,255,.10)", borderColor: "rgba(79,124,255,.25)" }}>ВЫ</span>}
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
window.MembersPanel = MembersPanel;
