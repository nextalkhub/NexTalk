import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutContext } from '../../../shared/components/Layout/AppShell'
import { useGlobalModal } from '../../../shared/components/Layout/ModalProvider'
import { IGear, IMic, IShield, ILogout, IX } from '../../../shared/components/Icons/Icons'
import { useAppSelector } from '../../../store'
import { selectUser } from '../../../shared/slices/authSlice'
import { loadPrefs, savePrefs, applyPrefs, PALETTES, type Prefs } from '../../../shared/prefs/prefs'

type Tab = 'appearance' | 'audio' | 'notifications' | 'session'

export const AppSettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const user = useAppSelector(selectUser)
  const { setHideRight } = useContext(LayoutContext)
  const { open } = useGlobalModal()
  const [tab, setTab] = useState<Tab>('appearance')
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs())

  useEffect(() => {
    setHideRight(true)
    return () => setHideRight(false)
  }, [setHideRight])

  useEffect(() => {
    applyPrefs(prefs)
    savePrefs(prefs)
  }, [prefs])

  const update = <K extends keyof Prefs>(k: K, v: Prefs[K]) => {
    setPrefs(p => ({ ...p, [k]: v }))
  }

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'appearance',    label: 'Внешний вид',  icon: <IGear /> },
    { id: 'audio',         label: 'Звук',         icon: <IMic /> },
    { id: 'notifications', label: 'Уведомления',  icon: <IShield /> },
    { id: 'session',       label: 'Сессия',       icon: <IShield /> },
  ]

  return (
    <>
      <header className="top">
        <div className="top-left">
          <div className="top-breadcrumb">
            <span className="crumb-channel"><IGear />Настройки приложения</span>
          </div>
        </div>
        <div className="top-actions">
          <button className="icon-btn" title="Закрыть" onClick={() => navigate(-1)}>
            <IX />
          </button>
        </div>
      </header>

      <main className="main">
        <div className="settings-layout">
          <nav className="settings-nav">
            <div className="settings-nav-h">ПРИЛОЖЕНИЕ</div>
            {navItems.map(item => (
              <button
                key={item.id}
                className={`settings-nav-item${tab === item.id ? ' is-active' : ''}`}
                onClick={() => setTab(item.id)}
              >
                {item.icon}
                {item.label}
              </button>
            ))}

            <div className="settings-nav-h" style={{ marginTop: 20 }}>АККАУНТ</div>
            <button
              className="settings-nav-item is-danger"
              onClick={() => open('logout')}
            >
              <ILogout />
              Выйти из аккаунта
            </button>
          </nav>

          <div className="settings-content">
            {tab === 'appearance' && (
              <AppearanceTab prefs={prefs} update={update} />
            )}
            {tab === 'audio' && (
              <AudioTab prefs={prefs} update={update} />
            )}
            {tab === 'notifications' && (
              <NotificationsTab prefs={prefs} update={update} />
            )}
            {tab === 'session' && (
              <SessionTab user={user} />
            )}
          </div>
        </div>
      </main>
    </>
  )
}

