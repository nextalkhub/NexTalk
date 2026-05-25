import React from 'react'
import { Icon } from '../../../shared/components/Icon/Icon'
import { Channel } from '../../../shared/types'
import styles from './TopBar.module.scss'

type RightView = 'members' | 'thread' | 'pinned' | 'search' | 'inbox'

interface TopBarProps {
    channel: Channel | null
    rightView: RightView | null
    onRightView: (view: RightView) => void
}

export const TopBar: React.FC<TopBarProps> = ({ channel, rightView, onRightView }) => {
    return (
        <div className={styles.top}>
            <div className={styles.left}>
                <div className={styles.channelTitle}>
                    {channel?.type === 'voice'
                        ? <Icon name="speaker" size={20} className={styles.titleIcon} />
                        : <span className={styles.hash}>#</span>
                    }
                    <span className={styles.channelName}>{channel?.name ?? '—'}</span>
                </div>
                {/* topic: пусто — задел под FEATURE-GAP: 07 */}
            </div>

            <div className={styles.actions}>
                <div className={styles.search}>
                    <Icon name="search" size={13} />
                    <input placeholder="Поиск" readOnly />
                </div>

                <button
                    className={`${styles.iconBtn} ${rightView === 'thread' ? styles.active : ''}`}
                    onClick={() => onRightView('thread')}
                    title="Треды"
                >
                    <Icon name="thread" size={16} />
                </button>

                <button
                    className={`${styles.iconBtn} ${rightView === 'pinned' ? styles.active : ''}`}
                    onClick={() => onRightView('pinned')}
                    title="Закреплённое"
                >
                    <Icon name="pin" size={16} />
                </button>

                <button
                    className={`${styles.iconBtn} ${rightView === 'inbox' ? styles.active : ''}`}
                    onClick={() => onRightView('inbox')}
                    title="Входящие"
                >
                    <Icon name="inbox" size={16} />
                </button>

                <button
                    className={`${styles.iconBtn} ${rightView === 'members' ? styles.active : ''}`}
                    onClick={() => onRightView('members')}
                    title="Участники"
                >
                    <Icon name="users" size={16} />
                </button>
            </div>
        </div>
    )
}
