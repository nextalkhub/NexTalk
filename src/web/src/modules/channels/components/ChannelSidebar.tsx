import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { IHash, ISpeaker, IPlus, IGear, ILogout, IMic, IMicOff, IHeadset, IHeadsetOff, IPhoneOff } from '../../../shared/components/Icons/Icons'
import { Avatar } from '../../../shared/components/Avatar/Avatar'
import { useGlobalModal } from '../../../shared/components/Layout/ModalProvider'
import { useAppDispatch, useAppSelector } from '../../../store'
import { fetchChannels, setCurrentChannel } from '../../../shared/slices/channelSlice'
import { fetchMembers } from '../../../shared/slices/memberSlice'
import { setChannelParticipants } from '../../../shared/slices/voiceSlice'
import { getVoiceParticipants } from '../../../processes/voice/getVoiceParticipants'
import { selectCurrentServer, selectServers, setCurrentServer } from '../../../shared/slices/serverSlice'
import { useVoiceContext } from '../../../shared/contexts/VoiceContext'
import { selectUser } from '../../../shared/slices/authSlice'
import { CreateChannelModal } from './CreateChannelModal'
import { useSidebarResize } from '../../../shared/hooks/useSidebarResize'
import { pluralMembers } from '../../../shared/utils/format'
import { useLayout } from '../../../shared/components/Layout/AppShell'

import type { Channel } from '../../../shared/types'

