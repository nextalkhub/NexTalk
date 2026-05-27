import React, { useContext, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar } from '../../../shared/components/Layout/TopBar'
import { avatarBg } from '../../../shared/components/Avatar/Avatar'
import { IMic, IMicOff, IHeadset, IPhoneOff } from '../../../shared/components/Icons/Icons'
import { LayoutContext } from '../../../shared/components/Layout/AppShell'
import { useAppSelector } from '../../../store'
import { selectUser } from '../../../shared/slices/authSlice'
import { useVoice } from '../../../shared/hooks/useVoice'

export const VoiceChannelPage: React.FC = () => {
  const navigate = useNavigate()
  const { serverId, channelId } = useParams<{ serverId: string; channelId: string }>()
  const user = useAppSelector(selectUser)
  const { setHideRight } = useContext(LayoutContext)

  const {
    joinVoice,
    leaveVoice,
    participants,
    isMuted,
    isConnected,
    isLocalSpeaking,
    toggleMic,
    hasMicrophonePermission,
  } = useVoice()

  const prevChannelRef = useRef<string | null>(null)

  useEffect(() => {
    setHideRight(true)
    return () => setHideRight(false)
  }, [setHideRight])

  useEffect(() => {
    if (!channelId || !user) return
    const connect = async () => {
      try {
        if (prevChannelRef.current && prevChannelRef.current !== channelId) {
          await leaveVoice(prevChannelRef.current)
        }
        prevChannelRef.current = channelId
        await joinVoice(channelId, { id: user.id, name: user.name })
      } catch (err) {
        console.error('Voice connect failed:', err)
      }
    }
    connect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, user?.id])

  useEffect(() => {
    return () => {
      if (prevChannelRef.current) leaveVoice(prevChannelRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDisconnect = async () => {
    if (channelId) await leaveVoice(channelId)
    navigate(`/servers/${serverId}/channels`)
  }

  const channels = useAppSelector(state => state.channels.channels)
  const channel = channels.find(c => c.id === channelId)

  const selfTile = user
    ? { id: user.id, name: user.name, isSelf: true, isSpeaking: isLocalSpeaking, isMuted: isMuted || hasMicrophonePermission === false }
    : null

  const remoteTiles = participants.map(p => ({
    id: p.userId,
    name: p.username,
    isSelf: false,
    isSpeaking: p.isSpeaking,
    isMuted: p.isMuted,
  }))

  const allTiles = selfTile ? [selfTile, ...remoteTiles] : remoteTiles

  return (
    <>
      <TopBar showMembers={false} onToggleMembers={() => {}} />
      <main className="main">
        <div className="voice-stage">
          <div className="voice-stage-meta">
            <div className="voice-stage-meta-left">
              <h2>{channel?.name ?? 'Voice Channel'}</h2>
              <div className="voice-stage-meta-stats">
                <span className="chip is-ok">
                  <span className="dot online" />{isConnected ? 'подключено' : 'подключение...'}
                </span>
                <span className="chip">{allTiles.length} участников</span>
              </div>
            </div>
          </div>

          <div className="voice-grid">
            {allTiles.map(tile => (
              <VoiceTile key={tile.id} {...tile} />
            ))}
          </div>

          <div className="voice-controls">
            <div className="vc-info">
              <div className="vc-status">
                <span className="dot online" />
                {isConnected ? 'Голосовой чат' : 'Подключение...'}
              </div>
            </div>
            <div className="vc-buttons">
              <button
                className={`vc-btn${isMuted ? ' is-muted' : ''}`}
                title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
                onClick={toggleMic}
              >
                {isMuted ? <IMicOff /> : <IMic />}
              </button>
              <button className="vc-btn" title="Наушники">
                <IHeadset />
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
        <span className="ind muted"><IMicOff /></span>
      </div>
    )}
    <span
      className="av"
      style={{ width: 84, height: 84, fontSize: 28, fontWeight: 700, background: avatarBg(id) }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
    <div className="voice-tile-name">{isSelf ? `${name} (вы)` : name}</div>
    <div className="tile-wave">
      {[...Array(10)].map((_, i) => <i key={i} />)}
    </div>
  </div>
)
