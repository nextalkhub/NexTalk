/* global React, ReactDOM, APP_DATA, ServerRail, ChannelSidebar, TopBarChannel,
   MembersPanel, ChatView, VoiceStage, HomePage, AuthPage, CallbackPage, InvitePage,
   ServerSettings, AppSettings, ProfilePage,
   CreateServerModal, CreateChannelModal, CreateInviteModal, KickModal, BanModal,
   DeleteServerModal, LogoutModal, Toast, NotFoundPage, ErrorPage */

const APP_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "nextalk",
  "density": "comfortable",
  "fontScale": 1,
  "screen": "channel-chat"
}/*EDITMODE-END*/;

const APP_PALETTES = {
  nextalk: {
    label: "NexTalk",
    desc: "Фирменный сине‑фиолетовый",
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
    label: "Midnight",
    desc: "Более контрастная тёмная",
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
    label: "Emerald",
    desc: "Зелёный для альтернативного бренда",
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
    label: "Graphite",
    desc: "Монохромная",
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

  // Routing
  const [screen, setScreenRaw] = React.useState(t.screen || "channel-chat");
  // When jumping straight to channel-voice via Tweaks, make sure we have a voice channel selected
  const [activeServerId, setActiveServerId] = React.useState("core");
  const [activeChannelId, setActiveChannelId] = React.useState("general");
  const [channelType, setChannelType] = React.useState("text");
  const [joinedVoiceId, setJoinedVoiceId] = React.useState(null);
  const [showMembers, setShowMembers] = React.useState(true);

  const setScreen = React.useCallback((next) => {
    if (next === "channel-voice" && channelType !== "voice") {
      const firstVoice = APP_DATA.channels.voice[0];
      if (firstVoice) {
        setActiveChannelId(firstVoice.id);
        setChannelType("voice");
        setJoinedVoiceId(firstVoice.id);
      }
    }
    if (next === "channel-chat" && channelType !== "text") {
      setActiveChannelId("general");
      setChannelType("text");
    }
    setScreenRaw(next);
  }, [channelType]);

  React.useEffect(() => { setTweak("screen", screen); }, [screen]);
  React.useEffect(() => {
    window.__route = (s) => setScreen(s);
    return () => { delete window.__route; };
  }, []);

  // Apply palette/density/scale
  React.useEffect(() => {
    const root = document.documentElement;
    const palette = APP_PALETTES[t.palette] || APP_PALETTES.nextalk;
    Object.entries(palette).forEach(([k, v]) => {
      if (k.startsWith("--")) root.style.setProperty(k, v);
    });
    root.style.setProperty("font-size", (14 * (t.fontScale || 1)) + "px");
    root.dataset.density = t.density;
  }, [t.palette, t.fontScale, t.density]);

  // App state
  // Modals
  const [modal, setModal] = React.useState(null); // {kind: 'create-server'|...|'kick'|'ban'|'delete'}, payload
  const [toast, setToast] = React.useState(null);

  const showToast = (message, kind = "ok") => setToast({ message, kind });

  const activeServer = APP_DATA.servers.find(s => s.id === activeServerId);

  const activeChannel = channelType === "text"
    ? APP_DATA.channels.text.find(c => c.id === activeChannelId)
    : APP_DATA.channels.voice.find(c => c.id === activeChannelId);

  const handleGoHome = () => setScreen("home");

  // Routes that don't show the app shell
  const isFullscreen = ["auth", "auth-callback", "invite", "invite-banned", "invite-expired",
                        "invite-consumed", "invite-invalid", "404", "500"].includes(screen);

  if (screen === "auth") {
    return <>
      <AuthPage onLogin={() => setScreen("auth-callback")} />
      {tweaksPanel(t, setTweak, screen, setScreen, APP_PALETTES)}
    </>;
  }
  if (screen === "auth-callback") {
    return <>
      <CallbackPage onDone={() => setScreen("home")} />
      {tweaksPanel(t, setTweak, screen, setScreen, APP_PALETTES)}
    </>;
  }
  if (screen === "invite")          return <><InvitePage inviteCode="k4t-pony-42" state="preview"  onAccept={() => { setScreen("channel-chat"); showToast("Вы присоединились к серверу"); }} onDecline={() => setScreen("home")} />{tweaksPanel(t, setTweak, screen, setScreen, APP_PALETTES)}</>;
  if (screen === "invite-banned")   return <><InvitePage inviteCode="k4t-pony-42" state="banned"   onDecline={() => setScreen("home")} />{tweaksPanel(t, setTweak, screen, setScreen, APP_PALETTES)}</>;
  if (screen === "invite-expired")  return <><InvitePage inviteCode="k4t-pony-42" state="expired"  onDecline={() => setScreen("home")} />{tweaksPanel(t, setTweak, screen, setScreen, APP_PALETTES)}</>;
  if (screen === "invite-consumed") return <><InvitePage inviteCode="k4t-pony-42" state="consumed" onDecline={() => setScreen("home")} />{tweaksPanel(t, setTweak, screen, setScreen, APP_PALETTES)}</>;
  if (screen === "invite-invalid")  return <><InvitePage inviteCode="x4-broken"   state="invalid"  onDecline={() => setScreen("home")} />{tweaksPanel(t, setTweak, screen, setScreen, APP_PALETTES)}</>;
  if (screen === "404")             return <><NotFoundPage onHome={handleGoHome} />{tweaksPanel(t, setTweak, screen, setScreen, APP_PALETTES)}</>;
  if (screen === "500")             return <><ErrorPage onHome={handleGoHome} code="503" message="Сервис недоступен" />{tweaksPanel(t, setTweak, screen, setScreen, APP_PALETTES)}</>;

  // App shell with rail+sidebar+main+(members)
  const showRightRail = showMembers && (screen === "channel-chat" || screen === "channel-voice");

  return (
    <>
      <div className={"app app-mvp" + (showRightRail ? "" : " no-right")}>
        <ServerRail
          activeId={screen === "home" || screen === "settings" || screen === "profile" ? null : activeServerId}
          onSelect={(id) => {
            setActiveServerId(id);
            setActiveChannelId("general");
            setChannelType("text");
            setScreen("channel-chat");
          }}
          onGoHome={handleGoHome}
          onOpenCreateServer={() => setModal({ kind: "create-server" })}
        />

        {screen === "home" ? (
          <>
            <div className="side">
              <div className="side-banner" style={{ background: "linear-gradient(135deg, #4F7CFF, #9061FF)" }}>
                <div className="side-guild">
                  <div className="side-guild-name">Главная</div>
                  <div className="side-guild-meta">личное пространство</div>
                </div>
              </div>
              <div className="side-list">
                <div className="side-section">
                  <div className="side-section-h">
                    <span>навигация</span>
                  </div>
                  <div className="side-rows">
                    <div className="side-row is-active" role="button" tabIndex={0}>
                      <span style={{ color: "var(--brand-1)" }}><I.Home /></span>
                      <span className="side-row-name">Главная</span>
                    </div>
                    <div className="side-row" role="button" tabIndex={0} onClick={() => setScreen("profile")}>
                      <span><I.Users /></span>
                      <span className="side-row-name">Профиль</span>
                    </div>
                    <div className="side-row" role="button" tabIndex={0} onClick={() => setScreen("settings")}>
                      <span><I.Gear /></span>
                      <span className="side-row-name">Настройки</span>
                    </div>
                  </div>
                </div>
              </div>
              <SelfPanelInline onOpenSettings={() => setScreen("settings")} />
            </div>
            <div className="top" />
            <div className="main">
              <HomePage onOpenCreateServer={() => setModal({ kind: "create-server" })} />
            </div>
          </>
        ) : screen === "settings" ? (
          <>
            <ChannelSidebar
              server={activeServer}
              activeChannelId={activeChannelId}
              channelType={channelType}
              joinedVoiceId={joinedVoiceId}
              onPickChannel={(id) => { setActiveChannelId(id); setChannelType("text"); setScreen("channel-chat"); }}
              onJoinVoice={(id) => { setActiveChannelId(id); setChannelType("voice"); setJoinedVoiceId(id); setScreen("channel-voice"); }}
              onLeaveVoice={() => setJoinedVoiceId(null)}
              onOpenCreateChannel={() => setModal({ kind: "create-channel" })}
              onOpenServerSettings={() => setScreen("server-settings")}
            />
            <AppSettings
              onClose={() => setScreen("channel-chat")}
              tweaks={t}
              setTweak={setTweak}
              palettes={APP_PALETTES}
            />
          </>
        ) : screen === "profile" ? (
          <>
            <ChannelSidebar
              server={activeServer}
              activeChannelId={activeChannelId}
              channelType={channelType}
              joinedVoiceId={joinedVoiceId}
              onPickChannel={(id) => { setActiveChannelId(id); setChannelType("text"); setScreen("channel-chat"); }}
              onJoinVoice={(id) => { setActiveChannelId(id); setChannelType("voice"); setJoinedVoiceId(id); setScreen("channel-voice"); }}
              onLeaveVoice={() => setJoinedVoiceId(null)}
              onOpenCreateChannel={() => setModal({ kind: "create-channel" })}
              onOpenServerSettings={() => setScreen("server-settings")}
            />
            <ProfilePage onClose={() => setScreen("channel-chat")} />
          </>
        ) : screen === "server-settings" ? (
          <>
            <ChannelSidebar
              server={activeServer}
              activeChannelId={activeChannelId}
              channelType={channelType}
              joinedVoiceId={joinedVoiceId}
              onPickChannel={(id) => { setActiveChannelId(id); setChannelType("text"); setScreen("channel-chat"); }}
              onJoinVoice={(id) => { setActiveChannelId(id); setChannelType("voice"); setJoinedVoiceId(id); setScreen("channel-voice"); }}
              onLeaveVoice={() => setJoinedVoiceId(null)}
              onOpenCreateChannel={() => setModal({ kind: "create-channel" })}
              onOpenServerSettings={() => setScreen("server-settings")}
            />
            <ServerSettings
              server={activeServer}
              onClose={() => setScreen("channel-chat")}
              onDeleteServer={() => setModal({ kind: "delete-server" })}
              onCreateChannel={() => setModal({ kind: "create-channel" })}
              onCreateInvite={() => setModal({ kind: "create-invite" })}
              onKick={(m) => setModal({ kind: "kick", member: m })}
              onBan={(m) => setModal({ kind: "ban", member: m })}
            />
          </>
        ) : (
          <>
            <ChannelSidebar
              server={activeServer}
              activeChannelId={activeChannelId}
              channelType={channelType}
              joinedVoiceId={joinedVoiceId}
              onPickChannel={(id) => { setActiveChannelId(id); setChannelType("text"); setScreen("channel-chat"); }}
              onJoinVoice={(id) => {
                if (joinedVoiceId === id) {
                  setJoinedVoiceId(null);
                  setScreen("channel-chat");
                } else {
                  setActiveChannelId(id);
                  setChannelType("voice");
                  setJoinedVoiceId(id);
                  setScreen("channel-voice");
                  showToast("Подключено к голосовому каналу");
                }
              }}
              onLeaveVoice={() => { setJoinedVoiceId(null); setScreen("channel-chat"); }}
              onOpenCreateChannel={() => setModal({ kind: "create-channel" })}
              onOpenServerSettings={() => setScreen("server-settings")}
            />

            <TopBarChannel
              server={activeServer}
              channel={activeChannel || { name: "—" }}
              channelType={channelType}
              membersOpen={showMembers}
              onOpenMembers={() => setShowMembers(v => !v)}
            />

            <div className="main">
              {screen === "channel-voice" && activeChannel
                ? <VoiceStage channel={activeChannel} onLeave={() => { setJoinedVoiceId(null); setScreen("channel-chat"); }} />
                : <ChatView channel={activeChannel} server={activeServer} />}
            </div>

            {showRightRail && <MembersPanel />}
          </>
        )}
      </div>

      {/* Modals */}
      {modal && modal.kind === "create-server" && (
        <CreateServerModal
          onClose={() => setModal(null)}
          onCreate={(name) => showToast(`Сервер «${name}» создан`)}
        />
      )}
      {modal && modal.kind === "create-channel" && (
        <CreateChannelModal
          onClose={() => setModal(null)}
          onCreate={(name, type) => showToast(`Канал #${name} (${type}) создан`)}
        />
      )}
      {modal && modal.kind === "create-invite" && (
        <CreateInviteModal
          onClose={() => setModal(null)}
          onCreate={(inv) => showToast(`Приглашение ${inv.code} создано`)}
        />
      )}
      {modal && modal.kind === "kick" && (
        <KickModal
          member={modal.member}
          onClose={() => setModal(null)}
          onConfirm={(m) => showToast(`${m.name.split(" ")[0]} кикнут`)}
        />
      )}
      {modal && modal.kind === "ban" && (
        <BanModal
          member={modal.member}
          onClose={() => setModal(null)}
          onConfirm={(m) => showToast(`${m.name.split(" ")[0]} забанен`, "warn")}
        />
      )}
      {modal && modal.kind === "delete-server" && (
        <DeleteServerModal
          server={activeServer}
          onClose={() => setModal(null)}
          onConfirm={() => { showToast(`Сервер удалён`, "warn"); setScreen("home"); }}
        />
      )}
      {modal && modal.kind === "logout" && (
        <LogoutModal
          onClose={() => setModal(null)}
          onConfirm={() => setScreen("auth")}
        />
      )}

      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}

      {/* Reconnecting banner — toggle from tweaks */}
      {t.showReconnecting && (
        <div className="reconnect-banner">
          <span className="spin" />
          Соединение потеряно. Восстанавливаем... (попытка 2)
        </div>
      )}

      {tweaksPanel(t, setTweak, screen, setScreen, APP_PALETTES)}
    </>
  );
}

