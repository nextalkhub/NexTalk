import React from 'react'
import styles from './AuthCard.module.scss'
import { Icon } from '../../../shared/components/Icon/Icon'

interface AuthCardProps {
    onLogin: () => void
    onRegister: () => void
    isLoading?: boolean
    error?: string
}

export const AuthCard: React.FC<AuthCardProps> = ({
                                                      onLogin,
                                                      onRegister,
                                                      isLoading = false,
                                                      error,
                                                   }) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onLogin()
    }

    return (
        <div className={styles.overlay}>
            <div className={styles.card}>
                <div className={styles.logo}>
                    <span className={styles.logoIcon}>N</span>
                    <span className={styles.logoText}>NexTalk</span>
                </div>

                <h1 className={styles.title}>Добро пожаловать</h1>
                <p className={styles.subtitle}>Войдите в свой аккаунт, чтобы продолжить</p>

                {error && (
                    <div className={styles.errorMessage}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <button
                        type="submit"
                        className={`${styles.submitBtn} ${isLoading ? styles.submitBtnDisabled : ''}`}
                        disabled={isLoading}
                    >
                        <Icon name="login" size={18} />
                        {isLoading ? 'Загрузка...' : 'Войти'}
                    </button>
                </form>

                <div className={styles.footer}>
                    <button
                        onClick={()=>onRegister()}
                        className={styles.toggleBtn}
                        disabled={isLoading}
                    >
                        <span>Нет аккаунта? <span>Зарегистрироваться</span></span>
                    </button>
                </div>
            </div>
        </div>
    )
}