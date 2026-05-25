import React from 'react'
import { MessageInterface } from '../../../shared/slices/chatSlice'
import { Icon } from '../../../shared/components/Icon/Icon'
import { avatarBg, avatarHue, nameInitials } from '../../../shared/utils/avatar'
import styles from './Message.module.scss'

interface MessageProps {
    message: MessageInterface
    isFirst: boolean
    currentUserId?: string
    onReply?: (msg: MessageInterface) => void
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export const Message: React.FC<MessageProps> = ({ message, isFirst, currentUserId, onReply }) => {
    const isOwn = message.authorId === currentUserId
    const hue = avatarHue(message.authorId)
    const initials = nameInitials(message.authorName)

    return (
        <div className={`${styles.msg} ${isFirst ? styles.isFirst : ''} ${isOwn ? styles.isOwn : ''}`}>
            <div className={styles.gutter}>
                {isFirst ? (
                    <span
                        className={styles.avatar}
                        style={{ background: avatarBg(hue) }}
                    >
                        {initials || '?'}
                    </span>
                ) : (
                    <span className={styles.timeHover}>{formatTime(message.createdAt)}</span>
                )}
            </div>

            <div className={styles.body}>
                {isFirst && (
                    <div className={styles.head}>
                        <span className={`${styles.author} ${isOwn ? styles.authorOwn : ''}`}>
                            {message.authorName.split(' ')[0]}
                        </span>
                        <span className={styles.stamp}>сегодня в {formatTime(message.createdAt)}</span>
                    </div>
                )}
                <div className={styles.text}>{message.content}</div>
            </div>

            <div className={styles.actions}>
                {/* FEATURE-GAP: 01 — реакции */}
                <button className={styles.actionBtn} title="Реакция" disabled>
                    <Icon name="emoji" size={14} />
                </button>
                <button
                    className={styles.actionBtn}
                    title="Ответить"
                    onClick={() => onReply?.(message)}
                >
                    <Icon name="reply" size={14} />
                </button>
                {/* FEATURE-GAP: 03 — треды */}
                <button className={styles.actionBtn} title="Тред" disabled>
                    <Icon name="thread" size={14} />
                </button>
                {/* FEATURE-GAP: 06 — закреп */}
                <button className={styles.actionBtn} title="Закрепить" disabled>
                    <Icon name="pin" size={14} />
                </button>
                {/* FEATURE-GAP: 04 — редактирование */}
                <button className={styles.actionBtn} title="Изменить" disabled>
                    <Icon name="pencil" size={14} />
                </button>
                <button className={styles.actionBtn} title="Ещё">
                    <Icon name="more" size={14} />
                </button>
                {/* FEATURE-GAP: 14 — удаление */}
                <button className={`${styles.actionBtn} ${styles.danger}`} title="Удалить" disabled>
                    <Icon name="trash" size={14} />
                </button>
            </div>
        </div>
    )
}
