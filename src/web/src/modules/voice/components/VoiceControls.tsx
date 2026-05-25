import React from 'react'
import { Icon } from '../../../shared/components/Icon/Icon'
import styles from './VoiceControls.module.scss'

interface VoiceControlsProps {
    isMuted: boolean
    isConnected: boolean
    channelName?: string
    onToggleMute: () => void
    onDisconnect: () => void
    hasMicrophonePermission?: boolean | null
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
    isMuted,
    isConnected,
    channelName,
    onToggleMute,
    onDisconnect,
    hasMicrophonePermission,
}) => {
    return (
        <div className={styles.dock}>
            <div className={styles.info}>
                <span className={styles.connStatus}>
                    <span className={`${styles.dot} ${isConnected ? styles.dotOk : styles.dotOff}`} />
                    {isConnected ? `подключено${channelName ? ` · ${channelName}` : ''}` : 'не подключено'}
                </span>
                {isConnected && (
                    <div className={styles.stats}>
                        <span className={styles.chip}>LiveKit</span>
                        <span className={`${styles.chip} ${styles.chipOk}`}>SRTP · DTLS 1.2</span>
                    </div>
                )}
            </div>

            <div className={styles.buttons}>
                <button
                    className={`${styles.vcBtn} ${isMuted ? styles.muted : ''}`}
                    onClick={onToggleMute}
                    disabled={hasMicrophonePermission === false}
                    title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
                >
                    <Icon name={isMuted ? 'mic-off' : 'mic'} size={20} />
                </button>

                {/* FEATURE-GAP: 10 — наушники / deaf */}
                <button className={styles.vcBtn} title="Наушники" disabled>
                    <Icon name="headphones" size={20} />
                </button>

                {/* FEATURE-GAP: 15 — камера */}
                <button className={styles.vcBtn} title="Камера" disabled>
                    <Icon name="camera" size={20} />
                </button>

                {/* FEATURE-GAP: 16 — демонстрация экрана */}
                <button className={styles.vcBtn} title="Демонстрация экрана" disabled>
                    <Icon name="screen" size={20} />
                </button>

                {/* FEATURE-GAP: 17 — настройки голоса */}
                <button className={styles.vcBtn} title="Настройки" disabled>
                    <Icon name="gear" size={20} />
                </button>

                <button
                    className={`${styles.vcBtn} ${styles.leave}`}
                    onClick={onDisconnect}
                    title="Покинуть канал"
                >
                    <Icon name="phone-off" size={18} />
                    Отключиться
                </button>
            </div>
        </div>
    )
}
