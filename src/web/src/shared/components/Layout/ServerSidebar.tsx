import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styles from './ServerSidebar.module.scss'
import {ServerIcon} from "../../../modules/servers/components/ServerIcon/ServerIcon.tsx";
import {useAppDispatch, useAppSelector} from "../../../store.ts";
import {selectServers, setCurrentServer} from "../../slices/serverSlice.ts";

const getServerType = (name: string): 'game' | 'dev' | 'music' | 'study' | 'friends' | 'default' => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('game') || lowerName.includes('night')) return 'game'
    if (lowerName.includes('dev') || lowerName.includes('team')) return 'dev'
    if (lowerName.includes('music') || lowerName.includes('song')) return 'music'
    if (lowerName.includes('study') || lowerName.includes('learn')) return 'study'
    if (lowerName.includes('friend')) return 'friends'
    return 'default'
}

export const ServerSidebar: React.FC = () => {
    const navigate = useNavigate()
    const servers = useAppSelector(selectServers)
    const dispatch = useAppDispatch()
    const { serverId } = useParams()

    const handleServerClick = (id: string) => {
        const server = servers.find(s => s.id === id)
        if (!server) return

        dispatch(setCurrentServer(server))
        navigate(`/servers/${id}/channels`)
    }

    return (
        <div className={styles.sidebar}>
            {servers.map((server) => (
                <ServerIcon
                    key={server.id}
                    type={getServerType(server.name)}
                    isActive={serverId === server.id}
                    onClick={() => handleServerClick(server.id)}
                />
            ))}

            <ServerIcon isAdd onClick={() => navigate('/create-server')} />
        </div>
    )
}