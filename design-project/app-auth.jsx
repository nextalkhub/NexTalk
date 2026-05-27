/* global React, APP_DATA, I, Avatar, avatarBg */
/* Auth, OIDC callback, invite acceptance — match real Zitadel/OIDC flow. */

function AuthPage({ onLogin, error }) {
  const [loading, setLoading] = React.useState(false);
  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => onLogin(), 1200);
  };
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-mark">N</div>
        <h1>Войти в NexTalk</h1>
        <p className="sub">
          Авторизация через Zitadel · ваш единый identity provider.
          Учётные данные NexTalk не хранит.
        </p>

        <div className="auth-features">
          <div className="auth-feature">
            <span className="ic"><I.Check /></span>
            <span>OpenID Connect · PKCE flow, без секрета на клиенте</span>
          </div>
          <div className="auth-feature">
            <span className="ic"><I.Check /></span>
            <span>JWT с claims <code className="mono" style={{ fontSize: 11 }}>sub</code>, <code className="mono" style={{ fontSize: 11 }}>email</code>, <code className="mono" style={{ fontSize: 11 }}>preferred_username</code></span>
          </div>
          <div className="auth-feature">
            <span className="ic"><I.Check /></span>
            <span>2FA, политики паролей и восстановление — в Zitadel</span>
          </div>
        </div>

        <button
          className="btn-primary-lg"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="callback-spinner" style={{ width: 18, height: 18, margin: 0, borderWidth: 2 }} />
              Перенаправляем в Zitadel...
            </>
          ) : (
            <>
              <I.Shield />
              Продолжить через Zitadel
            </>
          )}
        </button>

        {error && (
          <div className="auth-error">
            <strong>Ошибка входа.</strong> {error}
          </div>
        )}

        <div className="auth-foot">
          <span className="chip mono">prod · zitadel.nextalk.io</span>
        </div>
      </div>
    </div>
  );
}
window.AuthPage = AuthPage;

function CallbackPage({ onDone, onError }) {
  const [step, setStep] = React.useState(0);
  const steps = [
    { label: "Проверяем state и nonce" },
    { label: "Меняем authorization code на токен" },
    { label: "Валидируем подпись JWT" },
    { label: "Сохраняем сессию и переходим..." },
  ];
  React.useEffect(() => {
    const timers = steps.map((_, i) =>
      setTimeout(() => {
        if (i < steps.length - 1) setStep(i + 1);
        else setTimeout(() => onDone(), 600);
      }, 700 * (i + 1))
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card callback-card">
        <div className="callback-spinner" />
        <h1>Авторизуемся...</h1>
        <p className="sub">Не закрывайте вкладку — обмен токенами займёт несколько секунд.</p>

        <div className="callback-steps">
          {steps.map((s, i) => (
            <div
              key={i}
              className={
                "callback-step " +
                (i < step ? "done" : i === step ? "active" : "")
              }
            >
              <span className="step-ic">
                {i < step ? <I.Check /> : i === step ? "●" : "○"}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.CallbackPage = CallbackPage;

function InvitePage({ inviteCode, state, onAccept, onDecline }) {
  // state: 'preview' | 'banned' | 'expired' | 'invalid' | 'consumed'
  const server = APP_DATA.servers[1]; // Design Guild
  const invite = APP_DATA.invites[0];

  if (state === "invalid") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-mark" style={{ background: "linear-gradient(135deg, #6B7280, #4B5563)" }}>?</div>
          <h1>Приглашение не найдено</h1>
          <p className="sub">Код <code className="mono">{inviteCode}</code> не существует или был отозван.</p>
          <button className="btn-primary-lg" onClick={onDecline}>Вернуться</button>
        </div>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-mark" style={{ background: "linear-gradient(135deg, #F5C451, #D97757)" }}>!</div>
          <h1>Срок действия истёк</h1>
          <p className="sub">Это приглашение в <strong style={{ color: "var(--fg-0)" }}>{server.name}</strong> уже неактуально. Попросите у владельца новую ссылку.</p>
          <button className="btn-primary-lg" onClick={onDecline}>Понятно</button>
        </div>
      </div>
    );
  }

  if (state === "consumed") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-mark" style={{ background: "linear-gradient(135deg, #F5C451, #D97757)" }}>!</div>
          <h1>Лимит использований исчерпан</h1>
          <p className="sub">Этой ссылкой воспользовались {invite.maxUses} раз. Попросите у владельца новую.</p>
          <button className="btn-primary-lg" onClick={onDecline}>Понятно</button>
        </div>
      </div>
    );
  }

  if (state === "banned") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-mark" style={{ background: "linear-gradient(135deg, #FF5A6E, #C254FF)" }}>×</div>
          <h1>Доступ заблокирован</h1>
          <p className="sub">Вы забанены в <strong style={{ color: "var(--fg-0)" }}>{server.name}</strong>. Свяжитесь с владельцем сервера, чтобы оспорить решение.</p>
          <div className="invite-banned">
            <div style={{ marginBottom: 6 }}><b>Причина бана:</b></div>
            <div style={{ color: "var(--fg-2)" }}>Нарушение правил канала #общий</div>
          </div>
          <button className="btn-primary-lg" onClick={onDecline}>Понятно</button>
        </div>
      </div>
    );
  }

  // preview
  return (
    <div className="auth-page">
      <div className="auth-card invite-card">
        <div className="invite-banner" />

        <div className="invite-meta">
          <div className="ic">{server.letter}</div>
          <div>
            <div className="invite-name">{server.name}</div>
            <div className="invite-sub">Приглашение от <strong style={{ color: "var(--fg-0)" }}>{invite.createdBy}</strong></div>
            <div className="invite-presence">
              <span className="dot online" />
              <b style={{ color: "var(--fg-0)" }}>{server.online}</b> в сети · <b style={{ color: "var(--fg-0)" }}>{server.members}</b> участников
            </div>
          </div>
        </div>

        <div className="invite-detail-grid">
          <div className="invite-detail">
            <div className="lbl">КОД</div>
            <div className="val mono">{inviteCode}</div>
          </div>
          <div className="invite-detail">
            <div className="lbl">ДЕЙСТВУЕТ ДО</div>
            <div className="val">{invite.expiresAt || "—"}</div>
          </div>
          <div className="invite-detail">
            <div className="lbl">ИСПОЛЬЗОВАНИЙ</div>
            <div className="val mono">{invite.uses} / {invite.maxUses || "∞"}</div>
          </div>
          <div className="invite-detail">
            <div className="lbl">ВАША РОЛЬ</div>
            <div className="val">Member</div>
          </div>
        </div>

        <div className="invite-actions">
          <button className="btn-secondary" onClick={onDecline}>Не сейчас</button>
          <button className="btn-primary" onClick={onAccept}>
            Присоединиться к {server.name}
            <I.ChevRight />
          </button>
        </div>

        <div className="auth-foot" style={{ marginTop: 20 }}>
          <span className="chip mono"><span className="dot online" />invite.api.nextalk.io</span>
        </div>
      </div>
    </div>
  );
}
window.InvitePage = InvitePage;
