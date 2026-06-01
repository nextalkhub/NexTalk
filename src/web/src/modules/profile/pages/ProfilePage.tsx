import React, { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { avatarBg } from '../../../shared/components/Avatar/Avatar'
import { LayoutContext } from '../../../shared/components/Layout/AppShell'
import { MobileMenuButton } from '../../../shared/components/Layout/MobileMenuButton'
import { IArrowOut, ICopy, IX } from '../../../shared/components/Icons/Icons'
import { useAppSelector } from '../../../store'
import { selectUser } from '../../../shared/slices/authSlice'
import { getInitials } from '../../../shared/utils/initials'

const ZITADEL_PROFILE_URL =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_ZITADEL_URL
    ? `${(import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_ZITADEL_URL}/ui/console/users/me`
    : '#'

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const user = useAppSelector(selectUser)
  const { setHideRight, drawerOpen, setDrawerOpen } = useContext(LayoutContext)

  useEffect(() => {
    setHideRight(true)
    return () => setHideRight(false)
  }, [setHideRight])

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // clipboard may be blocked
    }
  }

  if (!user) {
    return (
      <main className="main">
        <div className="empty-state">
          <div className="h">Профиль недоступен</div>
          <p>Войдите снова, чтобы увидеть данные аккаунта.</p>
        </div>
      </main>
    )
  }

  return (
    <>
      <header className="top">
        <MobileMenuButton onClick={() => setDrawerOpen(!drawerOpen)} />
        <div className="top-left">
          <div className="top-breadcrumb">
            <span className="crumb-channel">Профиль</span>
          </div>
        </div>
        <div className="top-actions">
          <button
            className="icon-btn"
            title="Закрыть"
            onClick={() => navigate(-1)}
          >
            <IX />
          </button>
        </div>
      </header>

      <main className="main">
        <div className="profile-shell">
          <div className="profile-card-big">
            <div className="profile-banner-big" />
            <div className="profile-head">
              <span
                className="profile-av"
                style={{ background: avatarBg(user.name) }}
              >
                {getInitials(user.name)}
              </span>
              <div className="info">
                <div className="nm">{user.name}</div>
                {user.nickname && <div className="hn">@{user.nickname}</div>}
              </div>
            </div>

            <div className="profile-body">
              <ProfileField label="Имя">{user.name}</ProfileField>

              {user.email && (
                <ProfileField
                  label="Email"
                  actions={
                    <button className="copy-ic" title="Скопировать" onClick={() => handleCopy(user.email)}>
                      <ICopy />
                    </button>
                  }
                >
                  {user.email}
                </ProfileField>
              )}

              <ProfileField
                label="User ID"
                actions={
                  <button className="copy-ic" title="Скопировать" onClick={() => handleCopy(user.id)}>
                    <ICopy />
                  </button>
                }
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{user.id}</span>
              </ProfileField>

              <ProfileField label="Источник">
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="chip is-brand">Zitadel · OIDC</span>
                  управляется в IdP
                </span>
              </ProfileField>
            </div>

            <div className="profile-action-bar">
              <span className="lead-text">
                Имя, email и пароль изменяются в Zitadel — NexTalk эти данные не хранит.
              </span>
              <a
                href={ZITADEL_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-zitadel-btn"
              >
                <IArrowOut />
                Открыть в Zitadel
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

interface ProfileFieldProps {
  label: string
  children: React.ReactNode
  actions?: React.ReactNode
}

const ProfileField: React.FC<ProfileFieldProps> = ({ label, children, actions }) => (
  <div className="profile-field">
    <span className="lbl">{label}</span>
    <span
      className="val"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
      {actions}
    </span>
  </div>
)
