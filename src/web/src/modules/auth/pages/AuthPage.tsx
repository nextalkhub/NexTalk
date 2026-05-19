import React, {useEffect} from 'react'
import {login, selectIsLoading, selectAuthError, selectIsAuthenticated, register} from '../../../shared/slices/authSlice.ts'
import { GradientBackground } from '../../../shared/components/GradientBackground/GradientBackground'
import { AuthCard } from '../components/AuthCard'
import styles from './AuthPage.module.scss'
import {useAppDispatch, useAppSelector} from "../../../store.ts";
import {useNavigate} from "react-router-dom";

export const AuthPage: React.FC = () => {
    const dispatch = useAppDispatch()
    const isLoading = useAppSelector(selectIsLoading)
    const error = useAppSelector(selectAuthError)
    const navigate = useNavigate()
    const isAuthenticated = useAppSelector(selectIsAuthenticated)

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/servers')
        }
    }, [isAuthenticated, navigate])


    const handleLogin = async () => {
        try {
            await dispatch(login()).unwrap()

            if (import.meta.env.VITE_USE_AUTH_MOCK === 'true') {
                navigate('/servers')
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleRegister = async () => {
        if (import.meta.env.VITE_USE_AUTH_MOCK === 'true') {
            try {
                await dispatch(register()).unwrap()
                navigate('/servers')
            } catch (e) {
                console.error(e)
            }
            return
        }

        // OIDC
        const authUrl = new URL(import.meta.env.VITE_OIDC_AUTHORITY + '/oauth/v2/authorize')
        authUrl.searchParams.set('client_id', import.meta.env.VITE_OIDC_CLIENT_ID)
        authUrl.searchParams.set('redirect_uri', import.meta.env.VITE_OIDC_REDIRECT_URI)
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('scope', 'openid profile email offline_access')
        authUrl.searchParams.set('prompt', 'create')

        window.location.href = authUrl.toString()
    }

    return (
        <GradientBackground>
            <div className={styles.container}>
                <AuthCard
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                    isLoading={isLoading}
                    error={error || undefined}
                />
            </div>
        </GradientBackground>
    )
}