import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { handleAuthCallback } from '../../../shared/slices/authSlice.ts'
import { GradientBackground } from '../../../shared/components/GradientBackground/GradientBackground'
import styles from './OidcCallback.module.scss'
import {useAppDispatch} from "../../../store.ts";

export const OidcCallback: React.FC = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const dispatch = useAppDispatch()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const handleCallback = async () => {
            const params = new URLSearchParams(location.search)
            const code = params.get('code')
            const state = params.get('state')
            const errorParam = params.get('error')
            const errorDescription = params.get('error_description')

            if (errorParam) {
                setError(errorDescription || errorParam)
                return
            }

            if (!code || !state) {
                setError('Missing code or state parameter')
                return
            }

            try {
                // Используем Redux thunk
                await dispatch(handleAuthCallback({ code, state })).unwrap()

                // Редирект на главную или предыдущую страницу
                const returnUrl = sessionStorage.getItem('return_url') || '/servers'
                sessionStorage.removeItem('return_url')
                navigate(returnUrl)
            } catch (err) {
                console.error('OIDC callback error:', err)
                setError('Failed to authenticate')
            }
        }

        handleCallback()
    }, [location, dispatch, navigate])

    if (error) {
        return (
            <GradientBackground>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <h1 className={styles.title}>Ошибка авторизации</h1>
                        <p className={styles.error}>{error}</p>
                        <button onClick={() => navigate('/auth')} className={styles.button}>
                            Вернуться
                        </button>
                    </div>
                </div>
            </GradientBackground>
        )
    }

    return (
        <GradientBackground>
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.spinner} />
                    <h2 className={styles.title}>Вход в аккаунт...</h2>
                    <p className={styles.subtitle}>Пожалуйста, подождите</p>
                </div>
            </div>
        </GradientBackground>
    )
}