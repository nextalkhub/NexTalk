import React from 'react'
import { Icon } from '../../../shared/components/Icon/Icon'
import { avatarBg, avatarHue, nameInitials } from '../../../shared/utils/avatar'
import styles from './VoiceParticipant.module.scss'

export interface VoiceParticipantProps {
    id: string
    name: string
    avatar: string
    isSpeaking: boolean
    isMuted: boolean
    isDeafened?: boolean
    isCurrentUser?: boolean
    onMute?: (userId: string) => void
    onKick?: (userId: string) => void
}

export const VoiceParticipant: React.FC<VoiceParticipantProps> = ({
    id,
    name,
    isSpeaking,
    isMuted,
    isDeafened,
    isCurrentUser = false,
}) => {
    const hue = avatarHue(id)
    const initials = nameInitials(name)

    return (
        <div className={`${styles.tile} ${isSpeaking ? styles.speaking : ''} ${isCurrentUser ? styles.self : ''}`}>
            <div className={styles.indicator}>
                {isMuted && (
                    <span className={`${styles.ind} ${styles.indMuted}`} title="Микрофон выключен">
                        <Icon name="mic-off" size={12} />
                    </span>
                )}
                {isDeafened && (
                    <span className={styles.ind} title="Наушники выключены">
                        <Icon name="headphones-off" size={12} />
                    </span>
                )}
            </div>

            <span className={styles.avatar} style={{ background: avatarBg(hue) }}>
                {initials || '?'}
            </span>

            <div className={styles.tileName}>{name.split(' ')[0]}</div>

            <div className={styles.tileTags}>
                {isCurrentUser && <span className={`${styles.chip} ${styles.chipBrand}`}>вы</span>}
            </div>

            <div className={styles.wave}>
                {Array.from({ length: 10 }).map((_, i) => (
                    <i key={i} />
                ))}
            </div>
        </div>
    )
}
