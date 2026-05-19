import React, { useState } from 'react'
import { Icon } from '../../../shared/components/Icon/Icon'
import styles from './InviteJoinCard.module.scss'

interface Props {
    onJoin: (code: string) => void
    loading?: boolean
}

export const InviteJoinCard: React.FC<Props> = ({
                                                    onJoin,
                                                    loading = false,
                                                }) => {
    const [code, setCode] = useState('')
    const [error, setError] = useState('')
    const [isFocused, setIsFocused] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const trimmedCode = code.trim()

        if (!trimmedCode) {
            setError('Введите код приглашения')
            return
        }

        setError('')
        onJoin(trimmedCode)
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.title}>Присоединиться к серверу</div>
                    <div className={styles.subtitle}>
                        Введите код приглашения, чтобы присоединиться к существующему серверу
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={`${styles.inputWrapper} ${isFocused ? styles.focused : ''} ${error ? styles.error : ''}`}>
                        <Icon name="invite" size={18} />
                        <input
                            value={code}
                            onChange={(e) => {
                                setCode(e.target.value)
                                if (error) setError('')
                            }}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder="Введите код приглашения"
                            className={styles.input}
                            disabled={loading}
                            autoComplete="off"
                        />
                        {code && !loading && (
                            <button
                                type="button"
                                className={styles.clearButton}
                                onClick={() => setCode('')}
                            >
                                <Icon name="close" size={14} />
                            </button>
                        )}
                    </div>

                    {error && <div className={styles.errorMessage}>{error}</div>}

                    <button
                        type="submit"
                        className={styles.button}
                        disabled={loading || !code.trim()}
                    >
                        {loading ? (
                            <>
                                <span className={styles.spinner} />
                                Присоединение...
                            </>
                        ) : (
                            'Присоединиться'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}