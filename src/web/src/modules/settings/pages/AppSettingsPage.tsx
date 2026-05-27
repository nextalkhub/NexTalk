import React, { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IGear, IX, IShield, ILogout, IMic, IUsers, ICopy, IArrowOut,
} from '../../../shared/components/Icons/Icons'
import { LayoutContext } from '../../../shared/components/Layout/AppShell'
import { useAppDispatch, useAppSelector } from '../../../store'
import { selectUser, selectTokens, logout } from '../../../shared/slices/authSlice'

// ─── Prefs persistence ──────────────────────────────────────────────────────

interface AppPrefs {
  palette: string
  density: string
  fontScale: number
  echoCancellation: boolean
  noiseSuppression: boolean
  ptt: boolean
  desktopNotifications: boolean
  messageSound: boolean
  micDeviceId: string
  outputDeviceId: string
}

const PREFS_KEY = 'nextalk_prefs'
const DEFAULT_PREFS: AppPrefs = {
  palette: 'nextalk', density: 'comfortable', fontScale: 1.0,
  echoCancellation: true, noiseSuppression: true, ptt: false,
  desktopNotifications: true, messageSound: false,
  micDeviceId: 'default', outputDeviceId: 'default',
}

function loadPrefs(): AppPrefs {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') } }
  catch { return DEFAULT_PREFS }
}

function applyPrefs(prefs: AppPrefs) {
  document.body.style.setProperty('zoom', prefs.fontScale.toString())
  document.documentElement.setAttribute('data-density', prefs.density)
  const p = PALETTES[prefs.palette as keyof typeof PALETTES] ?? PALETTES.nextalk
  const root = document.documentElement.style
  root.setProperty('--brand-1', p.brand1)
  root.setProperty('--brand-2', p.brand2)
  root.setProperty('--brand-3', p.brand3)
  root.setProperty('--brand-1-rgb', p.rgb1)
  root.setProperty('--brand-2-rgb', p.rgb2)
  root.setProperty('--brand-3-rgb', p.rgb3)
  root.setProperty('--grad-brand', p.grad)
  root.setProperty('--grad-brand-soft', p.softGrad)
}

// ─── Palettes ────────────────────────────────────────────────────────────────

const PALETTES = {
  nextalk:  { label: 'NexTalk',  desc: 'По умолчанию',  brand1: '#4F7CFF', brand2: '#9061FF', brand3: '#C254FF', rgb1: '79,124,255',   rgb2: '144,97,255',  rgb3: '194,84,255',  grad: 'linear-gradient(135deg,#4F7CFF 0%,#9061FF 60%,#C254FF 100%)', softGrad: 'linear-gradient(135deg,rgba(79,124,255,.16),rgba(194,84,255,.10))' },
  midnight: { label: 'Midnight', desc: 'Холодный синий', brand1: '#2563EB', brand2: '#7C3AED', brand3: '#A855F7', rgb1: '37,99,235',    rgb2: '124,58,237',  rgb3: '168,85,247',  grad: 'linear-gradient(135deg,#1e3a8a 0%,#4c1d95 100%)',           softGrad: 'linear-gradient(135deg,rgba(37,99,235,.16),rgba(168,85,247,.10))' },
  emerald:  { label: 'Emerald',  desc: 'Зелёный',       brand1: '#10B981', brand2: '#059669', brand3: '#34D399', rgb1: '16,185,129',   rgb2: '5,150,105',   rgb3: '52,211,153',  grad: 'linear-gradient(135deg,#065F46 0%,#10B981 100%)',            softGrad: 'linear-gradient(135deg,rgba(16,185,129,.16),rgba(52,211,153,.10))' },
  graphite: { label: 'Graphite', desc: 'Нейтральный',   brand1: '#6B7280', brand2: '#4B5563', brand3: '#9CA3AF', rgb1: '107,114,128',  rgb2: '75,85,99',    rgb3: '156,163,175', grad: 'linear-gradient(135deg,#374151 0%,#6B7280 100%)',            softGrad: 'linear-gradient(135deg,rgba(107,114,128,.16),rgba(156,163,175,.10))' },
}

// ─── JWT helpers ─────────────────────────────────────────────────────────────

function decodeJwt(token: string): Record<string, unknown> | null {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) }
  catch { return null }
}

