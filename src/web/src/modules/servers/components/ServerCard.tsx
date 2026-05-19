import React, { useState, useEffect } from 'react'
import styles from './ServerCard.module.scss'
import { Guild } from "../../../shared/types"
import { Icon } from '../../../shared/components/Icon/Icon'
import { getGuildMembers } from "../../../processes/guild/getGuildMembers.ts"

interface ServerCardProps {
    server: Guild
    onClick: () => void
}

export const ServerCard: React.FC<ServerCardProps> = ({ server, onClick }) => {
    const firstLetter = server.name?.charAt(0).toUpperCase() || 'S'
    const [membersCount, setMembersCount] = useState<number>(0)
    const [loading, setLoading] = useState<boolean>(true)

    useEffect(() => {
        const fetchMembersCount = async () => {
            try {
                setLoading(true)
                const members = await getGuildMembers(server.id)
                setMembersCount(members.length)
            } catch (error) {
                console.error('Ошибка получения участников:', error)
                setMembersCount(0)
            } finally {
                setLoading(false)
            }
        }

        fetchMembersCount()
    }, [server.id])

    return (
        <div className={styles.card} onClick={onClick}>
            <div className={styles.iconContainer}>
                <div className={styles.serverIcon}>
                    <span className={styles.letter}>{firstLetter}</span>
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
                        <span>{loading ? '...' : `${membersCount} участников`}</span>
                    </div>
                </div>
            </div>

            <div className={styles.arrow}>
                <Icon name="arrow-right" size={16} />
            </div>
        </div>
    )
}