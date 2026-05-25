import React, { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ServerSidebar } from '../../../shared/components/Layout/ServerSidebar'
import { ChannelSidebar } from '../../channels/components/ChannelSidebar'
import { VoiceControls } from '../components/VoiceControls'
import { VoiceParticipantList } from '../components/VoiceParticipantList'
import styles from './VoiceChannelPage.module.scss'
import { useAppDispatch, useAppSelector } from '../../../store'
import { selectUser } from '../../../shared/slices/authSlice'
import { useVoice } from '../../../shared/hooks/useVoice'
import { fetchChannels } from '../../../shared/slices/channelSlice'
import type { VoiceParticipantProps } from '../components/VoiceParticipant'

export const VoiceChannelPage: React.FC = () => {
    const navigate = useNavigate()
    const dispatch = useAppDispatch()

    const { serverId, channelId } = useParams<{ serverId: string; channelId: string }>()

    const user = useAppSelector(selectUser)
    const channels = useAppSelector(state => state.channels.channels)
    const currentChannel = channels.find(c => c.id === channelId) ?? null

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

    const previousChannelRef = useRef<string | null>(null)

    useEffect(() => {
        if (serverId) dispatch(fetchChannels(serverId))
    }, [serverId, dispatch])

    useEffect(() => {
        if (!channelId || !user) return
        const connect = async () => {
            if (previousChannelRef.current && previousChannelRef.current !== channelId) {
                await leaveVoice(previousChannelRef.current)
            }
            previousChannelRef.current = channelId
            await joinVoice(channelId, { id: user.id, name: user.name })
        }
        connect()
    }, [channelId, user?.id])

    useEffect(() => {
        return () => {
            if (previousChannelRef.current) leaveVoice(previousChannelRef.current)
        }
    }, [])

    const handleDisconnect = async () => {
        if (channelId) await leaveVoice(channelId)
        navigate(`/servers/${serverId}/channels`)
    }

    const tiles: VoiceParticipantProps[] = user
        ? [
              {
                  id: user.id,
                  name: user.name,
                  avatar: user.name[0].toUpperCase(),
                  isSpeaking: isLocalSpeaking,
                  isMuted: isMuted || !hasMicrophonePermission,
                  isCurrentUser: true,
              },
              ...participants.map(p => ({
                  id: p.userId,
                  name: p.username,
                  avatar: p.username[0].toUpperCase(),
                  isSpeaking: p.isSpeaking,
                  isMuted: p.isMuted,
                  isDeafened: p.isDeafened,
                  isCurrentUser: false,
              })),
          ]
        : []

    return (
        <div className={styles.layout}>
            <div className={styles.rail}>
                <ServerSidebar />
            </div>
            <div className={styles.side}>
                <ChannelSidebar />
            </div>

            <div className={styles.stage}>
                <div className={styles.stageMeta}>
                    <div className={styles.stageLeft}>
                        <h2 className={styles.stageTitle}>
                            {currentChannel?.name ?? 'Голосовой канал'}
                        </h2>
                        <span className={`${styles.chip} ${isConnected ? styles.chipOk : ''}`}>
                            <span className={`${styles.dot} ${isConnected ? styles.dotOk : ''}`} />
                            {isConnected ? 'LiveKit подключён' : 'не подключено'}
                        </span>
                    </div>
                    <div className={styles.stageStats}>
                        <span className={styles.chip}>{tiles.length} в комнате</span>
                    </div>
                </div>

                <VoiceParticipantList participants={tiles} currentUserId={user?.id} />

                <VoiceControls
                    isMuted={isMuted}
                    isConnected={isConnected}
                    channelName={currentChannel?.name}
                    onToggleMute={toggleMic}
                    onDisconnect={handleDisconnect}
                    hasMicrophonePermission={hasMicrophonePermission}
                />
            </div>
        </div>
    )
}
