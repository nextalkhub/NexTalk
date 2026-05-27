/* global React, CHAT_DATA, getAuthor, avatarBg, initials, Avatar, Icons */
/* Chat content view: messages, composer */

const {
  I_Hash, I_Plus, I_X, I_Send, I_Reply, I_More, I_Emoji, I_At, I_Code, I_Gif,
  I_Bold, I_Pin, I_Trash, I_Pencil, I_Down, I_Reaction
} = window.Icons;

/* ====== Render text content with mentions / channels / inline code ====== */
function renderRich(text, mention) {
  // Very small tokenizer for: @Name, #channel, `code`, **bold**
  const tokens = [];
  const regex = /(@[\wА-Яа-яЁё]+)|(#[\w\-]+)|(`[^`]+`)|(\*\*[^*]+\*\*)/g;
  let lastIndex = 0; let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) tokens.push({ t: "text", v: text.slice(lastIndex, m.index) });
    if (m[1]) {
      const isSelf = mention === "self" && /you|вы|тебя|тебе/i.test(m[1]);
      tokens.push({ t: "mention", v: m[1], self: isSelf });
    }
    else if (m[2]) tokens.push({ t: "channel", v: m[2] });
    else if (m[3]) tokens.push({ t: "code", v: m[3].slice(1, -1) });
    else if (m[4]) tokens.push({ t: "bold", v: m[4].slice(2, -2) });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) tokens.push({ t: "text", v: text.slice(lastIndex) });

  return tokens.map((tk, i) => {
    switch (tk.t) {
      case "mention": return <span key={i} className="mention" style={ tk.self ? { background: "rgba(255,181,71,.18)", color: "var(--mention)" } : null }>{tk.v}</span>;
      case "channel": return <span key={i} className="channel-link">{tk.v}</span>;
      case "code":    return <code key={i}>{tk.v}</code>;
      case "bold":    return <b key={i} style={{ color: "var(--fg-0)" }}>{tk.v}</b>;
      default:        return <React.Fragment key={i}>{tk.v}</React.Fragment>;
    }
  });
}

