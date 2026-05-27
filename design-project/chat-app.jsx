/* global React, ReactDOM, CHAT_DATA, ServerRail, ChannelSidebar, TopBar, MembersRail, ChatView, VoiceStage, RightRail */

const APP_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "nextalk",
  "density": "comfortable",
  "rightView": "members",
  "showRight": true,
  "fontScale": 1
}/*EDITMODE-END*/;

const APP_PALETTES = {
  nextalk: {
    label: "NexTalk (исходник)",
    "--brand-1": "#4F7CFF",
    "--brand-2": "#9061FF",
    "--brand-3": "#C254FF",
    "--bg-0": "#06070D",
    "--bg-1": "#0B0D17",
    "--bg-2": "#10121E",
    "--bg-3": "#161927",
    "--bg-4": "#1D2134",
    "--bg-5": "#262B41",
    "--grad-brand": "linear-gradient(135deg, #4F7CFF 0%, #9061FF 60%, #C254FF 100%)",
  },
  midnight: {
    label: "Midnight (контрастнее)",
    "--brand-1": "#7C9AFF",
    "--brand-2": "#A78BFA",
    "--brand-3": "#E879F9",
    "--bg-0": "#020308",
    "--bg-1": "#070912",
    "--bg-2": "#0C0E1C",
    "--bg-3": "#121526",
    "--bg-4": "#1A1E33",
    "--bg-5": "#252A48",
    "--grad-brand": "linear-gradient(135deg, #7C9AFF 0%, #A78BFA 60%, #E879F9 100%)",
  },
  emerald: {
    label: "Emerald (другой бренд)",
    "--brand-1": "#10B981",
    "--brand-2": "#22D3EE",
    "--brand-3": "#06B6D4",
    "--bg-0": "#04100C",
    "--bg-1": "#081812",
    "--bg-2": "#0C211B",
    "--bg-3": "#102B23",
    "--bg-4": "#16382E",
    "--bg-5": "#1F4A3D",
    "--grad-brand": "linear-gradient(135deg, #10B981 0%, #22D3EE 100%)",
  },
  graphite: {
    label: "Graphite (monochrome)",
    "--brand-1": "#E5E7EB",
    "--brand-2": "#9CA3AF",
    "--brand-3": "#6B7280",
    "--bg-0": "#06070A",
    "--bg-1": "#0B0C0F",
    "--bg-2": "#101115",
    "--bg-3": "#16171C",
    "--bg-4": "#1D1F24",
    "--bg-5": "#272A30",
    "--grad-brand": "linear-gradient(135deg, #F4F5F7 0%, #9CA3AF 100%)",
  },
};

function App() {
  const [t, setTweak] = useTweaks(APP_TWEAK_DEFAULTS);

  // Apply palette
  React.useEffect(() => {
    const root = document.documentElement;
    const palette = APP_PALETTES[t.palette] || APP_PALETTES.nextalk;
    Object.entries(palette).forEach(([k, v]) => {
      if (k.startsWith("--")) root.style.setProperty(k, v);
    });
    root.style.setProperty("font-size", (14 * (t.fontScale || 1)) + "px");
    root.dataset.density = t.density;
  }, [t.palette, t.fontScale, t.density]);

  // Density tweaks shrink/grow the chat padding
  React.useEffect(() => {
    const root = document.documentElement;
    if (t.density === "cozy") {
      root.style.setProperty("--msg-pad-y", "1px");
    } else if (t.density === "airy") {
      root.style.setProperty("--msg-pad-y", "8px");
    } else {
      root.style.setProperty("--msg-pad-y", "2px");
    }
  }, [t.density]);

  // App state
  const [activeServer, setActiveServer] = React.useState("core");
  const [activeChannelId, setActiveChannelId] = React.useState("general");
  const [channelType, setChannelType] = React.useState("text");
  const [voiceJoinedId, setVoiceJoinedId] = React.useState("war");

  const handlePickChannel = (id, type) => {
    setActiveChannelId(id);
    setChannelType(type);
  };
  const handleJoinVoice = (id) => {
    setActiveChannelId(id);
    setChannelType("voice");
    setVoiceJoinedId(prev => prev === id ? null : id);
  };

  const activeChannel = channelType === "text"
    ? CHAT_DATA.channels.text.find(c => c.id === activeChannelId)
    : CHAT_DATA.channels.voice.find(c => c.id === activeChannelId);

  const isVoice = channelType === "voice";

  return (
    <div className={"app" + (t.showRight ? "" : " no-right")}>
      <ServerRail activeId={activeServer} onSelect={setActiveServer} />
      <ChannelSidebar
        activeChannel={isVoice ? null : activeChannelId}
        onPickChannel={handlePickChannel}
        voiceJoinedId={voiceJoinedId}
        onJoinVoice={handleJoinVoice}
      />
      <TopBar
        channel={activeChannel || { name: "—", topic: "" }}
        view={isVoice ? "voice" : "chat"}
        rightView={t.rightView}
        onRightView={(v) => { setTweak("rightView", v); setTweak("showRight", true); }}
        onToggleRight={(v) => setTweak("showRight", v)}
        isVoice={isVoice}
      />
      <div className="main">
        {isVoice
          ? <VoiceStage channel={activeChannel} />
          : <ChatView channel={activeChannel} />}
      </div>
      {t.showRight && (
        <RightRail view={t.rightView} onView={(v) => setTweak("rightView", v)} />
      )}

      <TweaksPanel title="Tweaks · NexTalk Chat">
        <TweakSection label="Сценарий">
          <TweakRadio
            label="Главный экран"
            value={isVoice ? "voice" : "chat"}
            onChange={(v) => {
              if (v === "chat") {
                setActiveChannelId("general"); setChannelType("text");
              } else {
                setActiveChannelId("war"); setChannelType("voice");
              }
            }}
            options={[
              { value: "chat", label: "Чат" },
              { value: "voice", label: "Голос" },
            ]}
          />
          <TweakSelect
            label="Текстовый канал"
            value={isVoice ? "general" : activeChannelId}
            onChange={(v) => { setActiveChannelId(v); setChannelType("text"); }}
            options={CHAT_DATA.channels.text.map(c => ({ value: c.id, label: "# " + c.name }))}
          />
        </TweakSection>

        <TweakSection label="Правая панель">
          <TweakToggle
            label="Показывать правую панель"
            value={t.showRight}
            onChange={(v) => setTweak("showRight", v)}
          />
          <TweakSelect
            label="Содержимое"
            value={t.rightView}
            onChange={(v) => setTweak("rightView", v)}
            options={[
              { value: "members", label: "Участники" },
              { value: "thread",  label: "Треды" },
              { value: "pinned",  label: "Закреплённое" },
              { value: "search",  label: "Поиск" },
              { value: "inbox",   label: "Входящие" },
            ]}
          />
        </TweakSection>

        <TweakSection label="Внешний вид">
          <TweakSelect
            label="Палитра"
            value={t.palette}
            onChange={(v) => setTweak("palette", v)}
            options={Object.keys(APP_PALETTES).map(k => ({ value: k, label: APP_PALETTES[k].label }))}
          />
          <TweakRadio
            label="Плотность"
            value={t.density}
            onChange={(v) => setTweak("density", v)}
            options={[
              { value: "cozy", label: "Cozy" },
              { value: "comfortable", label: "Обычно" },
              { value: "airy", label: "Воздух" },
            ]}
          />
          <TweakSlider
            label="Масштаб"
            min={0.9} max={1.15} step={0.01}
            value={t.fontScale}
            onChange={(v) => setTweak("fontScale", v)}
            unit="×"
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
