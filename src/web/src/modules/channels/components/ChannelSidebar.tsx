import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IHash, ISpeaker, IPlus, IMic, IHeadset, ILogout, IGear } from '../../../shared/components/Icons/Icons'
import { Avatar, avatarBg } from '../../../shared/components/Avatar/Avatar'
import { useAppDispatch, useAppSelector } from '../../../store'
import { fetchChannels, setCurrentChannel } from '../../../shared/slices/channelSlice'
import { selectCurrentServer } from '../../../shared/slices/serverSlice'
import { selectUser, logout } from '../../../shared/slices/authSlice'
import { CreateChannelModal } from './CreateChannelModal'
import type { Channel } from '../../../shared/types'

export const ChannelSidebar: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { serverId, channelId } = useParams()

  const currentServer = useAppSelector(selectCurrentServer)
  const channels = useAppSelector(state => state.channels.channels)
  const voiceParticipants = useAppSelector(state => state.voice.channelParticipants)
  const user = useAppSelector(selectUser)

  const [createOpen, setCreateOpen] = useState(false)
  const [collapsedText, setCollapsedText] = useState(false)
  const [collapsedVoice, setCollapsedVoice] = useState(false)

  const textChannels = channels.filter(c => c.type === 'text')
  const voiceChannels = channels.filter(c => c.type === 'voice')

  const handleChannelClick = (ch: Channel) => {
    dispatch(setCurrentChannel(ch.id))
    if (ch.type === 'text') {
      navigate(`/servers/${serverId}/channels/${ch.id}`)
    } else {
      navigate(`/servers/${serverId}/voice/${ch.id}`)
    }
  }

  const handleModalSuccess = () => {
    if (serverId) dispatch(fetchChannels(serverId))
  }

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/auth')
  }

  if (!currentServer && !serverId) {
    return (
      <aside className="side">
        <div className="side-banner">
          <div className="side-guild">
            <div className="side-guild-name">NexTalk</div>
          </div>
        </div>
        <div className="side-list" />
        {user && <SelfStatus user={user} onLogout={handleLogout} />}
      </aside>
    )
  }

  return (
    <>
      <aside className="side">
        <div className="side-banner">
          <div className="side-guild">
            <div className="side-guild-name">{currentServer?.name ?? '...'}</div>
          </div>
          <button
            className="icon-btn"
            title="Настройки сервера"
            onClick={() => navigate(`/servers/${serverId}/settings`)}
          >
            <IGear />
          </button>
        </div>

        <div className="side-list">
          <div className={`side-section${collapsedText ? ' collapsed' : ''}`}>
            <div className="side-section-h">
              <span onClick={() => setCollapsedText(v => !v)}>
                <span className="chev">▾</span>текстовые
              </span>
              <button className="add" title="Создать канал" onClick={() => setCreateOpen(true)}>
                <IPlus />
              </button>
            </div>
            <div className="side-rows">
              {textChannels.map(ch => (
                <div
                  key={ch.id}
                  role="button"
                  tabIndex={0}
                  className={`side-row${channelId === ch.id ? ' is-active' : ''}`}
                  onClick={() => handleChannelClick(ch)}
                >
                  <span className="hash"><IHash /></span>
                  <span className="side-row-name">{ch.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`side-section${collapsedVoice ? ' collapsed' : ''}`}>
            <div className="side-section-h">
              <span onClick={() => setCollapsedVoice(v => !v)}>
                <span className="chev">▾</span>голосовые
              </span>
              <button className="add" title="Создать канал" onClick={() => setCreateOpen(true)}>
                <IPlus />
              </button>
            </div>
            <div className="side-rows">
              {voiceChannels.map(ch => {
                const participants = voiceParticipants[ch.id] ?? []
                const isActive = channelId === ch.id
                return (
                  <React.Fragment key={ch.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      className={`side-row${isActive ? ' is-active' : ''}`}
                      onClick={() => handleChannelClick(ch)}
                    >
                      <span className="hash" style={{ display: 'inline-flex' }}><ISpeaker /></span>
                      <span className="side-row-name">{ch.name}</span>
                      {participants.length > 0 && (
                        <span className="unread-pill">{participants.length}</span>
                      )}
                    </div>
                    {participants.length > 0 && (
                      <div className="voice-nested">
                        {participants.map(userId => (
                          <div key={userId} className="voice-user-row">
                            <Avatar str={userId} size={22} />
                            <span className="nm">{userId}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </div>

        {user && <SelfStatus user={user} onLogout={handleLogout} />}
      </aside>

      <CreateChannelModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </>
  )
}

interface SelfStatusProps {
  user: { name: string; nickname?: string; id: string }
  onLogout: () => void
}

const SelfStatus: React.FC<SelfStatusProps> = ({ user, onLogout }) => (
  <div className="side-self">
    <span
      className="av side-self-av"
      style={{ width: 32, height: 32, minWidth: 32, background: avatarBg(user.id), fontSize: 12 }}
    >
      {user.name.charAt(0).toUpperCase()}
    </span>
    <div className="side-self-text">
      <div className="side-self-name">{user.name}</div>
      <div className="side-self-status">{user.nickname ? `@${user.nickname}` : 'в сети'}</div>
    </div>
    <div className="side-self-actions">
      <button className="icon-btn" title="Микрофон"><IMic /></button>
      <button className="icon-btn" title="Наушники"><IHeadset /></button>
      <button className="icon-btn" title="Выйти" onClick={onLogout}><ILogout /></button>
    </div>
  </div>
)

