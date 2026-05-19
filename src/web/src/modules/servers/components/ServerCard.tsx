import React from 'react'
import styles from './ServerCard.module.scss'
import { Guild } from "../../../shared/types"
import { Icon } from '../../../shared/components/Icon/Icon'

interface ServerCardProps {
    server: Guild
    onClick: () => void
}

export const ServerCard: React.FC<ServerCardProps> = ({ server, onClick }) => {
    const firstLetter = server.name?.charAt(0).toUpperCase() || 'S'

    return (
        <div className={styles.card} onClick={onClick}>
            <div className={styles.iconContainer}>
                <div className={styles.serverIcon}>
                    {server.icon ? (
                        <img src={server.icon} alt={server.name} />
                    ) : (
                        <span className={styles.letter}>{firstLetter}</span>
                    )}
                </div>
            </div>

            <div className={styles.content}>
                <h3 className={styles.name}>{server.name}</h3>
                <div className={styles.stats}>
                    <div className={styles.stat}>
                        <span>Каналы</span>
                    </div>
                    <div className={styles.stat}>
                        <Icon name="user" size={12} />
                        <span>{server.memberCount || 0} участников</span>
                    </div>
                </div>
                {server.description && (
                    <p className={styles.description}>{server.description}</p>
                )}
            </div>

            <div className={styles.arrow}>
                <Icon name="arrow-right" size={16} />
            </div>
        </div>
    )
}