/* global React, APP_DATA, getMember, avatarBg, Avatar, I */
/* Chat view — strictly what the MVP backend supports:
   FR-08 send, FR-09 history, FR-10 delete. No reactions/edit/threads/pin/mentions. */

function CodeBlock({ lang, body }) {
  const highlight = (text) => {
    const lines = text.split("\n");
    return lines.map((ln, i) => {
      const parts = [];
      let rest = ln;
      const cm = rest.match(/(#.*$|\/\/.*$)/);
      let comment = "";
      if (cm) { comment = cm[0]; rest = rest.slice(0, cm.index); }
      const tokens = rest.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g);
      tokens.forEach((t, j) => {
        if (j % 2 === 1) parts.push(<span key={"s"+i+j} className="str">{t}</span>);
        else {
          const subs = t.split(/(\b(?:const|let|var|function|return|if|else|new|import|from|export|class|extends|public|private|protected|static|using|namespace|async|await|true|false|null|void|int|string|bool)\b|\$|\b\d+(?:\.\d+)?\b)/g);
          subs.forEach((s, k) => {
            if (/^(const|let|var|function|return|if|else|new|import|from|export|class|extends|public|private|protected|static|using|namespace|async|await|true|false|null|void|int|string|bool)$/.test(s)) {
              parts.push(<span key={"k"+i+j+k} className="kw">{s}</span>);
            } else if (/^\d/.test(s)) {
              parts.push(<span key={"n"+i+j+k} className="num">{s}</span>);
            } else if (s === "$") {
              parts.push(<span key={"p"+i+j+k} className="fn">{s}</span>);
            } else {
              parts.push(<React.Fragment key={"t"+i+j+k}>{s}</React.Fragment>);
            }
          });
        }
      });
      if (comment) parts.push(<span key={"c"+i} className="cm">{comment}</span>);
      return <div key={i}>{parts.length ? parts : "\u00a0"}</div>;
    });
  };

  return (
    <div className="code-block">
      <div className="code-block-head">
        <span className="lang">{lang}</span>
        <button className="copy">copy</button>
      </div>
      <pre>{highlight(body)}</pre>
    </div>
  );
}

function Message({ msg, isFirst, isNew, canDelete, onDelete }) {
  const author = getMember(msg.authorId);
  if (!author) return null;

  // multiline support
  const renderText = (t) => {
    return t.split("\n").map((line, i) => (
      <React.Fragment key={i}>
        {i > 0 && <br />}{line}
      </React.Fragment>
    ));
  };

  return (
    <div className={"msg" + (isFirst ? " is-first" : "") + (isNew ? " is-new" : "")}>
      <div className="msg-gutter">
        {isFirst
          ? <Avatar short={author.short} hue={author.hue} size={40} className="msg-avatar" />
          : <span className="msg-time-hover">{msg.time}</span>}
      </div>
      <div className="msg-body">
        {isFirst && (
          <div className="msg-head">
            <span className="msg-author" style={{ color: roleColor(author.role) }}>
              {author.name.split(" ")[0]}
            </span>
            {author.role === "Owner" && <span className="msg-role-badge owner">OWNER</span>}
            {author.role === "Admin" && <span className="msg-role-badge admin">ADMIN</span>}
            <span className="msg-stamp">сегодня в {msg.time}</span>
          </div>
        )}

        <div className="msg-text">
          {renderText(msg.text)}
        </div>

        {msg.code && <CodeBlock lang={msg.code.lang} body={msg.code.body} />}
      </div>

      {canDelete && (
        <div className="msg-actions">
          <button title="Удалить сообщение" className="is-danger" onClick={() => onDelete(msg.id)}>
            <I.Trash />
          </button>
        </div>
      )}
    </div>
  );
}

function roleColor(role) {
  if (role === "Owner") return "#FFD27A";
  if (role === "Admin") return "#C9A8FF";
  return "var(--fg-0)";
}

function Composer({ channelName, onSend }) {
  const [text, setText] = React.useState("");
  const taRef = React.useRef(null);

  const autosize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(200, el.scrollHeight) + "px";
  };

  React.useEffect(autosize, [text]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="composer-wrap">
      <div className="composer">
        <div className="composer-editor">
          <textarea
            ref={taRef}
            rows={1}
            className="composer-textarea"
            placeholder={`Написать в #${channelName}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <div className="composer-actions">
            <button
              className="composer-send"
              disabled={!text.trim()}
              onClick={handleSend}
              title="Отправить (⏎)"
            >
              <I.Send />
            </button>
          </div>
        </div>
      </div>
      <div className="composer-foot">
        <span>
          <kbd>⏎</kbd> отправить · <kbd>⇧⏎</kbd> новая строка
        </span>
        <span>
          <span className="chip is-ok"><span className="dot online" />подключено</span>
        </span>
      </div>
    </div>
  );
}

function ChatView({ channel, server }) {
  const [messages, setMessages] = React.useState(APP_DATA.messages);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const canManage = server.role === "Owner" || server.role === "Admin";

  const handleSend = (text) => {
    const newMsg = {
      id: "01HRZ" + Date.now(),
      authorId: "vk",
      time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      text,
      _new: true,
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleDelete = (msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  return (
    <>
      <div className="chat-scroll" ref={scrollRef}>
        <div className="chat-scroll-inner">
          <div className="chat-welcome">
            <div className="wlc-icon">#</div>
            <h2>Добро пожаловать в #{channel.name}</h2>
            <p>Это самое начало канала. Сообщения хранятся в Messaging Service · cursor‑based история, доставка через SignalR.</p>
          </div>

          <div className="day-divider">
            <div className="line" />
            <div className="label">сегодня · 25 мая</div>
            <div className="line" />
          </div>

          {messages.map((m, i, arr) => {
            const canDelete = canManage || m.authorId === APP_DATA.me.sub.slice(0, 2) || m.authorId === "vk";
            return (
              <Message
                key={m.id}
                msg={m}
                isFirst={i === 0 || arr[i - 1].authorId !== m.authorId}
                isNew={m._new}
                canDelete={canDelete}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      </div>
      <Composer channelName={channel.name} onSend={handleSend} />
    </>
  );
}
window.ChatView = ChatView;
