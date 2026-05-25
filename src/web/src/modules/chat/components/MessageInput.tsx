import React, { useState } from 'react'
import { Button } from '../../../shared/components/Button/Button'
import styles from './MessageInput.module.scss'

interface MessageInputProps {
    onSend: (text: string) => void
    placeholder?: string
}

export const MessageInput: React.FC<MessageInputProps> = ({
                                                              onSend,
                                                              placeholder = 'Написать сообщение...'
                                                          }) => {
    const [value, setValue] = useState('')

    const handleSend = () => {
        if (!value.trim()) return
        onSend(value.trim())
        setValue('')
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className={styles.container}>
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className={styles.input}
            />
            <Button onClick={handleSend} size="small" disabled={!value.trim()}>
                Отправить
            </Button>
        </div>
    )
}