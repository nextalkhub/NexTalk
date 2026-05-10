import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ServerSidebar } from '../../../shared/components/Layout/ServerSidebar'
import { ChannelSidebar } from '../../channels/components/ChannelSidebar'
import { VoiceControls } from '../components/VoiceControls'
import { VoiceParticipantList } from '../components/VoiceParticipantList'
import styles from './VoiceChannelPage.module.scss'
import { useAppSelector } from "../../../store.ts"
import { selectUser } from "../../../shared/slices/authSlice.ts"
import { useVoice } from "../../../shared/hooks/useVoice.ts"
import type { VoiceParticipantProps } from '../components/VoiceParticipant'

export const VoiceChannelPage: React.FC = () => {
  const navigate = useNavigate()
  const { serverId, channelId } = useParams<{ serverId: string; channelId: string }>()
  const user = useAppSelector(selectUser)
  const voice = useVoice()

  const [isDeafened, setIsDeafened] = useState(false)

  useEffect(() => {
    if (!channelId || !user) return

    const userArgs = {
      id: user.id,
      name: user.name
    }

    voice.joinVoice(channelId, userArgs)

    return () => {
      voice.leaveVoice(channelId)
    }
  }, [channelId, user, voice])

  const handleDisconnect = () => {
    if (channelId) {
      voice.leaveVoice(channelId)
    }
    navigate(`/servers/${serverId}/channels`)
  }

  const participantsWithCurrent: VoiceParticipantProps[] = user
      ? [
        ...voice.participants.map(p => ({
          id: p.userId,
          name: p.displayName || p.username,
          avatar: p.avatar || p.username[0].toUpperCase(),
          isSpeaking: false,
          isMuted: p.isMuted,
          isDeafened: p.isDeafened,
          isCurrentUser: false,
        })),
        {
          id: user.id,
          name: user.name,
          avatar: user.name[0].toUpperCase(),
          isSpeaking: false,
          isMuted: voice.isMuted,
          isDeafened: isDeafened,
          isCurrentUser: true,
        },
      ]
      : voice.participants.map(p => ({
        id: p.userId,
        name: p.displayName || p.username,
        avatar: p.avatar || p.username[0].toUpperCase(),
        isSpeaking: false,
        isMuted: p.isMuted,
        isDeafened: p.isDeafened,
        isCurrentUser: false,
      }))

  return (
      <div className={styles.layout}>
        <ServerSidebar />
        <ChannelSidebar />

        <div className={styles.voiceArea}>
          <div className={styles.header}>
            <div className={styles.title}>Voice Channel</div>
          </div>

          <div className={styles.content}>
            <VoiceParticipantList
                participants={participantsWithCurrent}
                currentUserId={user?.id}
            />
          </div>

          <div className={styles.controlsSection}>
            <VoiceControls
                isMuted={voice.isMuted}
                isDeafened={isDeafened}
                isConnected={voice.isConnected}
                onToggleMute={voice.toggleMic}
                onToggleDeafen={() => setIsDeafened(prev => !prev)}
                onDisconnect={handleDisconnect}
            />
          </div>
        </div>
      </div>
  )
}