function SelfPanelInline({ onOpenSettings }) {
  return (
    <div className="side-self">
      <Avatar short={APP_DATA.me.short} hue={APP_DATA.me.hue} size={32} />
      <div className="side-self-text">
        <div className="side-self-name">{APP_DATA.me.displayName}</div>
        <div className="side-self-status">{APP_DATA.me.handle} · в сети</div>
      </div>
      <div className="side-self-actions">
        <button className="icon-btn" onClick={onOpenSettings} title="Настройки"><I.Gear /></button>
      </div>
    </div>
  );
}

function tweaksPanel(t, setTweak, screen, setScreen, palettes) {
  const screens = [
    { value: "auth",             label: "Auth · вход" },
    { value: "auth-callback",    label: "Auth · OIDC callback" },
    { value: "invite",           label: "Invite · превью" },
    { value: "invite-banned",    label: "Invite · банлист" },
    { value: "invite-expired",   label: "Invite · истекло" },
    { value: "invite-consumed",  label: "Invite · лимит" },
    { value: "invite-invalid",   label: "Invite · неверный код" },
    { value: "home",             label: "Главная (без сервера)" },
    { value: "channel-chat",     label: "Канал · чат" },
    { value: "channel-voice",    label: "Канал · голос" },
    { value: "server-settings",  label: "Настройки сервера" },
    { value: "settings",         label: "Настройки приложения" },
    { value: "profile",          label: "Профиль" },
    { value: "404",              label: "404 · не найдено" },
    { value: "500",              label: "503 · сервис недоступен" },
  ];

  return (
    <TweaksPanel title="Tweaks · NexTalk product">
      <TweakSection label="Навигация">
        <TweakSelect
          label="Экран"
          value={screen}
          onChange={(v) => setScreen(v)}
          options={screens}
        />
        <TweakToggle
          label="Banner: соединение потеряно"
          value={!!t.showReconnecting}
          onChange={(v) => setTweak("showReconnecting", v)}
        />
      </TweakSection>

      <TweakSection label="Внешний вид">
        <TweakSelect
          label="Палитра"
          value={t.palette}
          onChange={(v) => setTweak("palette", v)}
          options={Object.keys(palettes).map(k => ({ value: k, label: palettes[k].label }))}
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
          label="Масштаб шрифта"
          min={0.9} max={1.15} step={0.01}
          value={t.fontScale}
          onChange={(v) => setTweak("fontScale", v)}
          unit="×"
        />
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
