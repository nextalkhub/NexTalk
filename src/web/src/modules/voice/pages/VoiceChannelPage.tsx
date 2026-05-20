import React, { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ServerSidebar } from '../../../shared/components/Layout/ServerSidebar'
import { ChannelSidebar } from '../../channels/components/ChannelSidebar'
import { VoiceControls } from '../components/VoiceControls'
import { VoiceParticipantList } from '../components/VoiceParticipantList'
import styles from './VoiceChannelPage.module.scss'
import { useAppSelector } from "../../../store"
import { selectUser } from "../../../shared/slices/authSlice"
import { useVoice } from "../../../shared/hooks/useVoice"
import type { VoiceParticipantProps } from '../components/VoiceParticipant'

export const VoiceChannelPage: React.FC = () => {

  const navigate = useNavigate()

  const { serverId, channelId } = useParams<{
    serverId:string
    channelId:string
  }>()

  const user = useAppSelector(selectUser)

  const {
    joinVoice,
    leaveVoice,
    participants,
    isMuted,
    isConnected,
    isLocalSpeaking,
    toggleMic
  } = useVoice()

  const previousChannelRef = useRef<string | null>(null)

  useEffect(() => {
    if (!channelId || !user) return

    const connect = async () => {

      if (
          previousChannelRef.current &&
          previousChannelRef.current !== channelId
      ) {
        await leaveVoice(
            previousChannelRef.current
        )
      }

      previousChannelRef.current = channelId

      await joinVoice(
          channelId,
          {
            id: user.id,
            name: user.name
          }
      )
    }

    connect()

    return () => {}
  }, [channelId, user?.id])

  useEffect(() => {
    return () => {
      if (previousChannelRef.current) {
        leaveVoice(previousChannelRef.current)
      }
    }
  }, [])

  const handleDisconnect = async()=>{

    if(channelId){
      await leaveVoice(channelId)
    }

    navigate(
        `/servers/${serverId}/channels`
    )
  }

  const participantsWithCurrent: VoiceParticipantProps[] =
      user
          ? [
            {
              id:user.id,
              name:user.name,
              avatar:user.name[0].toUpperCase(),
              isSpeaking:isLocalSpeaking,
              isMuted,
              isCurrentUser:true
            },

            ...participants.map(p=>({

              id:p.userId,
              name:p.username,
              avatar:p.username[0].toUpperCase(),
              isSpeaking:p.isSpeaking,
              isMuted:p.isMuted,
              isDeafened:p.isDeafened,
              isCurrentUser:false
            }))
          ]
          : []

  return (
      <div className={styles.layout}>

        <ServerSidebar/>
        <ChannelSidebar/>

        <div className={styles.voiceArea}>

          <div className={styles.header}>
            <div className={styles.title}>
              Voice Channel
            </div>
          </div>

          <div className={styles.content}>
            <VoiceParticipantList
                participants={participantsWithCurrent}
                currentUserId={user?.id}
            />
          </div>

          <div className={styles.controlsSection}>
            <VoiceControls
                isMuted={isMuted}
                isConnected={isConnected}
                onToggleMute={toggleMic}
                onDisconnect={handleDisconnect}
            />
          </div>

        </div>
      </div>
  )
}