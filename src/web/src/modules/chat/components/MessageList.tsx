import React, { useRef, useEffect } from 'react'
import { Message } from './Message'
import { Icon } from '../../../shared/components/Icon/Icon'
import { MessageInterface } from '../../../shared/slices/chatSlice'
import styles from './MessageList.module.scss'

interface MessageListProps {
    messages: MessageInterface[]
    currentUserId?: string
    onReply?: (msg: MessageInterface) => void
}

function todayLabel(): string {
    return new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const MessageList: React.FC<MessageListProps> = ({ messages, currentUserId, onReply }) => {
    const endRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages.length])

    const sorted = [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    if (sorted.length === 0) {
        return (
            <div className={styles.empty}>
                <Icon name="message" size={48} className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>Начало истории</p>
                <p className={styles.emptyText}>Будьте первым — напишите сообщение!</p>
            </div>
        )
    }

    return (
        <div className={styles.scroll}>
            <div className={styles.inner}>
                <div className={styles.dayDivider}>
                    <div className={styles.divLine} />
                    <div className={styles.divLabel}>{todayLabel()}</div>
                    <div className={styles.divLine} />
                </div>

                {sorted.map((msg, i) => (
                    <Message
                        key={msg.id}
                        message={msg}
                        isFirst={i === 0 || sorted[i - 1].authorId !== msg.authorId}
                        currentUserId={currentUserId}
                        onReply={onReply}
                    />
                ))}

                {/* FEATURE-GAP: 08 — typing indicator */}
                <div className={styles.typingBar}>&nbsp;</div>

                <div ref={endRef} />
            </div>
        </div>
    )
}