const AppearanceTab: React.FC<{
  prefs: Prefs
  update: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void
}> = ({ prefs, update }) => (
  <>
    <div className="settings-section-head">
      <h1>Внешний вид</h1>
      <p>Настройки клиента. Хранятся локально, на бэк не отправляются.</p>
    </div>

    <div className="settings-field">
      <label className="settings-label">Цветовая схема</label>
      <div className="radio-cards">
        {PALETTES.map(p => (
          <button
            key={p.id}
            type="button"
            className={`radio-card${prefs.theme === p.id ? ' is-selected' : ''}`}
            onClick={() => update('theme', p.id)}
          >
            <div className="ic" style={{ background: p.gradient }} />
            <div className="name">{p.label}</div>
            <div className="desc">{p.desc}</div>
          </button>
        ))}
      </div>
    </div>

    <div className="settings-row">
      <div className="info">
        <div className="info-h">Плотность интерфейса</div>
        <div className="info-s">Расстояние между элементами в списках и каналах.</div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {(['cozy', 'comfortable', 'airy'] as const).map(d => (
          <button
            key={d}
            type="button"
            onClick={() => update('density', d)}
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
        <div className="info-s">Текущее значение: {Math.round(prefs.fontScale * 100)}%.</div>
      </div>
      <input
        type="range"
        min="0.9" max="1.15" step="0.01"
        value={prefs.fontScale}
        onChange={e => update('fontScale', parseFloat(e.target.value))}
        style={{ width: 160 }}
      />
    </div>
  </>
)

const AudioTab: React.FC<{
  prefs: Prefs
  update: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void
}> = ({ prefs, update }) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        const list = await navigator.mediaDevices.enumerateDevices()
        setDevices(list.filter(d => d.kind === 'audioinput' || d.kind === 'audiooutput'))
      } catch {
        // permission denied — leave empty
      }
    }
    load()
  }, [])

  const inputs  = devices.filter(d => d.kind === 'audioinput')
  const outputs = devices.filter(d => d.kind === 'audiooutput')

  return (
    <>
      <div className="settings-section-head">
        <h1>Звук</h1>
        <p>Настройки микрофона и наушников для голосовых каналов.</p>
      </div>

      <div className="settings-field">
        <label className="settings-label">Микрофон</label>
        {inputs.length > 0 ? (
          <select className="settings-input">
            {inputs.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || 'Микрофон без названия'}
              </option>
            ))}
          </select>
        ) : (
          <div className="ro-field">
            <span style={{ color: 'var(--fg-2)' }}>Доступ к микрофону не предоставлен</span>
            <button
              className="btn-cancel"
              style={{ height: 32, padding: '0 12px' }}
              onClick={async () => {
                try {
                  await navigator.mediaDevices.getUserMedia({ audio: true })
                  const list = await navigator.mediaDevices.enumerateDevices()
                  setDevices(list.filter(d => d.kind === 'audioinput' || d.kind === 'audiooutput'))
                } catch { /* ignore */ }
              }}
            >
              Запросить доступ
            </button>
          </div>
        )}
      </div>

      <div className="settings-field">
        <label className="settings-label">Наушники / выход</label>
        {outputs.length > 0 ? (
          <select className="settings-input">
            {outputs.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || 'Выход без названия'}
              </option>
            ))}
          </select>
        ) : (
          <div className="ro-field" style={{ color: 'var(--fg-2)' }}>
            Браузер не отдаёт список устройств вывода.
          </div>
        )}
      </div>

      <div className="settings-row">
        <div className="info">
          <div className="info-h">Эхоподавление</div>
          <div className="info-s">Обрабатывается в браузере (acousticEchoCancellation).</div>
        </div>
        <Toggle on={prefs.echoCancellation} onChange={v => update('echoCancellation', v)} />
      </div>
      <div className="settings-row">
        <div className="info">
          <div className="info-h">Шумоподавление</div>
          <div className="info-s">Обрабатывается в браузере (noiseSuppression).</div>
        </div>
        <Toggle on={prefs.noiseSuppression} onChange={v => update('noiseSuppression', v)} />
      </div>
      <div className="settings-row">
        <div className="info">
          <div className="info-h">Push-to-talk</div>
          <div className="info-s">Микрофон активен только пока удерживается клавиша.</div>
        </div>
        <Toggle on={prefs.pushToTalk} onChange={v => update('pushToTalk', v)} />
      </div>
    </>
  )
}

const NotificationsTab: React.FC<{
  prefs: Prefs
  update: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void
}> = ({ prefs, update }) => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification === 'undefined' ? 'denied' : Notification.permission
  )

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPermission(result)
  }

  return (
    <>
      <div className="settings-section-head">
        <h1>Уведомления</h1>
        <p>Браузерные уведомления о новых сообщениях.</p>
      </div>

      <div className="settings-row">
        <div className="info">
          <div className="info-h">Desktop-уведомления</div>
          <div className="info-s">
            {permission === 'granted'
              ? 'Браузер разрешил показ уведомлений.'
              : permission === 'denied'
              ? 'Браузер запретил уведомления — измените в настройках сайта.'
              : 'Требуется запросить разрешение у браузера.'}
          </div>
        </div>
        {permission !== 'granted' ? (
          <button
            className="btn-cancel"
            style={{ height: 32, padding: '0 12px' }}
            onClick={requestPermission}
          >
            Запросить
          </button>
        ) : (
          <Toggle on={prefs.desktopNotifications} onChange={v => update('desktopNotifications', v)} />
        )}
      </div>

      <div className="settings-row">
        <div className="info">
          <div className="info-h">Звук при новом сообщении</div>
          <div className="info-s">Срабатывает только когда вкладка неактивна.</div>
        </div>
        <Toggle on={prefs.newMessageSound} onChange={v => update('newMessageSound', v)} />
      </div>
    </>
  )
}

const SessionTab: React.FC<{
  user: { id: string; name: string; email: string } | null
}> = ({ user }) => {
  if (!user) {
    return (
      <div className="empty-state">
        <div className="h">Сессия не найдена</div>
      </div>
    )
  }

  return (
    <>
      <div className="settings-section-head">
        <h1>Сессия и токены</h1>
        <p>Информация о текущей JWT-сессии. Управление аккаунтом — в Zitadel.</p>
      </div>

      <div className="settings-field">
        <label className="settings-label">User ID</label>
        <div className="ro-field">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{user.id}</span>
        </div>
      </div>

      <div className="settings-field">
        <label className="settings-label">Email</label>
        <div className="ro-field">
          <span>{user.email}</span>
        </div>
      </div>

      <div className="settings-row">
        <div className="info">
          <div className="info-h">Управление аккаунтом</div>
          <div className="info-s">
            Смена пароля, email, 2FA — только в Zitadel. NexTalk эти данные не хранит.
          </div>
        </div>
        <a
          href="#"
          className="profile-zitadel-btn"
          onClick={e => e.preventDefault()}
        >
          Открыть Zitadel
        </a>
      </div>
    </>
  )
}

const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void }> = ({ on, onChange }) => (
  <button
    type="button"
    className={`toggle${on ? ' is-on' : ''}`}
    onClick={() => onChange(!on)}
    aria-pressed={on}
  />
)
