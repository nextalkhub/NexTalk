import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchServers, selectServers, selectServersLoading, setCurrentServer } from '../../../shared/slices/serverSlice.ts'
import {selectIsAuthenticated, selectUser} from '../../../shared/slices/authSlice.ts'
import { ServerCard } from '../components/ServerCard'
import { GradientBackground } from '../../../shared/components/GradientBackground/GradientBackground'
import styles from './ServersPage.module.scss'
import {useAppDispatch, useAppSelector} from "../../../store.ts";

export const ServersPage: React.FC = () => {
    const navigate = useNavigate()
    const dispatch = useAppDispatch()

    const user = useAppSelector(selectUser)
    const servers = useAppSelector(selectServers)

    const isLoading = useAppSelector(selectServersLoading)

    const isAuthenticated = useAppSelector(selectIsAuthenticated)

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/auth')
        }
    }, [isAuthenticated, navigate])

    useEffect(() => {
        dispatch(fetchServers())
    }, [dispatch])

    const handleServerClick = (serverId: string) => {
        const server = servers.find(s => s.id === serverId)
        if (server) {
            dispatch(setCurrentServer(server))
            navigate(`/servers/${serverId}/channels`)
        }
    }

    const handleCreateServer = () => {
        navigate('/create-server')
    }

    const handleProfileClick = () => {
        navigate('/profile')
    }

    if (isLoading) {
        return (
            <GradientBackground>
                <div className={styles.container}>
                    <div className={styles.loading}>Загрузка серверов...</div>
                </div>
            </GradientBackground>
        )
    }

    return (
        <GradientBackground>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.welcome}>
                        Добро пожаловать, {user?.name || 'Гость'}!
                    </div>
                    <div className={styles.userMenu} onClick={handleProfileClick}>
                        <div className={styles.avatar}>
                            {user?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span>{user?.name || 'Профиль'}</span>
                    </div>
                </div>

                <div className={styles.grid}>
                    {servers.length > 0 && servers.map((server) => (
                        <ServerCard
                            key={server.id}
                            server={server}
                            onClick={() => handleServerClick(server.id)}
                        />
                    ))}

                    <div className={styles.createCard} onClick={handleCreateServer}>
                        <div className={styles.plus}>+</div>
                        <div>Создать сервер</div>
                        <div className={styles.subtext}>новое сообщество</div>
                    </div>
                </div>
            </div>
        </GradientBackground>
    )
}