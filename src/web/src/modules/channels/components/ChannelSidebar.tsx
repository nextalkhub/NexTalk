import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CreateChannelModal } from './CreateChannelModal'
import { Icon } from '../../../shared/components/Icon/Icon'
import styles from './ChannelSidebar.module.scss'
import { useAppDispatch, useAppSelector } from '../../../store'
import { fetchChannels, setCurrentChannel } from '../../../shared/slices/channelSlice'
import { Channel } from '../../../shared/types'
import { selectUser } from '../../../shared/slices/authSlice'
import { avatarBg, avatarHue, nameInitials } from '../../../shared/utils/avatar'

export const ChannelSidebar: React.FC = () => {
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const { serverId, channelId } = useParams()

    const channels = useAppSelector(state => state.channels.channels)
    const channelParticipants = useAppSelector(state => state.voice.channelParticipants)
    const currentServer = useAppSelector(state =>
        state.servers.servers.find(s => s.id === serverId) ?? null
    )
    const members = useAppSelector(state => state.members.members[serverId ?? ''] ?? [])
    const onlineUserIds = useAppSelector(state => state.presence.onlineUserIds)
    const user = useAppSelector(selectUser)

    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
    const [modalOpen, setModalOpen] = useState(false)

    const toggle = (key: string) =>
        setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

    const textChannels = channels.filter(c => c.type === 'text')
    const voiceChannels = channels.filter(c => c.type === 'voice')

    const onlineCount = members.filter(m => onlineUserIds.includes(m.userId)).length

    const handleChannelClick = (channel: Channel) => {
        dispatch(setCurrentChannel(channel.id))
        if (channel.type === 'text') {
            navigate(`/servers/${serverId}/channels/${channel.id}`)
        } else {
            navigate(`/servers/${serverId}/voice/${channel.id}`)
        }
    }

    const handleModalSuccess = () => {
        if (serverId) dispatch(fetchChannels(serverId))
        setModalOpen(false)
    }

    const userHue = user ? avatarHue(user.id) : 200
    const userInitials = user ? nameInitials(user.name) : '?'

    return (
        <>
            <div className={styles.side}>
                <div className={styles.banner}>
                    <div className={styles.guildInfo}>
                        <div className={styles.guildName}>{currentServer?.name ?? '—'}</div>
                        <div className={styles.guildMeta}>
                            <span className={styles.onlineDot} />
                            {onlineCount} онлайн · {members.length} участников
                        </div>
                    </div>
                </div>

                <div className={styles.searchWrap}>
                    <div className={styles.searchInput}>
                        <Icon name="search" size={13} />
                        <span>Поиск по каналам</span>
                        <kbd>⌘K</kbd>
                    </div>
                </div>

                <div className={styles.list}>
                    <div className={`${styles.section} ${collapsed.text ? styles.collapsed : ''}`}>
                        <div className={styles.sectionHeader} onClick={() => toggle('text')}>
                            <span>
                                <span className={styles.chev}>
                                    <Icon name="chevron-down" size={10} />
                                </span>
                                текстовые
                            </span>
                            <button
                                className={styles.addBtn}
                                title="Создать канал"
                                onClick={e => { e.stopPropagation(); setModalOpen(true) }}
                            >
                                <Icon name="plus" size={12} />
                            </button>
                        </div>
                        <div className={styles.rows}>
                            {textChannels.map(c => (
                                <button
                                    key={c.id}
                                    className={`${styles.row} ${channelId === c.id ? styles.active : ''}`}
                                    onClick={() => handleChannelClick(c)}
                                >
                                    <span className={styles.hash}>#</span>
                                    <span className={styles.rowName}>{c.name}</span>
                                    <span className={styles.rowActions}>
                                        <button
                                            title="Заглушить"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <Icon name="bell" size={12} />
                                        </button>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={`${styles.section} ${collapsed.voice ? styles.collapsed : ''}`}>
                        <div className={styles.sectionHeader} onClick={() => toggle('voice')}>
                            <span>
                                <span className={styles.chev}>
                                    <Icon name="chevron-down" size={10} />
                                </span>
                                голосовые
                            </span>
                            <button
                                className={styles.addBtn}
                                title="Создать голосовой канал"
                                onClick={e => { e.stopPropagation(); setModalOpen(true) }}
                            >
                                <Icon name="plus" size={12} />
                            </button>
                        </div>
                        <div className={styles.rows}>
                            {voiceChannels.map(c => {
                                const participantIds = channelParticipants[c.id] ?? []
                                const count = participantIds.length
                                const participants = participantIds
                                    .map(uid => members.find(m => m.userId === uid))
                                    .filter((m): m is NonNullable<typeof m> => Boolean(m))

                                return (
                                    <React.Fragment key={c.id}>
                                        <button
                                            className={`${styles.row} ${channelId === c.id ? styles.active : ''}`}
                                            onClick={() => handleChannelClick(c)}
                                        >
                                            <span className={styles.voiceIcon}>
                                                <Icon name="speaker" size={14} />
                                            </span>
                                            <span className={styles.rowName}>{c.name}</span>
                                            {count > 0 && (
                                                <span className={styles.countPill}>{count}</span>
                                            )}
                                        </button>
                                        {participants.length > 0 && (
                                            <div className={styles.voiceNested}>
                                                {participants.map(m => (
                                                    <div key={m.userId} className={styles.voiceUserRow}>
                                                        <span
                                                            className={styles.voiceAvatar}
                                                            style={{ background: avatarBg(avatarHue(m.userId)) }}
                                                        >
                                                            {nameInitials(m.displayName)[0] ?? '?'}
                                                        </span>
                                                        <span className={styles.voiceUserName}>
                                                            {m.displayName.split(' ')[0]}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {user && (
                    <div className={styles.selfStatus}>
                        <span
                            className={styles.selfAvatar}
                            style={{ background: avatarBg(userHue) }}
                        >
                            {userInitials}
                            <span className={styles.selfDot} />
                        </span>
                        <div className={styles.selfText}>
                            <div className={styles.selfName}>{user.name}</div>
                            <div className={styles.selfSub}>@{user.nickname}</div>
                        </div>
                        <div className={styles.selfActions}>
                            <button className={styles.iconBtn} title="Микрофон">
                                <Icon name="mic" size={14} />
                            </button>
                            <button className={styles.iconBtn} title="Наушники">
                                <Icon name="headphones" size={14} />
                            </button>
                            <button className={styles.iconBtn} title="Настройки">
                                <Icon name="gear" size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <CreateChannelModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={handleModalSuccess}
            />
        </>
    )
}
