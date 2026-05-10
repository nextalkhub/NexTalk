import React, { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styles from './MembersSidebar.module.scss'
import { useAppDispatch, useAppSelector } from '../../../store'
import {fetchMembers} from "../../slices/memberSlice.ts";

export const MembersSidebar: React.FC = () => {
    const navigate = useNavigate()
    const { serverId } = useParams()
    const dispatch = useAppDispatch()

    const members = useAppSelector(
        state => state.members.members[serverId || ''] || []
    )

    useEffect(() => {
        if (serverId) {
            dispatch(fetchMembers(serverId))
        }
    }, [serverId, dispatch])

    return (
        <div className={styles.sidebar}>
            <div className={styles.title}>
                Участники — {members.length}
            </div>

            <div className={styles.list}>
                {members.map(member => (
                    <div
                        key={member.id}
                        onClick={() => navigate(`/servers/${serverId}/members`)}
                        className={styles.member}
                    >
                        <div className={styles.avatar}>
                            {member.avatar}
                        </div>

                        <div className={styles.name}>{member.name}</div>

                        {member.role && (
                            <div className={styles.role}>{member.role}</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}