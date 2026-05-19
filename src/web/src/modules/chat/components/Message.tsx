import React from 'react'
import styles from './Message.module.scss'
import {MessageInterface} from "../../../shared/slices/chatSlice.ts";

interface MessageProps {
    message: MessageInterface
    isOwn: boolean
}

export const Message: React.FC<MessageProps> = ({
                                                    message,
                                                    isOwn = false
                                                }) => {

    const formatTime = (date: string) =>
        new Date(date).toLocaleTimeString(
            'ru-RU',
            {
                hour: '2-digit',
                minute: '2-digit'
            }
        )

    return (
        <div
            className={`${styles.message} ${
                isOwn ? styles.own : ''
            }`}
        >
            {!isOwn && (
                <div className={styles.avatar}>
                    {message.authorName?.[0]?.toUpperCase() ?? '?'}
                </div>
            )}

            <div className={styles.content}>
                {!isOwn && (
                    <div className={styles.header}>
                        <span className={styles.author}>
                            {message.authorName}
                        </span>

                        <span className={styles.time}>
                            {formatTime(
                                message.createdAt
                            )}
                        </span>
                    </div>
                )}

                <div className={styles.bubble}>
                    {message.content}

                    {isOwn && (
                        <span className={styles.timeOwn}>
                            {formatTime(
                                message.createdAt
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}