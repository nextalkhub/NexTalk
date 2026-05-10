import React from 'react'
import styles from './Message.module.scss'
import {MessageInterface} from "../../../shared/slices/chatSlice.ts";

interface MessageProps {
    message: MessageInterface
    showAvatar?: boolean
    showAuthor?: boolean
    isOwn?: boolean
}

export const Message: React.FC<MessageProps> = ({
                                                    message,
                                                    showAvatar = true,
                                                    showAuthor = true,
                                                    isOwn = false
                                                }) => {
    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className={`${styles.message} ${isOwn ? styles.own : ''}`}>
            {showAvatar ? (
                <div className={styles.avatar}>
                    {message.authorName?.charAt(0).toUpperCase() || '?'}
                </div>
            ) : (
                <div className={styles.avatarPlaceholder} />
            )}

            <div className={styles.content}>
                {showAuthor && (
                    <div className={styles.header}>
                        <span className={styles.author}>{message.authorName}</span>
                        <span className={styles.time}>{formatTime(message.createdAt)}</span>
                    </div>
                )}
                <div className={styles.text}>{message.content}</div>
            </div>
        </div>
    )
}