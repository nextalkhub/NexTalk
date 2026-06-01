import React, { useContext, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar } from '../../../shared/components/Layout/TopBar'
import { avatarBg } from '../../../shared/components/Avatar/Avatar'
import { IMic, IMicOff, IHeadset, IHeadsetOff, IPhoneOff } from '../../../shared/components/Icons/Icons'
import { LayoutContext } from '../../../shared/components/Layout/AppShell'
import { useAppSelector } from '../../../store'
import { selectUser } from '../../../shared/slices/authSlice'
import { useVoiceContext } from '../../../shared/contexts/VoiceContext'
import { pluralize } from '../../../shared/utils/format'
import { getInitials } from '../../../shared/utils/initials'
import type { Member } from '../../../shared/types'

const pluralPeople = (n: number) => pluralize(n, 'участник', 'участника', 'участников')

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '🔥', '👏', '😢']

export const VoiceChannelPage: React.FC = () => {
  const navigate = useNavigate()
  const { serverId, channelId } = useParams<{ serverId: string; channelId: string }>()
  const user = useAppSelector(selectUser)
  const { setHideRight } = useContext(LayoutContext)

  const {
    joinVoice,
    leaveVoice,
    participants,
    reactions,
    isMuted,
    isDeafened,
    isConnected,
    isLocalSpeaking,
    toggleMic,
    toggleDeafen,
    sendReaction,
    hasMicrophonePermission,
  } = useVoiceContext()

  useEffect(() => {
    setHideRight(true)
    return () => setHideRight(false)
  }, [setHideRight])

  useEffect(() => {
    if (!channelId || !user) return
    joinVoice(channelId, { id: user.id, name: user.name }).catch(err => {
      console.error('Voice connect failed:', err)
    })
  }, [channelId, user?.id, joinVoice])

  const handleDisconnect = async () => {
    if (channelId) await leaveVoice(channelId)
    navigate(`/servers/${serverId}/channels`)
  }

  const channels = useAppSelector(state => state.channels.channels)
  const channel = channels.find(c => c.id === channelId)
  const members: Member[] = useAppSelector(state => state.members.members[serverId ?? ''] ?? [])

  const getMemberName = (userId: string) =>
    members.find(m => m.userId === userId)?.displayName ?? userId

  const selfTile = user
    ? {
        id: user.id,
        name: user.name,
        isSelf: true,
        isSpeaking: isLocalSpeaking,
        isMuted: isMuted || hasMicrophonePermission === false,
      }
    : null

  const remoteTiles = participants.map(p => ({
    id: p.userId,
    name: getMemberName(p.userId),
    isSelf: false,
    isSpeaking: p.isSpeaking,
    isMuted: p.isMuted,
  }))

  const allTiles = selfTile ? [selfTile, ...remoteTiles] : remoteTiles

  return (
    <>
      <TopBar showMembers={false} onToggleMembers={() => {}} hasMembers={false} />
      <main className="main">
        <div className="voice-stage">
          <div className="voice-stage-meta">
            <div className="voice-stage-meta-left">
              <h2>{channel?.name ?? 'Голосовой канал'}</h2>
              <div className="voice-stage-meta-stats">
                <span className={`chip ${isConnected ? 'is-ok' : 'is-warn'}`}>
                  <span className={`dot ${isConnected ? 'online' : 'idle'}`} />
                  {isConnected ? 'подключено' : 'подключение...'}
                </span>
                <span className="chip">{pluralPeople(allTiles.length)}</span>
                {hasMicrophonePermission === false && (
                  <span className="chip is-warn" title="Браузер не дал доступ к микрофону">
                    нет доступа к микрофону
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="voice-reactions-layer" aria-hidden="true">
            {reactions.map(r => (
              <div key={r.id} className="voice-reaction" style={{ left: `${r.left}%` }}>
                <span className="emoji">{r.emoji}</span>
                <span className="who">{r.senderName}</span>
              </div>
            ))}
          </div>

          {allTiles.length === 0 ? (
            <div className="empty-state" style={{ flex: 1 }}>
              <div className="icon-blob"><IMic /></div>
              <h2>Подключаемся к каналу...</h2>
              <p>Если ничего не происходит, проверьте разрешение на микрофон в браузере.</p>
            </div>
          ) : (
            <div className="voice-grid">
              {allTiles.map(tile => (
                <VoiceTile key={tile.id} {...tile} />
              ))}
            </div>
          )}

          <div className="voice-controls">
            <div className="vc-info">
              <div className="vc-status">
                <span className={`dot ${isConnected ? 'online' : 'idle'}`} />
                {isConnected ? 'Голосовой чат' : 'Подключение...'}
              </div>
            </div>
            <div className="vc-reactions">
              {REACTION_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  className="vc-reaction-btn"
                  title="Отправить реакцию"
                  onClick={() => sendReaction(emoji)}
                  disabled={!isConnected}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="vc-buttons">
              <button
                className={`vc-btn${isMuted ? ' is-muted' : ''}`}
                title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
                onClick={toggleMic}
              >
                {isMuted ? <IMicOff /> : <IMic />}
              </button>
              <button
                className={`vc-btn${isDeafened ? ' is-muted' : ''}`}
                title={isDeafened ? 'Включить наушники' : 'Выключить наушники'}
                onClick={toggleDeafen}
              >
                {isDeafened ? <IHeadsetOff /> : <IHeadset />}
              </button>
              <button className="vc-btn is-leave" onClick={handleDisconnect}>
                <IPhoneOff />
                Отключиться
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

interface TileProps {
  id: string
  name: string
  isSelf: boolean
  isSpeaking: boolean
  isMuted: boolean
}

const VoiceTile: React.FC<TileProps> = ({ id, name, isSelf, isSpeaking, isMuted }) => (
  <div className={`voice-tile${isSelf ? ' is-self' : ''}${isSpeaking ? ' is-speaking' : ''}`}>
    {isMuted && (
      <div className="voice-tile-indicator">
        <span className="ind muted" title="Микрофон выключен"><IMicOff /></span>
      </div>
    )}
    <span
      className="av"
      style={{ width: 84, height: 84, fontSize: 28, fontWeight: 700, background: avatarBg(id) }}
    >
      {getInitials(name)}
    </span>
    <div className="voice-tile-name">{isSelf ? `${name} (вы)` : name}</div>
    <div className="tile-wave" aria-hidden="true">
      {[...Array(10)].map((_, i) => <i key={i} />)}
    </div>
  </div>
)
