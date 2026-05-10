import React, { useRef, useEffect } from 'react'
import { Message } from './Message'
import { Icon } from '../../../shared/components/Icon/Icon'
import styles from './MessageList.module.scss'
import {MessageInterface} from "../../../shared/slices/chatSlice.ts";

interface MessageListProps {
    messages: MessageInterface[]
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const groupMessagesByDate = () => {
        const groups: { date: string; messages: MessageInterface[] }[] = []

        messages.forEach((message) => {
            const date = new Date(message.createdAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
            })

            const lastGroup = groups[groups.length - 1]
            if (lastGroup && lastGroup.date === date) {
                lastGroup.messages.push(message)
            } else {
                groups.push({ date, messages: [message] })
            }
        })

        return groups
    }

    const groupedMessages = groupMessagesByDate()

    if (messages.length === 0) {
        return (
            <div className={styles.empty}>
                <div className={styles.emptyIcon}>
                    <Icon name="message" size={48} />
                </div>
                <div className={styles.emptyTitle}>Нет сообщений</div>
                <div className={styles.emptyText}>Напишите первое сообщение в этот канал</div>
            </div>
        )
    }

    return (
        <div ref={containerRef} className={styles.container}>
            {groupedMessages.map((group, groupIndex) => (
                <div key={groupIndex} className={styles.group}>
                    <div className={styles.dateDivider}>
                        <span>{group.date}</span>
                    </div>
                    {group.messages.map((message) => (
                        <Message key={message.id} message={message} />
                    ))}
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
    )
}