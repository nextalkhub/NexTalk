import React, { useState, useRef, useEffect } from 'react'
import { Icon } from '../../../shared/components/Icon/Icon'
import { MessageInterface } from '../../../shared/slices/chatSlice'
import styles from './MessageInput.module.scss'

interface MessageInputProps {
    onSend: (text: string) => void
    placeholder?: string
    replyTo?: MessageInterface | null
    onCancelReply?: () => void
}

export const MessageInput: React.FC<MessageInputProps> = ({
    onSend,
    placeholder = 'Написать сообщение…',
    replyTo,
    onCancelReply,
}) => {
    const [value, setValue] = useState('')
    const taRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        const el = taRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = Math.min(200, el.scrollHeight) + 'px'
    }, [value])

    const handleSend = () => {
        if (!value.trim()) return
        onSend(value.trim())
        setValue('')
        if (taRef.current) taRef.current.style.height = 'auto'
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        } else if (e.key === 'Escape' && replyTo) {
            onCancelReply?.()
        }
    }

    return (
        <div className={styles.wrap}>
            <div className={styles.composer}>
                {/* FEATURE-GAP: 05 — reply-to / цитирование */}
                {replyTo && (
                    <div className={styles.replyBar}>
                        <Icon name="reply" size={13} />
                        <span>
                            Ответ <b>{replyTo.authorName.split(' ')[0]}</b>
                        </span>
                        <span className={styles.replyText}>{replyTo.content}</span>
                        <button className={styles.replyClose} onClick={onCancelReply}>
                            <Icon name="x" size={13} />
                        </button>
                    </div>
                )}

                <div className={styles.editor}>
                    {/* FEATURE-GAP: 09 — прикрепление файлов */}
                    <button className={styles.attachBtn} title="Прикрепить файл" disabled>
                        <Icon name="plus" size={16} />
                    </button>

                    <textarea
                        ref={taRef}
                        rows={1}
                        className={styles.textarea}
                        placeholder={placeholder}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />

                    <div className={styles.fmtBtns}>
                        {/* FEATURE-GAP: 11 — форматирование */}
                        <button className={styles.fmtBtn} title="Жирный (⌘B)" disabled>
                            <Icon name="bold" size={14} />
                        </button>
                        <button className={styles.fmtBtn} title="Код (⌘E)" disabled>
                            <Icon name="code" size={14} />
                        </button>
                        <button className={styles.fmtBtn} title="Упомянуть (@)" disabled>
                            <Icon name="at" size={14} />
                        </button>
                        <button className={styles.fmtBtn} title="Эмодзи" disabled>
                            <Icon name="emoji" size={14} />
                        </button>
                        <button
                            className={styles.sendBtn}
                            disabled={!value.trim()}
                            onClick={handleSend}
                            title="Отправить (⏎)"
                        >
                            <Icon name="send" size={15} />
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.foot}>
                <span>
                    <kbd>⏎</kbd> отправить · <kbd>⇧⏎</kbd> новая строка
                </span>
            </div>
        </div>
    )
}
