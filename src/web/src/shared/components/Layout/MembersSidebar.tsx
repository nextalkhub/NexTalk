import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../store'
import { fetchMembers } from '../../slices/memberSlice'
import { Member } from '../../types'
import { avatarBg, avatarHue, nameInitials } from '../../utils/avatar'
import styles from './MembersSidebar.module.scss'

type PresenceStatus = 'online' | 'idle' | 'dnd' | 'offline'

interface MemberWithStatus extends Member {
    status: PresenceStatus
}

interface Group {
    key: string
    label: string
    members: MemberWithStatus[]
}

export const MembersSidebar: React.FC = () => {
    const { serverId } = useParams()
    const dispatch = useAppDispatch()

    const members = useAppSelector(state => state.members.members[serverId ?? ''] ?? [])
    const onlineUserIds = useAppSelector(state => state.presence.onlineUserIds)

    useEffect(() => {
        if (serverId) dispatch(fetchMembers(serverId))
    }, [serverId, dispatch])

    const withStatus: MemberWithStatus[] = members.map(m => ({
        ...m,
        status: (onlineUserIds.includes(m.userId) ? 'online' : 'offline') as PresenceStatus,
    }))

    const groups: Group[] = [
        {
            key: 'Owner',
            label: 'владелец',
            members: withStatus.filter(m => m.role === 'Owner'),
        },
        {
            key: 'Admin',
            label: 'админы',
            members: withStatus.filter(m => m.role === 'Admin'),
        },
        {
            key: 'Member',
            label: 'участники в сети',
            members: withStatus.filter(m => m.role === 'Member' && m.status !== 'offline'),
        },
        {
            key: 'Offline',
            label: 'офлайн',
            members: withStatus.filter(m => m.role === 'Member' && m.status === 'offline'),
        },
    ]

    return (
        <div className={styles.list}>
            {groups.map(group =>
                group.members.length > 0 ? (
                    <React.Fragment key={group.key}>
                        <div className={styles.groupHeader}>
                            <span>{group.label}</span>
                            <span>{group.members.length}</span>
                        </div>
                        {group.members.map(m => {
                            const hue = avatarHue(m.userId)
                            const initials = nameInitials(m.displayName)
                            return (
                                <div
                                    key={m.userId}
                                    className={`${styles.memberRow} ${styles[m.status]}`}
                                >
                                    <div className={styles.avatarWrap}>
                                        <span
                                            className={styles.avatar}
                                            style={{ background: avatarBg(hue) }}
                                        >
                                            {initials || '?'}
                                        </span>
                                    </div>
                                    <div className={styles.info}>
                                        <div className={styles.name}>
                                            {m.displayName.split(' ')[0]}
                                            {m.role === 'Owner' && (
                                                <span className={`${styles.roleTag} ${styles.ownerTag}`}>OWN</span>
                                            )}
                                            {m.role === 'Admin' && (
                                                <span className={`${styles.roleTag} ${styles.adminTag}`}>ADM</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </React.Fragment>
                ) : null
            )}
        </div>
    )
}
