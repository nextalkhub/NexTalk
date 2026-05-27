/* global React */

// Interactive product preview — the chat + voice channels mockup
// This is the centerpiece of the hero. It animates incoming messages,
// shows the voice channel with speaking indicators, and lets you switch channels.

const SERVERS = [
  { id: "next", name: "NexTalk Core", letter: "N", active: true },
  { id: "design", name: "Design", letter: "D" },
  { id: "be", name: "Backend", letter: "B" },
  { id: "ops", name: "Ops & SRE", letter: "O" },
  { id: "dao", name: "Open Source", letter: "◇" },
];

const CHANNELS_TEXT = [
  { id: "general", name: "общий", unread: 0, active: true },
  { id: "release", name: "релизы", unread: 12 },
  { id: "design", name: "дизайн" },
  { id: "incidents", name: "incident-room", live: true },
  { id: "random", name: "рандом" },
];
const CHANNELS_VOICE = [
  { id: "war", name: "Воен. комната", users: ["AK", "MS", "PR"], active: true },
  { id: "pair", name: "Pair programming", users: ["IV"] },
  { id: "afk", name: "AFK" },
];

const MEMBERS = [
  { name: "Анна Каренина",  role: "Owner",  hue: 282, status: "online", short: "AK" },
  { name: "Михаил Седов",   role: "Admin",  hue: 218, status: "online", short: "MS" },
  { name: "Полина Рунге",   role: "Admin",  hue: 332, status: "online", short: "PR", speaking: true },
  { name: "Иван Волков",    role: "Member", hue: 162, status: "online", short: "IV" },
  { name: "Дарья Орлова",   role: "Member", hue: 38,  status: "online", short: "DO" },
  { name: "Семён Поляков",  role: "Member", hue: 196, status: "idle",   short: "SP" },
  { name: "Олег Никольский", role: "Member", hue: 256, status: "offline", short: "ON" },
];

// Initial message log + a queue of "incoming" messages to animate in
const SEED_MESSAGES = [
  {
    author: "Анна Каренина", hue: 282, time: "14:02",
    text: "Прокатали нагрузочный тест — Outbox держит 60 msg/s без капельки потерь.",
  },
  {
    author: "Михаил Седов", hue: 218, time: "14:03",
    text: "Красота. Идём в k3s, помечаю задачу как done.",
  },
  {
    author: "Полина Рунге", hue: 332, time: "14:05",
    reply: { to: "Анна Каренина", text: "Outbox держит 60 msg/s..." },
    text: "Кстати, на дашборде latency p95 = 132 ms. По NFR‑1 норм.",
  },
];

const INCOMING = [
  {
    author: "Иван Волков", hue: 162, time: "14:06",
    text: "Тогда финализирую Helm chart и катим в стейджинг.",
  },
  {
    author: "Дарья Орлова", hue: 38, time: "14:06",
    text: "+1, к четвергу можно демо для всех.",
  },
  {
    author: "Анна Каренина", hue: 282, time: "14:07",
    text: "Запускаю Circuit Breaker probe — отвечу через минуту.",
  },
];

function ServerRail({ servers, onSelect }) {
  return (
    <div className="prv-rail">
      {servers.map(s => (
        <button
          key={s.id}
          className={"prv-server " + (s.active ? "is-active" : "")}
          onClick={() => onSelect?.(s.id)}
          title={s.name}
        >
          {s.letter}
        </button>
      ))}
      <div className="prv-rail-sep" />
      <button className="prv-server prv-server-add" title="Создать сервер">+</button>
    </div>
  );
}

