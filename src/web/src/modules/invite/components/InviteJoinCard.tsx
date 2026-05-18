import React, { useState } from 'react'
import styles from './InviteJoinCard.module.scss'

interface Props {
    onJoin: (code: string) => void
    loading?: boolean
}

export const InviteJoinCard: React.FC<Props> = ({
                                                    onJoin,
                                                    loading,
                                                }) => {
    const [code, setCode] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!code.trim()) return

        onJoin(code.trim())
    }

    return (
        <form className={styles.card} onSubmit={handleSubmit}>
            <div className={styles.title}>
                Присоединиться к серверу
            </div>

            <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Введите код приглашения"
                className={styles.input}
            />

            <button
                type="submit"
                className={styles.button}
                disabled={loading}
            >
                {loading ? 'Вход...' : 'Вступить'}
            </button>
        </form>
    )
}