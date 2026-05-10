import React, {useEffect} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GradientBackground } from '../../../shared/components/GradientBackground/GradientBackground'
import { Icon } from '../../../shared/components/Icon/Icon'
import styles from './MembersPage.module.scss'
import {Member} from "../../../shared/types";
import {banMemberThunk, fetchMembers, kickMemberThunk} from "../../../shared/slices/memberSlice.ts";
import {useAppDispatch, useAppSelector} from "../../../store.ts";


const getRoleLabel = (role: string) => {
  switch (role) {
    case 'owner': return 'ВЛАДЕЛЕЦ'
    case 'admin': return 'АДМИНИСТРАТОР'
    default: return 'УЧАСТНИК'
  }
}

export const MembersPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { serverId } = useParams()

  const members = useAppSelector(
      state => state.members.members[serverId || ''] || []
  )
  const loading = useAppSelector(state => state.members.loading)


  useEffect(() => {
      if (serverId) {
        dispatch(fetchMembers(serverId))
      }
  }, [serverId, dispatch])

  const handleKick = async (id: string, name: string) => {
    if (!window.confirm(`Исключить ${name}?`)) return
    if (!serverId) return

    dispatch(kickMemberThunk({
      serverId,
      memberId: id
    }))
  }

  const handleBan = async (id: string, name: string) => {
    if (!window.confirm(`Заблокировать ${name}?`)) return
    if (!serverId) return

    dispatch(banMemberThunk({
      serverId,
      memberId: id
    }))
  }

  const owners = members.filter(m => m.role === 'owner')
  const admins = members.filter(m => m.role === 'admin')
  const users = members.filter(m => m.role === 'member')


  if (loading) {
    return <div className={styles.container}>Загрузка...</div>
  }

  return (
      <GradientBackground>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.header}>
              <button
                  onClick={() => navigate(`/servers/${serverId}/channels`)}
                  className={styles.backBtn}
              >
                <Icon name="arrow-left" size={20} />
              </button>
              <div className={styles.title}>Участники</div>
            </div>

            <div className={styles.membersList}>
              <MemberGroup title="owner" members={owners} onKick={handleKick} onBan={handleBan} />
              <MemberGroup title="admin" members={admins} onKick={handleKick} onBan={handleBan} />
              <MemberGroup title="member" members={users} onKick={handleKick} onBan={handleBan} />
            </div>
          </div>
        </div>
      </GradientBackground>
  )
}

interface GroupProps {
  title: string
  members: Member[]
  onKick: (id: string, name: string) => void
  onBan: (id: string, name: string) => void
}

const MemberGroup: React.FC<GroupProps> = ({ title, members, onKick, onBan }) => {
  if (members.length === 0) return null

  return (
      <>
        <div className={styles.roleHeader}>
          {getRoleLabel(title)} — {members.length}
        </div>

        {members.map(member => (
            <MemberItem
                key={member.id}
                member={member}
                onKick={onKick}
                onBan={onBan}
            />
        ))}
      </>
  )
}

interface MemberItemProps {
  member: Member
  onKick: (id: string, name: string) => void
  onBan: (id: string, name: string) => void
}

const MemberItem: React.FC<MemberItemProps> = ({ member, onKick, onBan }) => {
  return (
      <div className={styles.memberItem}>
        <div className={styles.memberAvatar}>{member.avatar}</div>

        <div className={styles.memberInfo}>
          <div className={styles.memberName}>{member.name}</div>
          <div className={styles.memberTag}>{member.username}</div>
        </div>

        {/*<div className={`${styles.memberStatus} ${member.status === 'online' ? styles.online : styles.offline}`}>*/}
        {/*  {member.status === 'online' ? 'В сети' : 'Не в сети'}*/}
        {/*</div>*/}

        {member.role !== 'owner' && (
            <div className={styles.memberActions}>
              <button onClick={() => onKick(member.id, member.name)} className={styles.kickBtn}>
                Исключить
              </button>
              <button onClick={() => onBan(member.id, member.name)} className={styles.banBtn}>
                Заблокировать
              </button>
            </div>
        )}
      </div>
  )
}