function ChannelList({ activeId, onPick, joinedVoice, onJoinVoice }) {
  return (
    <div className="prv-channels">
      <div className="prv-guild-head">
        <div>
          <div className="prv-guild-name">NexTalk Core</div>
          <div className="prv-guild-sub mono">7 онлайн · 21 участник</div>
        </div>
        <button className="prv-chev" aria-label="Меню сервера">▾</button>
      </div>

      <div className="prv-section">
        <div className="prv-section-head">
          <span>текстовые</span>
          <span className="mono prv-section-count">{CHANNELS_TEXT.length}</span>
        </div>
        {CHANNELS_TEXT.map(c => (
          <button
            key={c.id}
            onClick={() => onPick?.(c.id)}
            className={"prv-ch " + (c.id === activeId ? "is-active" : "")}
          >
            <span className="prv-hash">#</span>
            <span className="prv-ch-name">{c.name}</span>
            {c.live ? <span className="prv-badge prv-badge-live mono"><span className="dot live pulse" />LIVE</span> : null}
            {c.unread ? <span className="prv-badge mono">{c.unread}</span> : null}
          </button>
        ))}
      </div>

      <div className="prv-section">
        <div className="prv-section-head">
          <span>голосовые</span>
          <span className="mono prv-section-count">{CHANNELS_VOICE.length}</span>
        </div>
        {CHANNELS_VOICE.map(c => {
          const joined = joinedVoice === c.id;
          return (
            <div key={c.id} className="prv-ch-group">
              <button
                onClick={() => onJoinVoice?.(c.id)}
                className={"prv-ch " + (joined ? "is-active" : "")}
              >
                <SpeakerIcon />
                <span className="prv-ch-name">{c.name}</span>
                {c.users && c.users.length ? <span className="prv-badge mono">{c.users.length}</span> : null}
              </button>
              {c.users && c.users.length > 0 && (
                <div className="prv-voice-users">
                  {c.users.map(u => (
                    <div key={u} className={"prv-voice-user " + (u === "PR" && joined ? "is-speaking" : "")}>
                      <span className="prv-mini-avatar" style={{ background: avatarBg(u) }}>{u}</span>
                      <span className="prv-voice-user-name">{shortToName(u)}</span>
                      {u === "PR" && joined && (
                        <span className="prv-wave" aria-hidden="true">
                          <i /><i /><i /><i /><i />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="prv-self">
        <span className="prv-mini-avatar" style={{ background: "linear-gradient(135deg, #4F7CFF, #C254FF)" }}>В</span>
        <div className="prv-self-text">
          <div>Вы</div>
          <div className="prv-self-sub mono">@viewer · online</div>
        </div>
        <button className="prv-icon-btn" title="Микрофон"><MicIcon /></button>
        <button className="prv-icon-btn" title="Настройки"><GearIcon /></button>
      </div>
    </div>
  );
}

function shortToName(s) {
  const m = MEMBERS.find(x => x.short === s);
  return m ? m.name.split(" ")[0] : s;
}
function avatarBg(short) {
  const m = MEMBERS.find(x => x.short === short);
  const h = m ? m.hue : 240;
  return `linear-gradient(135deg, oklch(0.62 0.16 ${h}), oklch(0.48 0.18 ${(h + 40) % 360}))`;
}

function ChatPanel({ messages, typingName, channelName }) {
  const endRef = React.useRef(null);
  React.useEffect(() => {
    if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight;
  }, [messages.length, typingName]);

  return (
    <div className="prv-chat">
      <div className="prv-chat-head">
        <div className="prv-chat-title">
          <span className="prv-hash">#</span>
          <span>{channelName}</span>
        </div>
        <div className="prv-chat-meta mono">
          <span className="chip"><span className="dot online" />SignalR · подключено</span>
          <span className="chip">end‑to‑end TLS</span>
        </div>
      </div>

      <div className="prv-chat-scroll" ref={endRef}>
        <div className="prv-day-divider">
          <span /><span className="mono">сегодня · 25 мая</span><span />
        </div>

        {messages.map((m, i) => (
          <MessageRow key={i} msg={m} isFirst={i === 0 || messages[i-1].author !== m.author} />
        ))}

        {typingName && (
          <div className="prv-typing">
            <span className="prv-mini-avatar" style={{ background: avatarBg(shortFor(typingName)) }}>
              {shortFor(typingName)}
            </span>
            <div className="prv-typing-bubble">
              <span /><span /><span />
            </div>
            <span className="muted mono prv-typing-name">{typingName} печатает…</span>
          </div>
        )}
      </div>

      <div className="prv-composer">
        <button className="prv-icon-btn" title="Прикрепить"><PlusIcon /></button>
        <div className="prv-input">
          <span className="muted">Написать в #{channelName}…</span>
        </div>
        <div className="prv-composer-actions">
          <span className="chip mono">⌘ + Enter</span>
          <button className="prv-send" title="Отправить">
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

function shortFor(name) {
  const m = MEMBERS.find(x => x.name === name);
  return m ? m.short : "??";
}

function MessageRow({ msg, isFirst }) {
  return (
    <div className={"prv-msg " + (isFirst ? "is-first" : "")}>
      <div className="prv-msg-gutter">
        {isFirst ? (
          <span className="prv-avatar" style={{ background: `linear-gradient(135deg, oklch(0.62 0.16 ${msg.hue}), oklch(0.48 0.18 ${(msg.hue+40)%360}))` }}>
            {msg.author.split(" ").map(p => p[0]).join("").slice(0,2)}
          </span>
        ) : (
          <span className="prv-msg-time mono">{msg.time}</span>
        )}
      </div>
      <div className="prv-msg-body">
        {isFirst && (
          <div className="prv-msg-head">
            <span className="prv-msg-author">{msg.author}</span>
            <span className="mono prv-msg-stamp">{msg.time}</span>
          </div>
        )}
        {msg.reply && (
          <div className="prv-reply">
            <span className="prv-reply-bar" />
            <span className="prv-reply-author">{msg.reply.to}</span>
            <span className="prv-reply-text muted">{msg.reply.text}</span>
          </div>
        )}
        <div className="prv-msg-text">{msg.text}</div>
      </div>
    </div>
  );
}

function MembersPane() {
  const grouped = {
    Owner: MEMBERS.filter(m => m.role === "Owner"),
    Admin: MEMBERS.filter(m => m.role === "Admin"),
    Member: MEMBERS.filter(m => m.role === "Member"),
  };
  return (
    <div className="prv-members">
      {["Owner", "Admin", "Member"].map(g => (
        <div key={g} className="prv-section">
          <div className="prv-section-head">
            <span>{g === "Owner" ? "владелец" : g === "Admin" ? "админы" : "участники"}</span>
            <span className="mono prv-section-count">{grouped[g].length}</span>
          </div>
          {grouped[g].map(m => (
            <div key={m.name} className={"prv-member " + (m.status !== "online" ? "is-dim" : "")}>
              <span className="prv-mini-avatar" style={{ background: `linear-gradient(135deg, oklch(0.62 0.16 ${m.hue}), oklch(0.48 0.18 ${(m.hue+40)%360}))` }}>
                {m.short}
              </span>
              <div className="prv-member-text">
                <div className="prv-member-name">{m.name.split(" ")[0]}</div>
                <div className="prv-member-role mono">{statusLabel(m)}</div>
              </div>
              <span className={"dot " + m.status} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
function statusLabel(m) {
  if (m.speaking) return "говорит";
  if (m.status === "online") return "в сети";
  if (m.status === "idle")   return "afk";
  return "офлайн";
}

/* ---- Icons ---- */
function SpeakerIcon() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>);
}
function MicIcon() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/></svg>);
}
function GearIcon() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.1l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>);
}
function PlusIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>);}
function SendIcon() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6 3 10l12 2-12 2z"/></svg>);}

/* ---- Main preview ---- */

function ProductPreview() {
  const [activeText, setActiveText] = React.useState("general");
  const [joinedVoice, setJoinedVoice] = React.useState("war");
  const [messages, setMessages] = React.useState(SEED_MESSAGES);
  const [typing, setTyping] = React.useState(null);
  const [tick, setTick] = React.useState(0);

  // Animate new messages in over time
  React.useEffect(() => {
    if (tick >= INCOMING.length) return;
    const next = INCOMING[tick];
    const t1 = setTimeout(() => setTyping(next.author), 1200);
    const t2 = setTimeout(() => {
      setTyping(null);
      setMessages(m => [...m, next]);
      setTick(t => t + 1);
    }, 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [tick]);

  // Loop the cycle so the preview keeps moving
  React.useEffect(() => {
    if (tick === INCOMING.length) {
      const t = setTimeout(() => { setMessages(SEED_MESSAGES); setTick(0); }, 6000);
      return () => clearTimeout(t);
    }
  }, [tick]);

  const channelName = (CHANNELS_TEXT.find(c => c.id === activeText) || CHANNELS_TEXT[0]).name;

  return (
    <div className="prv">
      <div className="prv-titlebar">
        <div className="prv-traffic">
          <span /><span /><span />
        </div>
        <div className="prv-url mono">
          <span className="muted">app.nextalk.io</span>
          <span className="prv-url-sep">/</span>
          <span>nextalk-core</span>
          <span className="prv-url-sep">/</span>
          <span className="gradient-text">#{channelName}</span>
        </div>
        <div className="prv-titlebar-right mono">
          <span className="chip"><span className="dot online" />132 ms p95</span>
        </div>
      </div>

      <div className="prv-body">
        <ServerRail servers={SERVERS} />
        <ChannelList
          activeId={activeText}
          onPick={setActiveText}
          joinedVoice={joinedVoice}
          onJoinVoice={(id) => setJoinedVoice(prev => prev === id ? null : id)}
        />
        <ChatPanel
          channelName={channelName}
          messages={messages}
          typingName={typing}
        />
        <MembersPane />
      </div>
    </div>
  );
}

Object.assign(window, { ProductPreview });