function fmtTs(ts: number): string {
  return new Date(ts * 1000).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Types ───────────────────────────────────────────────────────────────────

type AppTab = 'appearance' | 'audio' | 'notifications' | 'session'

// ─── Main page ───────────────────────────────────────────────────────────────

export const AppSettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { setHideRight } = useContext(LayoutContext)

  const user = useAppSelector(selectUser)
  const tokens = useAppSelector(selectTokens)

  const [tab, setTab] = useState<AppTab>('appearance')
  const [prefs, setPrefsState] = useState<AppPrefs>(loadPrefs)

  useEffect(() => {
    setHideRight(true)
    return () => setHideRight(false)
  }, [setHideRight])

  const setPref = <K extends keyof AppPrefs>(key: K, value: AppPrefs[K]) => {
    const next = { ...prefs, [key]: value }
    setPrefsState(next)
    localStorage.setItem(PREFS_KEY, JSON.stringify(next))
    applyPrefs(next)
  }

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/auth')
  }

  const nav: { label: string; items: { id: AppTab | 'logout'; label: string; icon: React.ReactNode; danger?: boolean }[] }[] = [
    {
      label: 'приложение',
      items: [
        { id: 'appearance',    label: 'Внешний вид',   icon: <IGear /> },
        { id: 'audio',         label: 'Звук',           icon: <IMic /> },
        { id: 'notifications', label: 'Уведомления',    icon: <IUsers /> },
      ],
    },
    {
      label: 'сессия',
      items: [
        { id: 'session', label: 'Сессия и токены', icon: <IShield /> },
        { id: 'logout',  label: 'Выйти из аккаунта', icon: <ILogout />, danger: true },
      ],
    },
  ]

  return (
    <>
      <header className="top" style={{ display: 'flex', alignItems: 'center', padding: '0 22px', gap: 16 }}>
        <div className="top-left" style={{ flex: 1 }}>
          <div className="top-breadcrumb">
            <span className="crumb-channel"><IGear />Настройки приложения</span>
          </div>
        </div>
        <button className="icon-btn" title="Закрыть" onClick={() => navigate(-1)}><IX /></button>
      </header>

      <main className="main">
        <div className="settings-layout">
          <nav className="settings-nav">
            {nav.map(section => (
              <React.Fragment key={section.label}>
                <div className="settings-nav-h">{section.label.toUpperCase()}</div>
                {section.items.map(item => (
                  <button
                    key={item.id}
                    className={`settings-nav-item${tab === item.id ? ' is-active' : ''}${item.danger ? ' is-danger' : ''}`}
                    onClick={() => item.id === 'logout' ? handleLogout() : setTab(item.id as AppTab)}
                  >
                    {item.icon}{item.label}
                  </button>
                ))}
                <div style={{ height: 16 }} />
              </React.Fragment>
            ))}
          </nav>

          <div className="settings-content">
            {tab === 'appearance'    && <AppearanceTab prefs={prefs} setPref={setPref} />}
            {tab === 'audio'         && <AudioTab prefs={prefs} setPref={setPref} />}
            {tab === 'notifications' && <NotificationsTab prefs={prefs} setPref={setPref} />}
            {tab === 'session'       && <SessionTab user={user} tokens={tokens} />}
          </div>
        </div>
      </main>
    </>
  )
}

// ─── Appearance ──────────────────────────────────────────────────────────────