export const ChannelSidebar: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { serverId: routeServerId, channelId } = useParams()
  const { pathname } = useLocation()

  const allServers = useAppSelector(selectServers)
  const currentServer = useAppSelector(selectCurrentServer)
  const serverId = routeServerId ?? currentServer?.id
  const channels = useAppSelector(state => state.channels.channels)
  const voiceParticipants = useAppSelector(state => state.voice.channelParticipants)
  const members = useAppSelector(state => state.members.members[serverId ?? ''] ?? [])
  const onlineSet = useAppSelector(state => state.presence.online)
  const user = useAppSelector(selectUser)
  const { onMouseDown: onResizeMouseDown } = useSidebarResize()
  const { setDrawerOpen } = useLayout()

  const {
    activeChannelId: voiceChannelId,
    isConnected: voiceConnected,
    isMuted: voiceMuted,
    isDeafened: voiceDeafened,
    participants: liveKitParticipants,
    toggleMic,
    toggleDeafen,
    leaveVoice,
  } = useVoiceContext()

  const onlineCount = members.filter(m => !!onlineSet[m.userId]).length

  const handleVoiceLeave = async () => {
    if (!voiceChannelId) return
    await leaveVoice(voiceChannelId)
    if (/\/voice\//.test(pathname) && serverId) {
      navigate(`/servers/${serverId}/channels`)
    }
  }

  useEffect(() => {
    if (!serverId || serverId === 'undefined') return
    if ((!currentServer || currentServer.id !== serverId) && allServers.length > 0) {
      const found = allServers.find(s => s.id === serverId)
      if (found) dispatch(setCurrentServer(found))
    }
  }, [serverId, allServers, currentServer, dispatch])

  useEffect(() => {
    if (serverId && serverId !== 'undefined') dispatch(fetchMembers(serverId))
  }, [serverId, dispatch])

  // Первичная синхронизация участников голосовых каналов. Gateway-события
  // voice.joined/left получают только уже подключенные клиенты, поэтому при
  // загрузке состояние подтягиваем явно - иначе ранее зашедшие не видны.
  const voiceChannelIdsKey = channels.filter(c => c.type === 'voice').map(c => c.id).join(',')
  useEffect(() => {
    if (!voiceChannelIdsKey) return
    voiceChannelIdsKey.split(',').forEach(id => {
      getVoiceParticipants(id)
        .then(userIds => dispatch(setChannelParticipants({ channelId: id, userIds })))
        .catch(() => { /* best-effort: отсутствие данных не критично */ })
    })
  }, [voiceChannelIdsKey, dispatch])

  const [createOpen, setCreateOpen] = useState(false)
  const [collapsedText, setCollapsedText] = useState(false)
  const [collapsedVoice, setCollapsedVoice] = useState(false)

  const textChannels = channels.filter(c => c.type === 'text')
  const voiceChannels = channels.filter(c => c.type === 'voice')

  const handleChannelClick = (ch: Channel) => {
    dispatch(setCurrentChannel(ch.id))
    setDrawerOpen(false)
    if (ch.type === 'text') {
      navigate(`/servers/${serverId}/channels/${ch.id}`)
    } else {
      navigate(`/servers/${serverId}/voice/${ch.id}`)
    }
  }

  const handleModalSuccess = () => {
    if (serverId && serverId !== 'undefined') dispatch(fetchChannels(serverId))
  }

  const handleOpenSettings = () => navigate('/settings')

  if (!currentServer && !serverId) {
    return (
      <aside className="side">
        <div className="side-resize-handle" onMouseDown={onResizeMouseDown} />
        <div className="side-banner">
          <div className="side-guild">
            <div className="side-guild-name">NexTalk</div>
            <div className="side-guild-meta">личное пространство</div>
          </div>
        </div>
        <div className="side-list">
          <div className="side-section">
            <div className="side-section-h"><span>навигация</span></div>
            <div className="side-rows">
              <button
                className={`side-row${pathname === '/servers' ? ' is-active' : ''}`}
                onClick={() => navigate('/servers')}
              >
                <span className="side-row-name">Главная</span>
              </button>
              <button
                className={`side-row${pathname === '/profile' ? ' is-active' : ''}`}
                onClick={() => navigate('/profile')}
              >
                <span className="side-row-name">Профиль</span>
              </button>
              <button
                className={`side-row${pathname === '/settings' ? ' is-active' : ''}`}
                onClick={() => navigate('/settings')}
              >
                <span className="side-row-name">Настройки</span>
              </button>
            </div>
          </div>
        </div>
        {voiceConnected && voiceChannelId && (
          <VoiceStatusBar
            channelId={voiceChannelId}
            isMuted={voiceMuted}
            isDeafened={voiceDeafened}
            onToggleMic={toggleMic}
            onToggleDeafen={toggleDeafen}
            onLeave={handleVoiceLeave}
          />
        )}
        {user && <SelfStatus user={user} onOpenSettings={handleOpenSettings} />}
      </aside>
    )
  }

  return (
    <>
      <aside className="side">
        <div className="side-resize-handle" onMouseDown={onResizeMouseDown} />
        <div className="side-banner">
          <div className="side-guild">
            <div className="side-guild-name">{currentServer?.name ?? '...'}</div>
            {members.length > 0 && (
              <div className="side-guild-meta">
                <span className="dot online" style={{ width: 6, height: 6, marginRight: 4 }} />
                {onlineCount} онлайн · {pluralMembers(members.length)}
              </div>
            )}
          </div>
          <button
            className="guild-settings-btn"
            title="Настройки сервера"
            onClick={() => { const id = currentServer?.id ?? serverId; if (id) navigate(`/servers/${id}/settings`) }}
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
              {textChannels.length === 0 ? (
                <div className="side-empty-hint">Нет каналов</div>
              ) : textChannels.map(ch => (
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
              {voiceChannels.length === 0 ? (
                <div className="side-empty-hint">Нет каналов</div>
              ) : voiceChannels.map(ch => {
                // Фильтруем текущего пользователя из каналов, где он не активен,
                // чтобы избежать появления в двух каналах при переключении.
                const participants = (voiceParticipants[ch.id] ?? []).filter(
                  uid => ch.id === voiceChannelId || uid !== user?.id
                )
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
                        {participants.map(userId => {
                          const name = members.find(m => m.userId === userId)?.displayName ?? userId
                          const lkp = ch.id === voiceChannelId
                            ? liveKitParticipants.find(p => p.userId === userId)
                            : undefined
                          const isMuted = lkp?.isMuted ?? (userId === user?.id && voiceMuted)
                          const isDeafened = lkp?.isDeafened ?? (userId === user?.id && voiceDeafened)
                          return (
                            <div key={userId} className="voice-user-row">
                              <Avatar str={name} size={22} />
                              <span className="nm">{name}</span>
                              {isDeafened && (
                                <span className="voice-user-status deafened" title="Наушники выключены"><IHeadsetOff /></span>
                              )}
                              {isMuted && !isDeafened && (
                                <span className="voice-user-status muted" title="Микрофон выключен"><IMicOff /></span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </div>

        {voiceConnected && voiceChannelId && (
          <VoiceStatusBar
            channelId={voiceChannelId}
            isMuted={voiceMuted}
            isDeafened={voiceDeafened}
            onToggleMic={toggleMic}
            onToggleDeafen={toggleDeafen}
            onLeave={handleVoiceLeave}
          />
        )}
        {user && <SelfStatus user={user} onOpenSettings={handleOpenSettings} />}
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
  onOpenSettings: () => void
}

const SelfStatus: React.FC<SelfStatusProps> = ({ user, onOpenSettings }) => {
  const { open } = useGlobalModal()

  return (
    <div className="side-self">
      <div className="side-self-av">
        <Avatar str={user.name} size={32} />
      </div>
      <div className="side-self-text">
        <div className="side-self-name">{user.name}</div>
        <div className="side-self-status">
          {user.nickname ? `@${user.nickname}` : 'в сети'}
        </div>
      </div>
      <div className="side-self-actions">
        <button className="icon-btn" title="Настройки приложения" onClick={onOpenSettings}>
          <IGear />
        </button>
        <button
          className="icon-btn is-danger"
          title="Выйти из аккаунта"
          onClick={() => open('logout')}
        >
          <ILogout />
        </button>
      </div>
    </div>
  )
}

interface VoiceStatusBarProps {
  channelId: string
  isMuted: boolean
  isDeafened: boolean
  onToggleMic: () => void
  onToggleDeafen: () => void
  onLeave: () => void
}

const VoiceStatusBar: React.FC<VoiceStatusBarProps> = ({
  channelId, isMuted, isDeafened, onToggleMic, onToggleDeafen, onLeave,
}) => {
  const channels = useAppSelector(state => state.channels.channels)
  const channelName = channels.find(c => c.id === channelId)?.name ?? 'голосовой канал'

  return (
    <div className="voice-status-bar">
      <div className="vsb-info">
        <div className="vsb-text">
          <div className="vsb-label">
            <span className="dot online" style={{ width: 6, height: 6, flexShrink: 0 }} />
            Голосовой чат
          </div>
          <div className="vsb-channel">#{channelName}</div>
        </div>
        <div className="vsb-actions">
          <button
            className={`vsb-btn${isMuted ? ' is-muted' : ''}`}
            title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
            onClick={onToggleMic}
          >
            {isMuted ? <IMicOff /> : <IMic />}
          </button>
          <button
            className={`vsb-btn${isDeafened ? ' is-muted' : ''}`}
            title={isDeafened ? 'Включить наушники' : 'Отключить наушники'}
            onClick={onToggleDeafen}
          >
            {isDeafened ? <IHeadsetOff /> : <IHeadset />}
          </button>
          <button className="vsb-btn is-leave" title="Покинуть голосовой канал" onClick={onLeave}>
            <IPhoneOff />
          </button>
        </div>
      </div>
    </div>
  )
}
