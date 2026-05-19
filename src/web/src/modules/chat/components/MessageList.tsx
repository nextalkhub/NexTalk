import React, { useRef, useEffect } from 'react'
import { Message } from './Message'
import { Icon } from '../../../shared/components/Icon/Icon'
import styles from './MessageList.module.scss'
import {MessageInterface} from "../../../shared/slices/chatSlice.ts";

interface MessageListProps {
    messages: MessageInterface[]
    currentUserId?: string
}

export const MessageList: React.FC<MessageListProps> = ({
                                                            messages,
                                                            currentUserId
                                                        }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth'
        })
    }, [messages])

    const sortedMessages = [...messages].sort(
        (a, b) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
    )

    if (!messages.length) {
        return (
            <div className={styles.empty}>
                <div className={styles.emptyIcon}>
                    <Icon name="message" size={48}/>
                </div>

                <div className={styles.emptyTitle}>
                    Нет сообщений
                </div>

                <div className={styles.emptyText}>
                    Напишите первое сообщение
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            {sortedMessages.map((message) => (
                        <Message
                            key={message.id}
                            message={message}
                            isOwn={
                                message.authorId ===
                                currentUserId
                            }
                        />
                    ))
            }
            <div ref={messagesEndRef}/>
        </div>
    )
}