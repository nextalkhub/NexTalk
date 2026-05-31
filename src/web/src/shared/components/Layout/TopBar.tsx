import React, { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ISpeaker, IUsers, ILogout } from '../Icons/Icons'
import { useAppSelector } from '../../../store'
import { selectCurrentServer } from '../../slices/serverSlice'
import { useGlobalModal } from './ModalProvider'
import { useLayout } from './AppShell'
import { useIsPhone } from '../../hooks/useBreakpoint'
import { MobileMenuButton } from './MobileMenuButton'

interface TopBarProps {
  showMembers: boolean
  onToggleMembers: () => void
  /** When false, hides the "Users" toggle button. Use on routes
   *  that don't render MembersSidebar (e.g. voice channels). */
  hasMembers?: boolean
}

export const TopBar: React.FC<TopBarProps> = ({
  showMembers,
  onToggleMembers,
  hasMembers = true,
}) => {
  const navigate = useNavigate()
  const { channelId } = useParams()
  const { pathname } = useLocation()
  const currentServer = useAppSelector(selectCurrentServer)
  const channels = useAppSelector(state => state.channels.channels)
  const { open } = useGlobalModal()
  const { drawerOpen, setDrawerOpen, membersOpen, setMembersOpen, hideRight } = useLayout()
  const isPhone = useIsPhone()
  const [logoutFallback, setLogoutFallback] = useState(false)

  const channel = channels.find(c => c.id === channelId)

  // The Users toggle is meaningless on pages that suppress the right rail
  // (Home / Profile / Settings / Voice). Hide it there instead of opening
  // an empty backdrop.
  const showMembersButton = hasMembers && !hideRight

  // Settings / Profile / Home don't have a real "channel" — show a friendly label
  const isSettings  = pathname.startsWith('/settings') || /\/servers\/[^/]+\/settings/.test(pathname)
  const isProfile   = pathname.startsWith('/profile')
  const isHome      = pathname === '/servers' || pathname === '/'

  const fallbackTitle =
    isSettings ? 'Настройки' :
    isProfile  ? 'Профиль' :
    isHome     ? 'Главная' :
    'Выберите канал'

  const handleLogout = () => {
    try {
      open('logout')
    } catch {
      setLogoutFallback(true)
    }
  }

  const handleMembersClick = () => {
    if (isPhone) {
      setMembersOpen(!membersOpen)
    } else {
      onToggleMembers()
    }
  }

  const membersActive = isPhone ? membersOpen : showMembers

  return (
    <header className="top">
      <MobileMenuButton onClick={() => setDrawerOpen(!drawerOpen)} />
      <div className="top-left">
        <div className="top-breadcrumb">
          {currentServer && !isHome && (
            <>
              <span className="crumb-server">{currentServer.name}</span>
              <span className="crumb-sep"><IChevRightInline /></span>
            </>
          )}
          <span className="crumb-channel">
            {channel
              ? (channel.type === 'voice' ? <ISpeaker /> : <span className="hash">#</span>)
              : null}
            {channel?.name ?? fallbackTitle}
          </span>
        </div>
      </div>
      <div className="top-actions">
        {showMembersButton && (
          <button
            className={`icon-btn${membersActive ? ' is-active' : ''}`}
            title="Участники"
            onClick={handleMembersClick}
          >
            <IUsers />
          </button>
        )}
        <button className="icon-btn" title="Выйти" onClick={handleLogout}>
          <ILogout />
        </button>
      </div>
      {logoutFallback && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000 }}
          onClick={() => setLogoutFallback(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--bg-3)', padding: 24, borderRadius: 12, color: 'var(--fg-0)',
            }}
          >
            <p style={{ marginBottom: 16 }}>Перейти на страницу входа?</p>
            <button className="btn-danger" onClick={() => navigate('/auth')}>Выйти</button>
          </div>
        </div>
      )}
    </header>
  )
}

const IChevRightInline: React.FC = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M9 6l6 6-6 6"/>
  </svg>
)
