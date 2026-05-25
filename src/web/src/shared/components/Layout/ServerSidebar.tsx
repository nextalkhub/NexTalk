import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styles from './ServerSidebar.module.scss'
import { useAppDispatch, useAppSelector } from '../../../store'
import { selectServers, setCurrentServer } from '../../slices/serverSlice'
import { avatarBg, avatarHue } from '../../utils/avatar'
import { Icon } from '../Icon/Icon'

export const ServerSidebar: React.FC = () => {
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const { serverId } = useParams()
    const servers = useAppSelector(selectServers)

    const handleClick = (id: string) => {
        const server = servers.find(s => s.id === id)
        if (!server) return
        dispatch(setCurrentServer(server))
        navigate(`/servers/${id}/channels`)
    }

    return (
        <div className={styles.rail}>
            <div className={styles.inner}>
                {servers.map((server, i) => {
                    const isActive = serverId === server.id
                    const hue = avatarHue(server.id)
                    return (
                        <React.Fragment key={server.id}>
                            <button
                                className={`${styles.icon} ${isActive ? styles.active : ''}`}
                                onClick={() => handleClick(server.id)}
                                title={server.name}
                                style={isActive ? { background: avatarBg(hue) } : undefined}
                            >
                                {server.name[0]?.toUpperCase()}
                            </button>
                            {i === 0 && servers.length > 1 && <div className={styles.sep} />}
                        </React.Fragment>
                    )
                })}
                {servers.length > 0 && <div className={styles.sep} />}
                <button
                    className={`${styles.icon} ${styles.ghost}`}
                    title="Создать сервер"
                    onClick={() => navigate('/create-server')}
                >
                    <Icon name="plus" size={18} />
                </button>
            </div>
        </div>
    )
}
