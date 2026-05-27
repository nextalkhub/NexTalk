/* global React */

/* ====== Top Nav ====== */
function TopNav() {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={"nav " + (scrolled ? "is-scrolled" : "")}>
      <div className="container nav-inner">
        <a href="#top" className="nav-brand">
          <span className="mark">N</span>
          <span className="nav-wordmark">NexTalk</span>
          <span className="chip mono nav-version">v0.9 · MVP</span>
        </a>
        <nav className="nav-links">
          <a href="#features">Возможности</a>
          <a href="#preview">Превью</a>
          <a href="#architecture">Архитектура</a>
          <a href="#reliability">Надёжность</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="nav-actions">
          <a href="#" className="btn btn-ghost btn-sm">Войти</a>
          <a href="#cta" className="btn btn-primary btn-sm">Создать сервер</a>
        </div>
      </div>
    </header>
  );
}

/* ====== Hero ====== */
function Hero({ showFloats = true, showMarquee = true }) {
  return (
    <section id="top" className="hero">
      <div className="grid-bg" />
      <div className="container hero-inner">
        <div className="hero-copy">
          <span className="chip mono hero-badge">
            <span className="dot online" />
            open source · k8s‑ready · low‑latency
          </span>
          <h1 className="h1">
            Общение для команд,<br />
            <span className="gradient-text">без компромиссов.</span>
          </h1>
          <p className="lead">
            NexTalk — самохостимая платформа для серверов, текстовых
            и голосовых каналов. Микросервисы на .NET, WebRTC через LiveKit,
            Outbox‑паттерн для гарантированной доставки. Архитектура готова к E2EE.
          </p>
          <div className="hero-cta">
            <a href="#cta" className="btn btn-primary">
              Запустить за минуту
              <ArrowIcon />
            </a>
            <a href="chat.html" className="btn btn-secondary">
              <PlayIcon /> Открыть приложение
            </a>
          </div>
          <div className="hero-stats">
            {[
              { v: "<200ms", l: "ACK p95" },
              { v: "<100ms", l: "голос end‑to‑end" },
              { v: "99%",    l: "uptime SLO" },
              { v: "12",     l: "контейнеров под k3s" },
            ].map((s, i) => (
              <div className="hero-stat" key={i}>
                <div className="hero-stat-v">{s.v}</div>
                <div className="hero-stat-l mono">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container hero-preview-wrap">
        <ProductPreview />
        {showFloats && (
        <div className="hero-preview-floats">
          <FloatCard top="-22px" left="-18px" delay="0s">
            <span className="dot online pulse" />
            <div>
              <div className="float-title mono">presence.online</div>
              <div className="float-sub muted">heartbeat 20s · TTL 30s</div>
            </div>
          </FloatCard>
          <FloatCard bottom="60px" right="-20px" delay=".4s">
            <span className="float-icon"><ShieldIcon /></span>
            <div>
              <div className="float-title mono">circuit breaker</div>
              <div className="float-sub muted">5 ошибок / 30s → OPEN</div>
            </div>
          </FloatCard>
          <FloatCard bottom="-22px" left="120px" delay=".8s">
            <span className="float-icon" style={{ color: "var(--info)" }}><BoltIcon /></span>
            <div>
              <div className="float-title mono">outbox → broadcast</div>
              <div className="float-sub muted">at‑least‑once · 100ms poll</div>
            </div>
          </FloatCard>
        </div>
        )}
      </div>

      {showMarquee && <Marquee />}
    </section>
  );
}

function FloatCard({ children, top, left, right, bottom, delay }) {
  return (
    <div
      className="float-card"
      style={{ top, left, right, bottom, animationDelay: delay }}
    >
      {children}
    </div>
  );
}

function Marquee() {
  const items = [
    ".NET 9", "ASP.NET Core", "SignalR", "PostgreSQL 17", "LiveKit SFU",
    "Zitadel · OIDC", "Polly", "Outbox Pattern", "Prometheus", "Grafana",
    "Serilog", "k3s · Helm", "Nginx Ingress", "ArgoCD",
  ];
  return (
    <div className="marquee">
      <div className="marquee-track">
        {[...items, ...items].map((t, i) => (
          <span className="mono marquee-item" key={i}>{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ====== Features ====== */
function Features() {
  return (
    <section id="features" className="features">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">что внутри</span>
          <h2 className="h2">Всё необходимое для команды,<br/>и ничего лишнего.</h2>
          <p className="lead muted">
            MVP покрывает реальный сценарий совместной работы: серверы,
            каналы, голос, роли и модерация — всё с предсказуемой задержкой.
          </p>
        </div>

        <div className="feature-grid">
          <FeatureCard
            tone="blue"
            icon={<HashIcon />}
            title="Текстовые каналы"
            desc="Cursor‑based история, реактивная доставка через SignalR, идемпотентная отправка с X‑Idempotency‑Key."
            metric="50 msg / запрос"
            metricLabel="cursor pagination"
          >
            <ChannelMini />
          </FeatureCard>

          <FeatureCard
            tone="purple"
            icon={<MicSolidIcon />}
            title="Голосовые каналы"
            desc="WebRTC через LiveKit SFU, встроенный TURN, DTLS + SRTP. Voice activity detection прямо в клиенте."
            metric="<100 ms"
            metricLabel="голос end‑to‑end"
          >
            <VoiceMini />
          </FeatureCard>

          <FeatureCard
            tone="pink"
            icon={<UsersIcon />}
            title="Роли и модерация"
            desc="Три понятные роли: Owner, Admin, Member. Кик и бан с мгновенным отключением WS и голоса."
            metric="3 роли"
            metricLabel="без bitmask‑ребусов"
          >
            <RolesMini />
          </FeatureCard>

          <FeatureCard
            tone="cyan"
            icon={<RadarIcon />}
            title="Присутствие в реальном времени"
            desc="Онлайн‑статусы через heartbeat 20с, in‑memory presence в WS Gateway, мгновенные события через SignalR."
            metric="20 / 30 s"
            metricLabel="heartbeat / TTL"
          >
            <PresenceMini />
          </FeatureCard>

          <FeatureCard
            tone="green"
            icon={<LinkIcon />}
            title="Инвайт‑ссылки"
            desc="Гибкие приглашения с TTL и лимитом использований. Баны проверяются перед принятием."
            metric="TTL + лимит"
            metricLabel="настраиваемые"
          >
            <InviteMini />
          </FeatureCard>

          <FeatureCard
            tone="amber"
            icon={<LockIcon />}
            title="Готовность к E2EE"
            desc="Архитектура модульная: сообщения проходят через ясные интерфейсы. В MVP — TLS, дальше — Signal Protocol."
            metric="MVP → E2EE"
            metricLabel="без переписывания"
          >
            <EncryptionMini />
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ tone, icon, title, desc, metric, metricLabel, children }) {
  return (
    <article className={"f-card f-tone-" + tone}>
      <div className="f-card-head">
        <span className="f-card-icon">{icon}</span>
        <h3 className="h3">{title}</h3>
      </div>
      <p className="f-card-desc">{desc}</p>
      <div className="f-card-viz">{children}</div>
      <div className="f-card-foot">
        <div className="f-card-metric">{metric}</div>
        <div className="mono f-card-metric-l">{metricLabel}</div>
      </div>
    </article>
  );
}

/* ---- Feature minis ---- */
function ChannelMini() {
  const channels = ["общий", "релизы", "incident-room", "дизайн"];
  return (
    <div className="mini mini-channels">
      {channels.map((c, i) => (
        <div key={c} className={"mini-ch " + (i === 1 ? "active" : "")}>
          <span className="prv-hash">#</span>
          <span>{c}</span>
          {i === 0 && <span className="prv-badge mono">3</span>}
          {i === 2 && <span className="prv-badge prv-badge-live mono"><span className="dot live pulse"/>LIVE</span>}
        </div>
      ))}
    </div>
  );
}
function VoiceMini() {
  const ppl = ["AK", "PR", "IV", "MS"];
  return (
    <div className="mini mini-voice">
      {ppl.map((p, i) => (
        <div key={p} className="voice-tile">
          <span className="prv-mini-avatar" style={{ width: 32, height: 32, fontSize: 12, background: `linear-gradient(135deg, oklch(0.62 0.16 ${200 + i*40}), oklch(0.48 0.18 ${230 + i*40}))` }}>{p}</span>
          {i < 2 && (
            <span className="prv-wave"><i/><i/><i/><i/><i/></span>
          )}
        </div>
      ))}
    </div>
  );
}
function RolesMini() {
  return (
    <div className="mini mini-roles">
      <div className="role-row"><span className="role-badge owner">Owner</span><span className="muted mono">создатель</span></div>
      <div className="role-row"><span className="role-badge admin">Admin</span><span className="muted mono">+ модерация</span></div>
      <div className="role-row"><span className="role-badge member">Member</span><span className="muted mono">базовые</span></div>
    </div>
  );
}
function PresenceMini() {
  return (
    <div className="mini mini-presence">
      <div className="pres-row"><span className="dot online"/>Анна</div>
      <div className="pres-row"><span className="dot online pulse"/>Михаил</div>
      <div className="pres-row"><span className="dot idle"/>Дарья</div>
      <div className="pres-row dim"><span className="dot"/>Олег</div>
    </div>
  );
}
function InviteMini() {
  return (
    <div className="mini mini-invite">
      <div className="invite-pill mono">
        <span className="muted">nextalk.io/invite/</span>
        <span className="gradient-text">k4t‑pony‑42</span>
      </div>
      <div className="invite-meta">
        <span className="chip mono">TTL · 7 дн</span>
        <span className="chip mono">25 / 50</span>
      </div>
    </div>
  );
}
function EncryptionMini() {
  return (
    <div className="mini mini-enc">
      <div className="enc-step done"><CheckIcon/> TLS 1.3</div>
      <div className="enc-step done"><CheckIcon/> Stateless services</div>
      <div className="enc-step done"><CheckIcon/> Модульные интерфейсы</div>
      <div className="enc-step pending"><DotsIcon/> Signal Protocol</div>
    </div>
  );
}

/* ====== Preview Section (anchored, with caption) ====== */
function PreviewSection() {
  return (
    <section id="preview" className="preview-section">
      <div className="container">
        <div className="section-head center">
          <span className="eyebrow">живой интерфейс</span>
          <h2 className="h2">Так выглядит работа<br/>внутри NexTalk.</h2>
          <p className="lead muted">
            То же приложение, что и в проде: сервера слева, каналы, чат с реакциями,
            голосовые комнаты и список участников с присутствием.
          </p>
        </div>
        <div className="preview-section-frame">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}

/* ====== Architecture ====== */
function Architecture() {
  return (
    <section id="architecture" className="architecture">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">под капотом</span>
          <h2 className="h2">Микросервисы,<br/><span className="gradient-text">собранные правильно.</span></h2>
          <p className="lead muted">
            Четыре .NET‑сервиса, единая точка входа через Nginx Ingress,
            Zitadel как IdP. Каждый сервис деплоится независимо.
          </p>
        </div>

        <div className="arch-grid">
          <div className="arch-diagram card">
            <div className="arch-row arch-edge">
              <div className="arch-node n-client">
                <BrowserIcon /> Browser · React SPA
              </div>
            </div>
            <Connector />
            <div className="arch-row">
              <div className="arch-node n-gw">
                <span className="arch-node-label mono">edge</span>
                Nginx Ingress
              </div>
            </div>
            <Connector fan />
            <div className="arch-row arch-services">
              {[
                { name: "Guild",     sub: "/api/guilds", color: "blue" },
                { name: "Messaging", sub: "/api/channels", color: "purple" },
                { name: "Voice",     sub: "/api/voice",  color: "pink" },
                { name: "WS Gateway",sub: "/hubs/chat",  color: "cyan" },
              ].map(s => (
                <div key={s.name} className={"arch-svc tone-" + s.color}>
                  <div className="arch-svc-name">{s.name}</div>
                  <div className="arch-svc-sub mono">{s.sub}</div>
                </div>
              ))}
            </div>
            <Connector merge />
            <div className="arch-row arch-stores">
              <div className="arch-store">
                <DbIcon /> PostgreSQL 17
                <div className="mono arch-store-sub">guild + messaging</div>
              </div>
              <div className="arch-store">
                <CacheIcon /> Redis
                <div className="mono arch-store-sub">cache · presence</div>
              </div>
              <div className="arch-store">
                <WaveIcon /> LiveKit
                <div className="mono arch-store-sub">SFU + TURN</div>
              </div>
              <div className="arch-store">
                <KeyIcon /> Zitadel
                <div className="mono arch-store-sub">OIDC · JWT</div>
              </div>
            </div>
          </div>

          <aside className="arch-side">
            <div className="card arch-side-card">
              <div className="eyebrow">эволюция</div>
              <h3 className="h3">Монолит → микросервисы → k8s</h3>
              <ol className="arch-stages">
                <li>
                  <span className="stage-n mono">01</span>
                  <div>
                    <div className="stage-title">Модульный монолит</div>
                    <div className="stage-sub muted">5 контейнеров, прямые вызовы интерфейсов.</div>
                  </div>
                </li>
                <li>
                  <span className="stage-n mono">02</span>
                  <div>
                    <div className="stage-title">Микросервисы</div>
                    <div className="stage-sub muted">8 контейнеров, HTTP между сервисами, Polly + Health.</div>
                  </div>
                </li>
                <li className="active">
                  <span className="stage-n mono">03</span>
                  <div>
                    <div className="stage-title">Kubernetes (k3s)</div>
                    <div className="stage-sub muted">11 подов: те же образы, Helm + ArgoCD, Prometheus + Grafana.</div>
                  </div>
                </li>
              </ol>
            </div>

            <div className="card arch-side-card">
              <div className="eyebrow">маршрутизация</div>
              <h3 className="h3">Один URL, четыре сервиса</h3>
              <div className="routes mono">
                {[
                  ["/api/guilds/*",   "Guild"],
                  ["/api/channels/*", "Messaging"],
                  ["/api/messages/*", "Messaging"],
                  ["/api/voice/*",    "Voice"],
                  ["/hubs/chat",      "WS Gateway"],
                  ["/auth/*",         "Zitadel"],
                ].map(([p, s]) => (
                  <div className="route" key={p}>
                    <span className="route-path">{p}</span>
                    <span className="route-arrow">→</span>
                    <span className="route-svc">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Connector({ fan, merge }) {
  return (
    <div className={"arch-connector " + (fan ? "is-fan" : "") + (merge ? " is-merge" : "")}>
      <svg viewBox="0 0 400 40" preserveAspectRatio="none">
        {!fan && !merge && <path d="M200 0 L200 40" />}
        {fan && (
          <>
            <path d="M200 0 L40 40" />
            <path d="M200 0 L140 40" />
            <path d="M200 0 L260 40" />
            <path d="M200 0 L360 40" />
          </>
        )}
        {merge && (
          <>
            <path d="M40 0 L120 40" />
            <path d="M140 0 L180 40" />
            <path d="M260 0 L220 40" />
            <path d="M360 0 L280 40" />
          </>
        )}
      </svg>
    </div>
  );
}

/* ====== Reliability ====== */
function Reliability() {
  const patterns = [
    {
      icon: <ShieldIcon />,
      tone: "blue",
      title: "Circuit Breaker",
      stat: "5 / 30s",
      desc: "Polly: 5 ошибок за 30 с → OPEN на 15 с, HALF‑OPEN с одним пробным запросом."
    },
    {
      icon: <RetryIcon />,
      tone: "purple",
      title: "Retry + Backoff + Jitter",
      stat: "3×",
      desc: "Экспоненциальная задержка ~200ms → 400 → 800 с ±25% джиттером. Только safe‑to‑retry."
    },
    {
      icon: <BoltIcon />,
      tone: "cyan",
      title: "Outbox Pattern",
      stat: "at‑least‑once",
      desc: "INSERT message + outbox_event в одной транзакции, OutboxWorker → BroadcastConsumer."
    },
    {
      icon: <FingerIcon />,
      tone: "pink",
      title: "Idempotency Key",
      stat: "24h TTL",
      desc: "X‑Idempotency‑Key хранится в БД, повторный запрос отдаёт закэшированный ответ."
    },
    {
      icon: <ClockIcon />,
      tone: "amber",
      title: "Deadlines",
      stat: "1.5s budget",
      desc: "X‑Deadline передаётся между сервисами; истёкший дедлайн → 504 без сетевого вызова."
    },
    {
      icon: <GaugeIcon />,
      tone: "green",
      title: "Health Checks",
      stat: "/healthz · /readyz",
      desc: "Liveness и readiness probes, проверка PostgreSQL и Redis. Поды перезапускаются автоматически."
    },
  ];
  return (
    <section id="reliability" className="reliability">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">отказоустойчивость</span>
          <h2 className="h2">Шесть паттернов,<br/>которые держат всё на ногах.</h2>
        </div>
        <div className="rel-grid">
          {patterns.map((p, i) => (
            <div key={i} className={"rel-card tone-" + p.tone}>
              <div className="rel-icon">{p.icon}</div>
              <div className="rel-stat mono">{p.stat}</div>
              <div className="rel-title">{p.title}</div>
              <div className="rel-desc muted">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ====== CTA ====== */
function CTA() {
  return (
    <section id="cta" className="cta">
      <div className="container">
        <div className="cta-card card">
          <div className="grid-bg" />
          <div className="cta-inner">
            <span className="eyebrow">быстрый старт</span>
            <h2 className="h2">
              Один <span className="mono cta-cmd">docker compose up</span>
              <br/>и команда уже общается.
            </h2>
            <div className="cta-terminal mono">
              <div className="cta-term-head">
                <span /><span /><span /><span className="cta-term-title">terminal · ~/projects/nextalk</span>
              </div>
              <div className="cta-term-body">
                <div><span className="muted">$</span> git clone github.com/nextalk/nextalk</div>
                <div><span className="muted">$</span> cd nextalk</div>
                <div><span className="muted">$</span> docker compose --env-file=.env.example up -d --build --wait</div>
                <div className="muted">⠿ all 12 containers healthy in 47s</div>
                <div><span className="muted">$</span> open http://localhost:8080</div>
                <div className="cta-term-caret"><span className="muted">$</span> <span className="caret">▍</span></div>
              </div>
            </div>
            <div className="hero-cta">
              <a href="#" className="btn btn-primary">Создать сервер<ArrowIcon /></a>
              <a href="#" className="btn btn-secondary"><GithubIcon /> Открыть на GitHub</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ====== FAQ ====== */
function FAQ() {
  const items = [
    {
      q: "Это правда self‑hosted? Где будут лежать данные?",
      a: "Да. Все данные — в вашей инфраструктуре: PostgreSQL для сообщений и серверов, Zitadel для аккаунтов. Мы не получаем ни байта."
    },
    {
      q: "Готово ли E2EE?",
      a: "В MVP — TLS 1.3 на транспорте и stateless‑сервисы. Сообщения хранятся как plain text. Архитектура готова к Signal Protocol без переписывания бизнес‑логики."
    },
    {
      q: "Что насчёт нагрузки?",
      a: "MVP рассчитан на ~300 одновременных WebSocket‑соединений, ~60 msg/сек peak. Guild, Messaging и Voice — stateless и горизонтально масштабируются."
    },
    {
      q: "Можно ли запустить без Kubernetes?",
      a: "Да. docker compose поднимает всё локально за минуту. K8s — для прод‑подобной среды через k3s + Helm + ArgoCD."
    },
    {
      q: "А мобильное приложение?",
      a: "Сейчас — только Desktop‑web (CSS Grid). Мобильные клиенты — в roadmap; протоколы SignalR + LiveKit совместимы."
    },
  ];
  const [open, setOpen] = React.useState(0);
  return (
    <section id="faq" className="faq">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">вопросы</span>
          <h2 className="h2">Часто спрашивают.</h2>
        </div>
        <div className="faq-list">
          {items.map((it, i) => (
            <details key={i} open={open === i} onClick={(e) => { e.preventDefault(); setOpen(open === i ? -1 : i); }}>
              <summary>
                <span>{it.q}</span>
                <span className="faq-chev">+</span>
              </summary>
              <p>{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ====== Footer ====== */
function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="mark">N</span>
              <span className="nav-wordmark">NexTalk</span>
            </div>
            <p className="muted">
              Самохостимая платформа для командного общения.
              Лицензия MIT, исходники открыты.
            </p>
            <div className="footer-social">
              <a href="#" aria-label="GitHub"><GithubIcon /></a>
              <a href="#" aria-label="Twitter"><TwitterIcon /></a>
              <a href="#" aria-label="Discord"><GlobeIcon /></a>
            </div>
          </div>
          <div className="footer-cols">
            <div>
              <div className="footer-col-h mono">продукт</div>
              <a href="#features">Возможности</a>
              <a href="#preview">Превью</a>
              <a href="#cta">Быстрый старт</a>
              <a href="#">Roadmap</a>
            </div>
            <div>
              <div className="footer-col-h mono">архитектура</div>
              <a href="#architecture">Микросервисы</a>
              <a href="#reliability">Отказоустойчивость</a>
              <a href="#">C4‑модель</a>
              <a href="#">API docs</a>
            </div>
            <div>
              <div className="footer-col-h mono">сообщество</div>
              <a href="#">GitHub</a>
              <a href="#">Issues</a>
              <a href="#">Contributing</a>
              <a href="#">Лицензия MIT</a>
            </div>
          </div>
        </div>
        <div className="footer-base">
          <div className="mono muted">© 2026 NexTalk Contributors</div>
          <div className="mono muted">собрано на .NET 9, React 18 и любви к real‑time</div>
        </div>
      </div>
    </footer>
  );
}

/* ====== ICONS ====== */
function ArrowIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>}
function PlayIcon(){return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg>}
function HashIcon(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 9h16M4 15h16M10 3l-2 18M16 3l-2 18"/></svg>}
function MicSolidIcon(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/></svg>}
function UsersIcon(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
function RadarIcon(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>}
function LinkIcon(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"/></svg>}
function LockIcon(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>}
function ShieldIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
function BoltIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>}
function CheckIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>}
function DotsIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/></svg>}
function BrowserIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></svg>}
function DbIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0"/></svg>}
function CacheIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>}
function WaveIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/></svg>}
function KeyIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="14" r="4"/><path d="M11 11l9-9M16 5l3 3"/></svg>}
function RetryIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/></svg>}
function FingerIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 9c1-2 5-2 6 0s-1 3-3 3v3"/></svg>}
function ClockIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>}
function GaugeIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 14l4-4"/><circle cx="12" cy="14" r="9"/><path d="M3 14a9 9 0 0 1 18 0"/></svg>}
function GithubIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2c-3.34.72-4.04-1.6-4.04-1.6-.55-1.4-1.34-1.77-1.34-1.77-1.09-.74.08-.73.08-.73 1.2.08 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.3.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.23 1.92 1.23 3.22 0 4.6-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .3"/></svg>}
function TwitterIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22 5.8a8 8 0 0 1-2.4.7 4 4 0 0 0 1.8-2.2 8 8 0 0 1-2.6 1A4 4 0 0 0 12 9a11 11 0 0 1-8-4 4 4 0 0 0 1.2 5.3A4 4 0 0 1 3 9.7v.1a4 4 0 0 0 3.2 4 4 4 0 0 1-1.8 0 4 4 0 0 0 3.7 2.8A8 8 0 0 1 2 18a11 11 0 0 0 6 1.7c7.3 0 11.3-6 11.3-11.3v-.5A8 8 0 0 0 22 5.8z"/></svg>}
function GlobeIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>}

Object.assign(window, {
  TopNav, Hero, Features, PreviewSection, Architecture, Reliability, CTA, FAQ, Footer
});
