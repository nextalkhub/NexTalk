import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ISpeaker, IUsers, ILogout } from '../Icons/Icons'
import { useAppSelector } from '../../../store'
import { selectCurrentServer } from '../../slices/serverSlice'
import { useGlobalModal } from './ModalProvider'
import { useLayout } from './AppShell'

const MOBILE_BP = 768

interface TopBarProps {
  showMembers: boolean
  onToggleMembers: () => void
}

export const TopBar: React.FC<TopBarProps> = ({ showMembers, onToggleMembers }) => {
  const navigate = useNavigate()
  const { channelId } = useParams()
  const currentServer = useAppSelector(selectCurrentServer)
  const channels = useAppSelector(state => state.channels.channels)
  const { open } = useGlobalModal()
  const { mobileNavOpen, setMobileNavOpen, mobileRightOpen, setMobileRightOpen } = useLayout()
  const [logoutFallback, setLogoutFallback] = useState(false)

  const channel = channels.find(c => c.id === channelId)

  const handleLogout = () => {
    try {
      open('logout')
    } catch {
      setLogoutFallback(true)
    }
  }

  const handleMembersClick = () => {
    if (window.innerWidth <= MOBILE_BP) {
      setMobileRightOpen(!mobileRightOpen)
    } else {
      onToggleMembers()
    }
  }

  const membersActive = window.innerWidth <= MOBILE_BP ? mobileRightOpen : showMembers

  return (
    <header className="top">
      <button
        className="top-menu-btn"
        title="Меню"
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
      >
        <IMenu />
      </button>
      <div className="top-left">
        <div className="top-breadcrumb">
          {currentServer && (
            <>
              <span className="crumb-server">{currentServer.name}</span>
              <span className="crumb-sep"><IChevRightInline /></span>
            </>
          )}
          <span className="crumb-channel">
            {channel?.type === 'voice'
              ? <ISpeaker />
              : <span className="hash">#</span>}
            {channel?.name ?? 'Выберите канал'}
          </span>
        </div>
      </div>
      <div className="top-actions">
        <button
          className={`icon-btn${membersActive ? ' is-active' : ''}`}
          title="Участники"
          onClick={handleMembersClick}
        >
          <IUsers />
        </button>
        <button className="icon-btn" title="Выйти" onClick={handleLogout}>
          <ILogout />
        </button>
      </div>
      {logoutFallback && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000 }}
             onClick={() => setLogoutFallback(false)}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg-3)', padding: 24, borderRadius: 12, color: 'var(--fg-0)' }}>
            <p style={{ marginBottom: 16 }}>Перейти на страницу входа?</p>
            <button className="btn-danger" onClick={() => navigate('/auth')}>Выйти</button>
          </div>
        </div>
      )}
    </header>
  )
}

const IMenu: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
)

const IChevRightInline: React.FC = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M9 6l6 6-6 6"/>
  </svg>
)