/* ====== Code block (with naive highlighting) ====== */
function CodeBlock({ lang, body }) {
  // Token-based highlighter
  const highlight = (text) => {
    const lines = text.split("\n");
    return lines.map((ln, i) => {
      const parts = [];
      let rest = ln;
      // Comment
      const cm = rest.match(/(#.*$|\/\/.*$)/);
      let comment = "";
      if (cm) { comment = cm[0]; rest = rest.slice(0, cm.index); }
      // Strings
      const tokens = rest.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g);
      tokens.forEach((t, j) => {
        if (j % 2 === 1) parts.push(<span key={"s"+i+j} className="str">{t}</span>);
        else {
          // numbers + keywords
          const subs = t.split(/(\b(?:const|let|var|function|return|if|else|new|import|from|export|class|extends|public|private|protected|static|using|namespace|async|await|true|false|null|void|int|string|bool|map|filter|reduce|select|where)\b|\$|\b\d+(?:\.\d+)?\b)/g);
          subs.forEach((s, k) => {
            if (/^(const|let|var|function|return|if|else|new|import|from|export|class|extends|public|private|protected|static|using|namespace|async|await|true|false|null|void|int|string|bool|map|filter|reduce|select|where)$/.test(s)) {
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

/* ====== Message ====== */
function Message({ msg, isFirst, isNew, onReply, onReact }) {
  const author = getAuthor(msg.authorId);
  if (!author) return null;
  const time = msg.time;

  return (
    <div className={
      "msg" +
      (isFirst ? " is-first" : "") +
      (msg.isMention ? " is-mention" : "") +
      (isNew ? " is-new" : "")
    }>
      <div className="msg-gutter">
        {isFirst
          ? <Avatar short={author.short} hue={author.hue} size={40} className="msg-avatar" />
          : <span className="msg-time-hover">{time}</span>}
      </div>
      <div className="msg-body">
        {isFirst && (
          <div className="msg-head">
            <span className="msg-author" style={{ color: roleColor(author.role) }}>{author.name.split(" ")[0]}</span>
            {author.role === "Owner" && <span className="msg-role-badge owner">OWNER</span>}
            {author.role === "Admin" && <span className="msg-role-badge admin">ADMIN</span>}
            {author.role === "Bot"   && <span className="msg-role-badge bot">BOT</span>}
            <span className="msg-stamp">сегодня в {time}</span>
          </div>
        )}

        {msg.replyTo && (() => {
          const a = getAuthor(msg.replyTo.authorId);
          return a ? (
            <div className="msg-reply">
              <Avatar short={a.short} hue={a.hue} size={16} />
              <span className="nm">{a.name.split(" ")[0]}</span>
              <span className="tx">{msg.replyTo.text}</span>
            </div>
          ) : null;
        })()}

        <div className="msg-text">
          {renderRich(msg.text, msg.mention)}
          {msg.edited && <span className="msg-edited"> (изменено)</span>}
        </div>

        {msg.code && <CodeBlock lang={msg.code.lang} body={msg.code.body} />}

        {msg.attachments && msg.attachments.map((a, i) => {
          if (a.kind === "image") {
            return (
              <div key={i} className="msg-attach">
                <div className="attach-image">
                  <div className="placeholder" />
                  <span className="label">📊 {a.label}</span>
                </div>
              </div>
            );
          }
          if (a.kind === "file") {
            return (
              <div key={i} className="msg-attach">
                <div className="attach-file">
                  <span className="attach-file-icon"><I_Code /></span>
                  <div>
                    <div className="nm">{a.name}</div>
                    <div className="sz">{a.size}</div>
                  </div>
                  <button className="dl"><I_Down /></button>
                </div>
              </div>
            );
          }
          if (a.kind === "link") {
            return (
              <div key={i} className="link-preview">
                <div className="lp-body">
                  <div className="lp-site">{a.site}</div>
                  <div className="lp-title">{a.title}</div>
                  <div className="lp-desc">{a.desc}</div>
                </div>
                <div className="lp-thumb" />
              </div>
            );
          }
          return null;
        })}

        {msg.reactions && msg.reactions.length > 0 && (
          <div className="reactions">
            {msg.reactions.map((r, i) => (
              <button key={i} className={"reaction" + (r.mine ? " is-self" : "")} onClick={() => onReact && onReact(msg.id, r.emoji)}>
                <span className="emoji">{r.emoji}</span>
                <span className="ct">{r.count}</span>
              </button>
            ))}
            <button className="reaction add-rxn" title="Добавить реакцию"><I_Reaction /></button>
          </div>
        )}

        {msg.thread && (
          <button className="thread-footer">
            <span className="thread-avatars">
              {msg.thread.avatars.map((a, i) => {
                const member = CHAT_DATA.members.find(m => m.short === a);
                return <Avatar key={i} short={a} hue={member ? member.hue : 240} size={16} />;
              })}
            </span>
            <span className="count">{msg.thread.count} ответов</span>
            <span className="time">· последний {msg.thread.lastTime}</span>
            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, color: "var(--fg-2)" }}>Открыть тред →</span>
          </button>
        )}
      </div>

      <div className="msg-actions">
        <button title="Реакция"><I_Emoji /></button>
        <button title="Ответить" onClick={() => onReply && onReply(msg)}><I_Reply /></button>
        <button title="Тред"><I_Thread /></button>
        <button title="Закрепить"><I_Pin /></button>
        <button title="Изменить"><I_Pencil /></button>
        <button title="Ещё"><I_More /></button>
        <button title="Удалить" className="is-danger"><I_Trash /></button>
      </div>
    </div>
  );
}

function roleColor(role) {
  if (role === "Owner") return "#FFD27A";
  if (role === "Admin") return "#C9A8FF";
  if (role === "Bot")   return "var(--info)";
  return "var(--fg-0)";
}

/* ====== Slash / Mention menu ====== */
function CmdMenu({ kind, query, onPick }) {
  let items = [];
  if (kind === "/") {
    items = CHAT_DATA.slashCommands.filter(c => c.cmd.toLowerCase().includes(query.toLowerCase()));
  } else if (kind === "@") {
    items = CHAT_DATA.members
      .filter(m => m.role !== "Bot")
      .filter(m => m.name.toLowerCase().includes(query.toLowerCase()) || m.handle.toLowerCase().includes(query.toLowerCase()));
  } else if (kind === "emoji") {
    items = CHAT_DATA.emojis.map(e => ({ emoji: e }));
  }

  const head = kind === "/" ? "Команды" : kind === "@" ? "Упомянуть участника" : "Эмодзи";

  return (
    <div className="cmd-menu">
      <div className="cmd-menu-head">
        <span className="h">{head}{query ? ` · "${query}"` : ""}</span>
        <span className="h">↑ ↓ выбор · ⏎ вставить · ⎋ закрыть</span>
      </div>
      <div className="cmd-menu-list">
        {kind === "/" && items.map((it, i) => (
          <button key={it.cmd} className={"cmd-item" + (i === 0 ? " is-selected" : "")} onClick={() => onPick(it.cmd + " ")}>
            <span className="ic">/</span>
            <span className="nm">{it.cmd}</span>
            <span className="dc">{it.desc}</span>
            <span className="kbd-hint">{it.kbd}</span>
          </button>
        ))}
        {kind === "@" && items.map((m, i) => (
          <button key={m.id} className={"cmd-item" + (i === 0 ? " is-selected" : "")} onClick={() => onPick("@" + m.name.split(" ")[0] + " ")}>
            <Avatar short={m.short} hue={m.hue} size={28} />
            <span className="nm">{m.name.split(" ")[0]}</span>
            <span className="dc">{m.handle}</span>
            <span className="kbd-hint">{m.role}</span>
          </button>
        ))}
        {kind === "emoji" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, padding: 4 }}>
            {items.map(e => (
              <button key={e.emoji} className="cmd-item" style={{ padding: 6, justifyContent: "center", fontSize: 22 }} onClick={() => onPick(e.emoji)}>
                {e.emoji}
              </button>
            ))}
          </div>
        )}
        {items.length === 0 && (
          <div style={{ padding: 16, color: "var(--fg-2)", fontSize: 13 }}>Нет совпадений</div>
        )}
      </div>
      <div className="cmd-menu-foot">
        <span>TIP · введите <code style={{ fontFamily: "var(--font-mono)", color: "var(--brand-1)" }}>/code js</code> чтобы вставить блок кода</span>
      </div>
    </div>
  );
}

/* ====== Composer ====== */
function Composer({ channelName, replyTo, onCancelReply, onSend }) {
  const [text, setText] = React.useState("");
  const [attachments, setAttachments] = React.useState([]);
  const [menu, setMenu] = React.useState(null); // { kind, query }
  const taRef = React.useRef(null);

  const autosize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(200, el.scrollHeight) + "px";
  };

  React.useEffect(autosize, [text]);

  const onChange = (e) => {
    const v = e.target.value;
    setText(v);

    // Detect slash command or mention at the start of current word
    const caret = e.target.selectionStart;
    const upto = v.slice(0, caret);
    const sl = upto.match(/(^|\s)(\/[\wа-яё-]*)$/i);
    const at = upto.match(/(^|\s)(@[\wа-яё-]*)$/i);
    if (sl)      setMenu({ kind: "/", query: sl[2].slice(1) });
    else if (at) setMenu({ kind: "@", query: at[2].slice(1) });
    else         setMenu(null);
  };

  const insert = (snippet) => {
    setText(t => {
      // Replace the trailing @... or /... fragment with the snippet
      const replaced = t.replace(/(^|\s)([@\/][\wа-яё-]*)$/i, (m, p1) => (p1 || "") + snippet);
      return replaced === t ? t + snippet : replaced;
    });
    setMenu(null);
    setTimeout(() => taRef.current && taRef.current.focus(), 0);
  };

  const handleSend = () => {
    if (!text.trim() && attachments.length === 0) return;
    onSend && onSend({ text: text.trim(), attachments });
    setText("");
    setAttachments([]);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === "Escape") {
      if (menu) setMenu(null);
      else if (replyTo) onCancelReply && onCancelReply();
    }
  };

  const fakeAttach = () => {
    setAttachments(a => [...a, { name: `outbox-graph-${a.length + 1}.png` }]);
  };

  return (
    <div className="composer-wrap">
      {menu && (
        <CmdMenu kind={menu.kind} query={menu.query} onPick={insert} />
      )}
      <div className="composer">
        {replyTo && (() => {
          const a = getAuthor(replyTo.authorId);
          return a ? (
            <div className="composer-reply-bar">
              <I_Reply />
              <span>Ответ <b>{a.name.split(" ")[0]}</b></span>
              <span style={{ color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "40ch" }}>{replyTo.text}</span>
              <button className="close" onClick={onCancelReply}><I_X /></button>
            </div>
          ) : null;
        })()}

        {attachments.length > 0 && (
          <div className="composer-attachments">
            {attachments.map((a, i) => (
              <div key={i} className="composer-attach">
                <div className="ph">📎</div>
                <button className="rm" onClick={() => setAttachments(arr => arr.filter((_, j) => j !== i))}><I_X /></button>
                <div className="nm">{a.name}</div>
              </div>
            ))}
          </div>
        )}

        <div className="composer-editor">
          <button className="composer-attach-btn" title="Прикрепить файл" onClick={fakeAttach}><I_Plus /></button>
          <textarea
            ref={taRef}
            rows={1}
            className="composer-textarea"
            placeholder={`Написать в #${channelName} · введите / для команд`}
            value={text}
            onChange={onChange}
            onKeyDown={onKeyDown}
          />
          <div className="composer-actions">
            <button className="composer-fmt-btn" title="Жирный (⌘B)"><I_Bold /></button>
            <button className="composer-fmt-btn" title="Код (⌘E)"><I_Code /></button>
            <button className="composer-fmt-btn" title="Упомянуть (@)" onClick={() => setMenu({ kind: "@", query: "" })}><I_At /></button>
            <button className="composer-fmt-btn" title="GIF"><I_Gif /></button>
            <button className="composer-fmt-btn" title="Эмодзи" onClick={() => setMenu({ kind: "emoji", query: "" })}><I_Emoji /></button>
            <button
              className="composer-send"
              disabled={!text.trim() && attachments.length === 0}
              onClick={handleSend}
              title="Отправить (⏎)"
            >
              <I_Send />
            </button>
          </div>
        </div>
      </div>
      <div className="composer-foot">
        <span>
          <kbd>⏎</kbd> отправить · <kbd>⇧⏎</kbd> новая строка · <kbd>/</kbd> команды · <kbd>@</kbd> упомянуть
        </span>
        <span>
          <span className="chip is-ok"><span className="dot online" />SignalR подключен</span>
        </span>
      </div>
    </div>
  );
}

/* ====== Chat View ====== */
function ChatView({ channel }) {
  const [messages, setMessages] = React.useState(CHAT_DATA.messages);
  const [replyTo, setReplyTo] = React.useState(null);
  const [typing, setTyping] = React.useState(null);
  const scrollRef = React.useRef(null);

  // Ambient typing loop
  React.useEffect(() => {
    let i = 0;
    const cast = ["Дарья", "Михаил", null, null, "Иван"];
    const t = setInterval(() => {
      setTyping(cast[i % cast.length]);
      i++;
    }, 5500);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, typing]);

  const handleSend = ({ text }) => {
    const newMsg = {
      id: "m" + Date.now(),
      authorId: "ak",
      time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      text,
      _new: true,
      replyTo: replyTo ? { authorId: replyTo.authorId, text: replyTo.text } : null,
    };
    setMessages(prev => [...prev, newMsg]);
    setReplyTo(null);
  };

  return (
    <>
      <div className="chat-scroll" ref={scrollRef}>
        <div className="chat-scroll-inner">
          <div className="chat-welcome">
            <div className="wlc-icon">#</div>
            <h2>Добро пожаловать в #{channel.name}</h2>
            <p>Это самое начало канала. {channel.topic}</p>
          </div>

          <div className="day-divider">
            <div className="line" /><div className="label">сегодня · 25 мая</div><div className="line" />
          </div>

          {messages.slice(0, -2).map((m, i, arr) => (
            <Message
              key={m.id}
              msg={m}
              isFirst={i === 0 || arr[i - 1].authorId !== m.authorId}
              isNew={m._new}
              onReply={setReplyTo}
            />
          ))}

          <div className="new-divider">
            <div className="line" />
            <span>НОВЫЕ СООБЩЕНИЯ</span>
            <div className="line" />
          </div>

          {messages.slice(-2).map((m, i, arr) => (
            <Message
              key={m.id}
              msg={m}
              isFirst={i === 0 || arr[i - 1].authorId !== m.authorId}
              isNew={m._new}
              onReply={setReplyTo}
            />
          ))}

          <div className="typing-bar">
            {typing ? (
              <>
                <span className="typing-dots"><span/><span/><span/></span>
                <span><b>{typing}</b> печатает…</span>
              </>
            ) : <span>&nbsp;</span>}
          </div>
        </div>
      </div>
      <Composer channelName={channel.name} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} onSend={handleSend} />
    </>
  );
}

window.ChatView = ChatView;
