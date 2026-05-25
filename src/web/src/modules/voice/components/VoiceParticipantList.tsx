import React from 'react'
import { VoiceParticipant, VoiceParticipantProps } from './VoiceParticipant'
import { Icon } from '../../../shared/components/Icon/Icon'
import styles from './VoiceParticipantList.module.scss'

interface VoiceParticipantListProps {
    participants: VoiceParticipantProps[]
    currentUserId?: string
}

export const VoiceParticipantList: React.FC<VoiceParticipantListProps> = ({
    participants,
    currentUserId: _currentUserId,
}) => {
    const sorted = [...participants].sort((a, b) => {
        if (a.isCurrentUser) return -1
        if (b.isCurrentUser) return 1
        if (a.isSpeaking && !b.isSpeaking) return -1
        if (!a.isSpeaking && b.isSpeaking) return 1
        return 0
    })

    if (sorted.length === 0) {
        return (
            <div className={styles.empty}>
                <div className={styles.emptyBlob}>
                    <Icon name="speaker" size={28} />
                </div>
                <p className={styles.emptyTitle}>Никого нет</p>
                <p className={styles.emptyText}>Присоединитесь к голосовому каналу первым.</p>
            </div>
        )
    }

    return (
        <div className={styles.grid}>
            {sorted.map(p => (
                <VoiceParticipant key={p.id} {...p} />
            ))}
        </div>
    )
}
