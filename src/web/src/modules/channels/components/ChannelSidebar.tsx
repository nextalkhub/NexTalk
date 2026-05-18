import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CreateChannelModal } from './CreateChannelModal'
import { Icon } from '../../../shared/components/Icon/Icon'
import styles from './ChannelSidebar.module.scss'
import { useAppDispatch, useAppSelector } from '../../../store'
import {
    fetchChannels,
    setCurrentChannel
} from '../../../shared/slices/channelSlice'
import { Channel } from "../../../shared/types"

export const ChannelSidebar: React.FC = () => {
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const { serverId, channelId } = useParams()

    const channels = useAppSelector(state => state.channels.channels)

    const [isModalOpen, setIsModalOpen] = useState(false)

    const textChannels = channels.filter(c => c.type === 'text')
    const voiceChannels = channels.filter(c => c.type === 'voice')

    const handleChannelClick = (channel: Channel) => {
        dispatch(setCurrentChannel(channel.id))

        if (channel.type === 'text') {
            navigate(`/servers/${serverId}/channels/${channel.id}`)
        } else {
            navigate(`/servers/${serverId}/voice/${channel.id}`)
        }
    }

    const handleModalSuccess = () => {
        if (serverId) {
            dispatch(fetchChannels(serverId))
        }
    }

    const handleBackToServers = () => {
        navigate('/servers')
    }

    return (
        <>
            <div className={styles.sidebar}>
                {/* Кнопка назад */}
                <div className={styles.backButton} onClick={handleBackToServers}>
                    <Icon name="arrow-left" size={18} />
                    <span>Все серверы</span>
                </div>

                <div className={styles.serverHeader}>
                    <span className={styles.serverTitle}>
                        Каналы
                    </span>
                    <span
                        className={styles.addChannel}
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Icon name="plus" size={14} />
                        <span>Добавить канал</span>
                    </span>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionTitle}>Текстовые каналы</div>

                    {textChannels.map(channel => (
                        <div
                            key={channel.id}
                            onClick={() => handleChannelClick(channel)}
                            className={`${styles.channel} ${channelId === channel.id ? styles.active : ''}`}
                        >
                            <Icon name="hash" size={16} />
                            <span>{channel.name}</span>
                        </div>
                    ))}
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionTitle}>Голосовые каналы</div>

                    {voiceChannels.map(channel => (
                        <div
                            key={channel.id}
                            onClick={() => handleChannelClick(channel)}
                            className={`${styles.channel} ${channelId === channel.id ? styles.active : ''}`}
                        >
                            <Icon name="voice" size={16} />
                            <span>{channel.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <CreateChannelModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
            />
        </>
    )
}