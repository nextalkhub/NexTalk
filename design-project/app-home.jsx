/* global React, APP_DATA, Avatar, I */
/* Home (empty state when no server selected) */

function HomePage({ onOpenCreateServer }) {
  return (
    <div className="home">
      <div className="home-inner">
        <div className="home-mark">N</div>
        <h1>Привет, {APP_DATA.me.displayName.split(" ")[0]}</h1>
        <p>
          Выберите сервер слева, чтобы начать общаться, или создайте новый.
          Принять приглашение можно по ссылке вида <code className="mono" style={{ fontSize: 12 }}>nextalk.io/invite/&lt;код&gt;</code>.
        </p>
        <div className="home-cards">
          <div className="home-card" onClick={onOpenCreateServer}>
            <div className="ic"><I.Plus /></div>
            <h3>Создать сервер</h3>
            <p>Свой сервер с каналами и участниками. Вы становитесь Owner.</p>
          </div>
          <div className="home-card" onClick={() => window.__route("settings")}>
            <div className="ic"><I.Gear /></div>
            <h3>Настройки приложения</h3>
            <p>Тема, плотность, микрофон, тихие часы.</p>
          </div>
        </div>

        <div style={{ marginTop: 40, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="chip mono">
            <span className="dot online" />SignalR подключён
          </span>
          <span className="chip mono">
            <span className="dot online" />LiveKit готов
          </span>
          <span className="chip is-info mono">Zitadel · {APP_DATA.me.handle}</span>
          <span className="chip mono">сессия истекает через 7ч 59м</span>
        </div>
      </div>
    </div>
  );
}
window.HomePage = HomePage;
