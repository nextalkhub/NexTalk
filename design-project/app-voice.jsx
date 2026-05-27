/* global React, APP_DATA, Avatar, I */
/* Voice stage — LiveKit-driven (FR-24). What user sees when joined a voice channel.
   Backend: Voice Service issues LiveKit JWT, LiveKit SFU does the rest. */

function VoiceStage({ channel, onLeave }) {
  // Defensive: if accidentally rendered for a non-voice channel, show empty state
  if (!channel || !Array.isArray(channel.users)) {
    return (
      <div className="voice-stage">
        <div className="empty-state">
          <div className="icon-blob"><I.Speaker /></div>
          <h2>Голосовой канал не выбран</h2>
          <p>Кликните по голосовому каналу слева, чтобы подключиться.</p>
        </div>
      </div>
    );
  }

  // Tiles: viewer + channel users
  const tiles = [
    { short: APP_DATA.me.short, name: APP_DATA.me.displayName, hue: APP_DATA.me.hue, self: true, muted: false },
    ...channel.users.map(u => ({ short: u.short, name: u.name, hue: u.hue, muted: u.muted })),
  ];

  // Pick a "speaker" tile that rotates — simulating LiveKit's activeSpeakers event
  const [speakerIdx, setSpeakerIdx] = React.useState(2 < tiles.length ? 2 : 0);
  React.useEffect(() => {
    const t = setInterval(() => {
      setSpeakerIdx(idx => (idx + 1) % tiles.length);
    }, 3500);
    return () => clearInterval(t);
  }, [tiles.length]);

  const [selfMuted, setSelfMuted] = React.useState(false);
  const [selfDeaf, setSelfDeaf] = React.useState(false);

  return (
    <div className="voice-stage">
      <div className="voice-stage-meta">
        <div className="voice-stage-meta-left">
          <h2>{channel.name}</h2>
          <span className="chip is-ok">
            <span className="dot online" />LiveKit подключён
          </span>
        </div>
        <div className="voice-stage-meta-stats">
          <span className="chip">{tiles.length} в комнате</span>
          <span className="chip is-info">SRTP · DTLS 1.2</span>
        </div>
      </div>

      <div className="voice-grid">
        {tiles.map((t, i) => {
          const speaking = i === speakerIdx && !(t.self && selfMuted);
          const muted = t.self ? selfMuted : t.muted;
          return (
            <div
              key={t.short + i}
              className={
                "voice-tile" +
                (t.self ? " is-self" : "") +
                (speaking ? " is-speaking" : "")
              }
            >
              <div className="voice-tile-indicator">
                {muted && <span className="ind muted"><I.MicOff /></span>}
              </div>
              <Avatar short={t.short} hue={t.hue} size={84} />
              <div className="voice-tile-name">{t.name}</div>
              <div className="voice-tile-tags">
                {t.self && <span className="chip is-brand">вы</span>}
              </div>
              <div className="tile-wave">
                {Array.from({ length: 10 }).map((_, k) => <i key={k}/>)}
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
            <span className="chip is-ok">opus · 48 kHz</span>
          </div>
        </div>
        <div className="vc-buttons">
          <button
            className={"vc-btn" + (selfMuted ? " is-muted" : "")}
            onClick={() => setSelfMuted(v => !v)}
            title={selfMuted ? "Включить микрофон" : "Выключить микрофон"}
          >
            {selfMuted ? <I.MicOff /> : <I.Mic />}
          </button>
          <button
            className={"vc-btn" + (selfDeaf ? " is-muted" : "")}
            onClick={() => setSelfDeaf(v => !v)}
            title="Наушники"
          >
            <I.Headset />
          </button>
          <button className="vc-btn" title="Настройки звука" onClick={() => window.__route("settings")}>
            <I.Gear />
          </button>
          <button className="vc-btn is-leave" onClick={onLeave} title="Покинуть">
            <I.PhoneOff /> Отключиться
          </button>
        </div>
      </div>
    </div>
  );
}
window.VoiceStage = VoiceStage;
