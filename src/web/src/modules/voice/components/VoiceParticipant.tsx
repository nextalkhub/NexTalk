import React, { useState } from 'react'
import { Icon } from '../../../shared/components/Icon/Icon'
import styles from './VoiceParticipant.module.scss'

export interface VoiceParticipantProps {
    id: string
    name: string
    avatar: string
    isSpeaking: boolean
    isMuted: boolean
    isDeafened?: boolean
    isCurrentUser?: boolean
    volume?: number
    onMute?: (userId: string) => void
    onKick?: (userId: string) => void
}

export const VoiceParticipant: React.FC<VoiceParticipantProps> = ({
                                                                      id,
                                                                      name,
                                                                      avatar,
                                                                      isSpeaking,
                                                                      isMuted,
                                                                      isDeafened: _isDeafened = false,
                                                                      isCurrentUser = false,
                                                                      volume = 50,
                                                                      onMute,
                                                                      onKick,
                                                                  }) => {
    const [showActions, setShowActions] = useState(false)

    return (
        <div
            className={`${styles.participant} ${isSpeaking ? styles.speaking : ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className={styles.avatarContainer}>
                <div className={styles.avatar}>
                    {avatar.charAt(0).toUpperCase()}
                    {isSpeaking && <div className={styles.speakingRing} />}
                </div>

                {isMuted && (
                    <div className={styles.mutedBadge}>
                        <Icon name="mic-off" size={12} />
                    </div>
                )}
            </div>

            <div className={styles.info}>
                <div className={styles.name}>
                    {name}
                    {isCurrentUser && <span className={styles.currentBadge}>Вы</span>}
                </div>

                <div className={styles.status}>
                    {isMuted ? (
                        <span className={styles.muted}>Микрофон выключен</span>
                    ) : isSpeaking ? (
                        <span className={styles.speakingStatus}>Говорит</span>
                    ) : (
                        <span className={styles.idle}>В сети</span>
                    )}
                </div>

                {isSpeaking && !isMuted && (
                    <div className={styles.volumeWave}>
                        <div className={styles.waveBar} style={{ height: `${20 + volume / 5}%` }} />
                        <div className={styles.waveBar} style={{ height: `${30 + volume / 4}%` }} />
                        <div className={styles.waveBar} style={{ height: `${40 + volume / 3}%` }} />
                        <div className={styles.waveBar} style={{ height: `${30 + volume / 4}%` }} />
                        <div className={styles.waveBar} style={{ height: `${20 + volume / 5}%` }} />
                    </div>
                )}
            </div>

            {showActions && !isCurrentUser && (
                <div className={styles.actions}>
                    {onMute && (
                        <button
                            onClick={() => onMute(id)}
                            className={styles.actionBtn}
                            title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
                        >
                            <Icon name={isMuted ? 'mic' : 'mic-off'} size={14} />
                        </button>
                    )}
                    {onKick && (
                        <button
                            onClick={() => onKick(id)}
                            className={`${styles.actionBtn} ${styles.kick}`}
                            title="Выгнать"
                        >
                            <Icon name="logout" size={14} />
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}