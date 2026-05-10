import React, {useEffect} from 'react'
import { useNavigate } from 'react-router-dom'
import { selectUser, logout } from '../../../shared/slices/authSlice.ts'
import { GradientBackground } from '../../../shared/components/GradientBackground/GradientBackground'
import { ProfileCard } from "../components/ProfileCard"
import styles from './ProfilePage.module.scss'
import {useAppDispatch, useAppSelector} from "../../../store.ts";
import {fetchServers, selectServers} from "../../../shared/slices/serverSlice.ts";

export const ProfilePage: React.FC = () => {
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const user = useAppSelector(selectUser)
    const servers = useAppSelector(selectServers)

    useEffect(() => {
        dispatch(fetchServers())
    }, [])

    const serversCount = servers.length

    const handleLogout = async () => {
        await dispatch(logout())
        navigate('/auth')
    }

    const handleEdit = () => {
        console.log('Edit profile')
    }

    return (
        <GradientBackground>
            <div className={styles.container}>
                <ProfileCard
                    user={{
                        id: user?.id || '1',
                        name: user?.name || 'User',
                        nickname: user?.nickname || 'user',
                        createdAt: user?.createdAt || Date.now().toString(),
                        serversCount: serversCount,
                    }}
                    onEdit={handleEdit}
                    onLogout={handleLogout}
                    onClose={() => navigate('/servers')}
                />
            </div>
        </GradientBackground>
    )
}