const AppearanceTab: React.FC<{ prefs: AppPrefs; setPref: <K extends keyof AppPrefs>(k: K, v: AppPrefs[K]) => void }> = ({ prefs, setPref }) => (
  <>
    <div className="settings-section-head">
      <h1>Внешний вид</h1>
      <p>Настройки клиента. Хранятся локально, на сервер не отправляются.</p>
    </div>

    <div className="settings-field">
      <label className="settings-label">Цветовая схема</label>
      <div className="radio-cards">
        {(Object.entries(PALETTES) as [string, typeof PALETTES.nextalk][]).map(([key, p]) => (
          <div
            key={key}
            className={`radio-card${prefs.palette === key ? ' is-selected' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => setPref('palette', key)}
          >
            <div className="ic" style={{ background: p.grad, width: 32, height: 32, borderRadius: 8 }} />
            <div className="name">{p.label}</div>
            <div className="desc">{p.desc}</div>
          </div>
        ))}
      </div>
    </div>

    <div className="settings-row">
      <div className="info">
        <div className="info-h">Плотность интерфейса</div>
        <div className="info-s">Расстояние между элементами в каналах и списках.</div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {(['cozy', 'comfortable', 'airy'] as const).map(d => (
          <button
            key={d}
            onClick={() => setPref('density', d)}
            className={`chip${prefs.density === d ? ' is-brand' : ''}`}
            style={{ cursor: 'pointer', padding: '4px 12px', height: 28 }}
          >
            {d === 'cozy' ? 'Cozy' : d === 'comfortable' ? 'Обычная' : 'Воздушная'}
          </button>
        ))}
      </div>
    </div>

    <div className="settings-row">
      <div className="info">
        <div className="info-h">Размер шрифта</div>
        <div className="info-s">Текущее значение: {(prefs.fontScale * 100).toFixed(0)}%. Влияет на весь интерфейс.</div>
      </div>
      <input
        type="range"
        min="0.9" max="1.15" step="0.01"
        value={prefs.fontScale}
        onChange={e => setPref('fontScale', parseFloat(e.target.value))}
        style={{ width: 160 }}
      />
    </div>
  </>
)

// ─── Audio ───────────────────────────────────────────────────────────────────

const AudioTab: React.FC<{ prefs: AppPrefs; setPref: <K extends keyof AppPrefs>(k: K, v: AppPrefs[K]) => void }> = ({ prefs, setPref }) => {
  const [mics, setMics] = useState<MediaDeviceInfo[]>([])
  const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([])
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(() => navigator.mediaDevices.enumerateDevices())
      .then(devices => {
        setMics(devices.filter(d => d.kind === 'audioinput'))
        setOutputs(devices.filter(d => d.kind === 'audiooutput'))
      })
      .catch(() => {
        setMics([])
        setOutputs([])
      })
  }, [])

  return (
  <>
    <div className="settings-section-head">
      <h1>Звук</h1>
      <p>Настройки микрофона и наушников для голосовых каналов.</p>
    </div>

    <div className="settings-field">
      <label className="settings-label">Микрофон</label>
      <select
        className="settings-select"
        value={prefs.micDeviceId}
        onChange={e => setPref('micDeviceId', e.target.value)}
      >
        <option value="default">Системный (по умолчанию)</option>
        {mics.map(d => (
          <option key={d.deviceId} value={d.deviceId}>{d.label || `Микрофон ${d.deviceId.slice(0, 8)}`}</option>
        ))}
      </select>
      <div className="settings-help">Используется LiveKit-клиентом при подключении к голосовому каналу.</div>
    </div>

    <div className="settings-field">
      <label className="settings-label">Наушники / выход</label>
      <select
        className="settings-select"
        value={prefs.outputDeviceId}
        onChange={e => setPref('outputDeviceId', e.target.value)}
      >
        <option value="default">Системный (по умолчанию)</option>
        {outputs.map(d => (
          <option key={d.deviceId} value={d.deviceId}>{d.label || `Выход ${d.deviceId.slice(0, 8)}`}</option>
        ))}
      </select>
    </div>

    <div className="settings-row">
      <div className="info">
        <div className="info-h">Эхоподавление</div>
        <div className="info-s">Обрабатывается в браузере · acousticEchoCancellation.</div>
      </div>
      <div
        className={`toggle${prefs.echoCancellation ? ' is-on' : ''}`}
        role="checkbox"
        aria-checked={prefs.echoCancellation}
        tabIndex={0}
        onClick={() => setPref('echoCancellation', !prefs.echoCancellation)}
      />
    </div>

    <div className="settings-row">
      <div className="info">
        <div className="info-h">Шумоподавление</div>
        <div className="info-s">Обрабатывается в браузере · noiseSuppression.</div>
      </div>
      <div
        className={`toggle${prefs.noiseSuppression ? ' is-on' : ''}`}
        role="checkbox"
        aria-checked={prefs.noiseSuppression}
        tabIndex={0}
        onClick={() => setPref('noiseSuppression', !prefs.noiseSuppression)}
      />
    </div>

    <div className="settings-row">
      <div className="info">
        <div className="info-h">Push-to-talk</div>
        <div className="info-s">По умолчанию микрофон в режиме voice activation. Включите для PTT.</div>
      </div>
      <div
        className={`toggle${prefs.ptt ? ' is-on' : ''}`}
        role="checkbox"
        aria-checked={prefs.ptt}
        tabIndex={0}
        onClick={() => setPref('ptt', !prefs.ptt)}
      />
    </div>
  </>
  )
}

// ─── Notifications ───────────────────────────────────────────────────────────

const NotificationsTab: React.FC<{ prefs: AppPrefs; setPref: <K extends keyof AppPrefs>(k: K, v: AppPrefs[K]) => void }> = ({ prefs, setPref }) => {
  const requestPermission = async () => {
    if (!prefs.desktopNotifications && 'Notification' in window) {
      if (Notification.permission === 'denied') return
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission()
        if (result !== 'granted') return
      }
    }
    setPref('desktopNotifications', !prefs.desktopNotifications)
  }

  return (
    <>
      <div className="settings-section-head">
        <h1>Уведомления</h1>
        <p>Браузерные уведомления о новых сообщениях. Серверные push-уведомления — за рамками MVP.</p>
      </div>

      <div className="settings-row">
        <div className="info">
          <div className="info-h">Показывать desktop-уведомления</div>
          <div className="info-s">Требует разрешения от браузера на Notification API.</div>
        </div>
        <div
          className={`toggle${prefs.desktopNotifications ? ' is-on' : ''}`}
          role="checkbox"
          aria-checked={prefs.desktopNotifications}
          tabIndex={0}
          onClick={requestPermission}
        />
      </div>

      <div className="settings-row">
        <div className="info">
          <div className="info-h">Звук при новом сообщении</div>
          <div className="info-s">Только если вкладка неактивна.</div>
        </div>
        <div
          className={`toggle${prefs.messageSound ? ' is-on' : ''}`}
          role="checkbox"
          aria-checked={prefs.messageSound}
          tabIndex={0}
          onClick={() => setPref('messageSound', !prefs.messageSound)}
        />
      </div>

      <div className="settings-row">
        <div className="info">
          <div className="info-h">Тихие часы</div>
          <div className="info-s">В этом диапазоне уведомления приходят без звука.</div>
        </div>
        <span style={{ color: 'var(--fg-2)', fontSize: 13 }}>22:00 — 09:00 (UTC+3)</span>
      </div>
    </>
  )
}

// ─── Session ─────────────────────────────────────────────────────────────────

const SessionTab: React.FC<{
  user: { name: string; id: string; nickname?: string } | null
  tokens: { access_token?: string } | null
}> = ({ user, tokens }) => {
  const jwt = tokens?.access_token ? decodeJwt(tokens.access_token) : null
  const sessionId = (jwt?.jti as string) ?? '—'
  const userId = (jwt?.sub as string) ?? user?.id ?? '—'
  const issuedAt = jwt?.iat ? fmtTs(jwt.iat as number) : '—'
  const expiresAt = jwt?.exp ? fmtTs(jwt.exp as number) : '—'
  const zitadelUrl = `${import.meta.env.VITE_OIDC_AUTHORITY ?? ''}/ui/console`

  const copy = (text: string) => navigator.clipboard.writeText(text)

  return (
    <>
      <div className="settings-section-head">
        <h1>Сессия и токены</h1>
        <p>Информация о текущей JWT-сессии. Управление аккаунтом — в Zitadel.</p>
      </div>

      <div className="settings-field">
        <label className="settings-label">Идентификатор сессии</label>
        <div className="ro-field">
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sessionId}</span>
          <button className="copy-ic" title="Скопировать" onClick={() => copy(sessionId)}><ICopy /></button>
        </div>
      </div>

      <div className="settings-field">
        <label className="settings-label">User ID (sub)</label>
        <div className="ro-field">
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userId}</span>
          <button className="copy-ic" title="Скопировать" onClick={() => copy(userId)}><ICopy /></button>
        </div>
      </div>

      <div className="settings-row">
        <div className="info"><div className="info-h">Выдан</div></div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-1)' }}>{issuedAt}</span>
      </div>

      <div className="settings-row">
        <div className="info"><div className="info-h">Истекает</div></div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-1)' }}>{expiresAt}</span>
      </div>

      <div className="settings-row">
        <div className="info">
          <div className="info-h">Управление аккаунтом</div>
          <div className="info-s">Смена пароля, email, 2FA — в Zitadel. NexTalk эти данные не хранит.</div>
        </div>
        <a href={zitadelUrl} target="_blank" rel="noreferrer" className="profile-zitadel-btn">
          <IArrowOut />Открыть Zitadel
        </a>
      </div>
    </>
  )
}

// ─── Export applyPrefs for use at app init ────────────────────────────────────
export { loadPrefs, applyPrefs }
