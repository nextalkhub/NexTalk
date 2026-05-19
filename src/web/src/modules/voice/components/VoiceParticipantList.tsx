import React from 'react'
import { VoiceParticipant, VoiceParticipantProps } from './VoiceParticipant'
import { Icon } from '../../../shared/components/Icon/Icon'
import styles from './VoiceParticipantList.module.scss'

interface VoiceParticipantListProps {
    participants: VoiceParticipantProps[]
    currentUserId?: string
    onMuteUser?: (userId: string) => void
    onKickUser?: (userId: string) => void
}

export const VoiceParticipantList: React.FC<VoiceParticipantListProps> = ({
                                                                              participants,
                                                                              currentUserId: _currentUserId,
                                                                              onMuteUser,
                                                                              onKickUser,
                                                                          }) => {
    const sortedParticipants = [...participants].sort((a, b) => {
        if (a.isCurrentUser) return -1
        if (b.isCurrentUser) return 1
        if (a.isSpeaking && !b.isSpeaking) return -1
        if (!a.isSpeaking && b.isSpeaking) return 1
        return 0
    })

    if (participants.length === 0) {
        return (
            <div className={styles.empty}>
                <div className={styles.emptyIcon}>
                    <Icon name="voice" size={48} />
                </div>
                <div className={styles.emptyText}>В голосовом канале никого нет</div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span>В голосовом канале — {participants.length}</span>
            </div>
            <div className={styles.list}>
                {sortedParticipants.map((participant) => (
                    <VoiceParticipant
                        key={participant.id}
                        {...participant}
                        onMute={onMuteUser ? () => onMuteUser(participant.id) : undefined}
                        onKick={onKickUser ? () => onKickUser(participant.id) : undefined}
                    />
                ))}
            </div>
        </div>
    )
}