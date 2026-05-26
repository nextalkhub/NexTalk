import React, { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IArrowOut } from '../../../shared/components/Icons/Icons'
import { avatarBg } from '../../../shared/components/Avatar/Avatar'
import { LayoutContext } from '../../../shared/components/Layout/AppShell'
import { useAppDispatch, useAppSelector } from '../../../store'
import { selectUser, logout } from '../../../shared/slices/authSlice'
import { fetchServers, selectServers } from '../../../shared/slices/serverSlice'

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { setHideRight } = useContext(LayoutContext)
  const user = useAppSelector(selectUser)
  const servers = useAppSelector(selectServers)

  useEffect(() => {
    setHideRight(true)
    dispatch(fetchServers())
    return () => setHideRight(false)
  }, [dispatch, setHideRight])

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/auth')
  }

  if (!user) return null

  return (
    <>
      <header className="top" style={{ display: 'flex', alignItems: 'center', padding: '0 22px', gap: 16 }}>
        <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--fg-0)' }}>
          Профиль
        </div>
        <button
          style={{ padding: '6px 14px', background: 'rgba(255,90,110,.12)', border: '1px solid rgba(255,90,110,.3)', borderRadius: 8, color: 'var(--live)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
          onClick={handleLogout}
        >
          Выйти
        </button>
      </header>
      <main className="main">
        <div className="profile-shell">
          <div className="profile-card-big">
            <div className="profile-banner-big" />
            <div className="profile-head">
              <span
                className="av profile-av"
                style={{ background: avatarBg(user.id) }}
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="info">
                <div className="nm">{user.name}</div>
                <div className="hn">@{user.nickname || user.id}</div>
              </div>
            </div>
            <div className="profile-body">
              <div className="profile-field">
                <span className="lbl">EMAIL</span>
                <span className="val">{(user as any).email || '—'}</span>
              </div>
              <div className="profile-field">
                <span className="lbl">USER ID</span>
                <span className="val">{user.id}</span>
              </div>
              <div className="profile-field">
                <span className="lbl">СЕРВЕРОВ</span>
                <span className="val">{servers.length}</span>
              </div>
              <div className="profile-field">
                <span className="lbl">ИСТОЧНИК</span>
                <span className="val">Zitadel OIDC</span>
              </div>
            </div>
            <div className="profile-action-bar">
              <span className="lead-text">Редактировать профиль · управлять аккаунтом в Zitadel</span>
              <a
                className="profile-zitadel-btn"
                href={import.meta.env.VITE_OIDC_AUTHORITY || '#'}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IArrowOut />
                Открыть Zitadel
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
