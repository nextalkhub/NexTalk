import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ISpeaker, IUsers, ILogout } from '../Icons/Icons'
import { useAppDispatch, useAppSelector } from '../../../store'
import { selectCurrentServer } from '../../slices/serverSlice'
import { logout } from '../../slices/authSlice'

interface TopBarProps {
  showMembers: boolean
  onToggleMembers: () => void
}

export const TopBar: React.FC<TopBarProps> = ({ showMembers, onToggleMembers }) => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { channelId } = useParams()
  const currentServer = useAppSelector(selectCurrentServer)
  const channels = useAppSelector(state => state.channels.channels)

  const channel = channels.find(c => c.id === channelId)

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/auth')
  }

  return (
    <header className="top">
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
          className={`icon-btn${showMembers ? ' is-active' : ''}`}
          title="Участники"
          onClick={onToggleMembers}
        >
          <IUsers />
        </button>
        <button className="icon-btn" title="Выйти" onClick={handleLogout}>
          <ILogout />
        </button>
      </div>
    </header>
  )
}

const IChevRightInline: React.FC = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M9 6l6 6-6 6"/>
  </svg>
)
