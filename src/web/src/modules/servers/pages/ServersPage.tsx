import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchServers, selectServers, selectServersLoading, setCurrentServer } from '../../../shared/slices/serverSlice.ts'
import {selectIsAuthenticated, selectUser} from '../../../shared/slices/authSlice.ts'
import { ServerCard } from '../components/ServerCard'
import { GradientBackground } from '../../../shared/components/GradientBackground/GradientBackground'
import styles from './ServersPage.module.scss'
import {useAppDispatch, useAppSelector} from "../../../store.ts";
import {acceptInviteThunk} from "../../../shared/slices/inviteSlice.ts";
import {InviteJoinCard} from "../../invite/components/InviteJoinCard.tsx";
import {useSignalR} from "../../../shared/hooks/useSignalR.ts";

export const ServersPage: React.FC = () => {
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const { connection } = useSignalR()

    const user = useAppSelector(selectUser)
    const servers = useAppSelector(selectServers)

    const isLoading = useAppSelector(selectServersLoading)
    const inviteLoading = useAppSelector(state => state.invite.loading)

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

    const handleJoinServer = async (code: string) => {
        try {
            const { guildId } = await dispatch(
                acceptInviteThunk(code)
            ).unwrap()

            // Подписываемся на realtime-канал гильдии до fetchServers — иначе
            // member.joined и channel.created могут проскочить мимо.
            if (connection && guildId) {
                await connection.invoke('JoinGuildGroup', guildId).catch(() => {})
            }

            dispatch(fetchServers())
        } catch (e) {
            console.error(e)
        }
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

                <InviteJoinCard
                    onJoin={handleJoinServer}
                    loading={inviteLoading}
                />

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