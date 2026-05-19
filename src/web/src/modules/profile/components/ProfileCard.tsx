import React from 'react'
import styles from './ProfileCard.module.scss'
import {Icon} from "../../../shared/components/Icon/Icon.tsx";

interface User {
    id: string
    name: string
    nickname: string
    createdAt: string
    serversCount: number
}

interface ProfileCardProps {
    user: User
    onEdit?: () => void
    onLogout?: () => void
    onClose?: () => void
    showActions?: boolean
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
                                                            user,
                                                            onLogout,
                                                            onClose,
                                                            showActions = true,
                                                        }) => {
    return (
        <div className={styles.card}>
            {onClose && (
                <button onClick={onClose} className={styles.closeBtn}>
                    <Icon name="arrow-left" size={18} />
                </button>
            )}

            <div className={styles.avatar}>
                {user.name?.charAt(0).toUpperCase()}
            </div>

            <div className={styles.username}>{user.name}</div>
            <div className={styles.email}>@{user.nickname}</div>

            <div className={styles.details}>
                <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Аккаунт создан</span>
                    <span className={styles.detailValue}>
                        {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString('ru-RU')
                            : '20 апреля 2026'}
                    </span>
                </div>
                <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Серверов</span>
                    <span className={styles.detailValue}>{user.serversCount}</span>
                </div>
                <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Статус</span>
                    <span className={`${styles.detailValue} ${styles['online']}`}>
                        Онлайн
                    </span>
                </div>
            </div>

            {showActions && (
                <div className={styles.actions}>
                    {onLogout && (
                        <button onClick={onLogout} className={styles.logoutBtn}>
                            <Icon name="logout" size={16} />
                            Выйти
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}