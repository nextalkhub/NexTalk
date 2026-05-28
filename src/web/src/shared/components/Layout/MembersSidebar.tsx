import React, { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Avatar } from '../Avatar/Avatar'
import { useAppDispatch, useAppSelector } from '../../../store'
import { fetchMembers } from '../../slices/memberSlice'
import { selectIsUserOnline } from '../../slices/presenceSlice'
import { pluralOnline } from '../../utils/format'
import type { Member } from '../../types'

interface GroupSpec {
  key: string
  label: string
  members: Member[]
  dim?: boolean
}

export const MembersSidebar: React.FC = () => {
  const { serverId } = useParams()
  const dispatch = useAppDispatch()
  const members = useAppSelector(
    state => state.members.members[serverId ?? ''] ?? []
  )
  const onlineSet = useAppSelector(state => state.presence.online)

  useEffect(() => {
    if (serverId && serverId !== 'undefined') dispatch(fetchMembers(serverId))
  }, [serverId, dispatch])

  const groups = useMemo<GroupSpec[]>(() => {
    const online = (m: Member) => !!onlineSet[m.userId]

    // Roles take precedence — Owner/Admin always grouped first, regardless
    // of online status. Then the bulk Member online group, then everyone
    // else as offline.
    const owners      = members.filter(m => m.role === 'Owner')
    const admins      = members.filter(m => m.role === 'Admin')
    const memberOnline  = members.filter(m => m.role === 'Member' &&  online(m))
    const memberOffline = members.filter(m => m.role === 'Member' && !online(m))

    return [
      { key: 'owner',         label: 'ВЛАДЕЛЕЦ',        members: owners },
      { key: 'admin',         label: 'АДМИНИСТРАТОРЫ',  members: admins },
      { key: 'online',        label: 'В СЕТИ',          members: memberOnline },
      { key: 'offline',       label: 'НЕ В СЕТИ',       members: memberOffline, dim: true },
    ]
  }, [members, onlineSet])

  const onlineCount = members.filter(m => !!onlineSet[m.userId]).length

  return (
    <aside className="right">
      <div className="members-summary">
        <span className="members-summary-h mono">УЧАСТНИКИ</span>
        <span className="members-summary-count">
          <span className="dot online" /> {pluralOnline(onlineCount)} из {members.length}
        </span>
      </div>
      <div className="right-body">
        {members.length === 0 ? (
          <div className="empty-table-state" style={{ padding: '40px 16px' }}>
            <div className="h">Здесь пока никого нет</div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>Пригласите участников по ссылке.</div>
          </div>
        ) : (
          <div className="members-list">
            {groups.map(group => (
              <MemberGroup
                key={group.key}
                label={group.label}
                members={group.members}
                dim={group.dim}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

interface GroupProps {
  label: string
  members: Member[]
  dim?: boolean
}

const MemberGroup: React.FC<GroupProps> = ({ label, members, dim }) => {
  if (!members.length) return null
  return (
    <>
      <div className="members-section-h">
        <span>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>{members.length}</span>
      </div>
      {members.map(m => (
        <MemberRow key={m.userId} member={m} forceOffline={!!dim} />
      ))}
    </>
  )
}

const MemberRow: React.FC<{ member: Member; forceOffline?: boolean }> = ({ member, forceOffline }) => {
  const isOnlineFromPresence = useAppSelector(selectIsUserOnline(member.userId))
  const isOnline = forceOffline ? false : isOnlineFromPresence
  return (
    <div className={`member-row ${isOnline ? 'online' : 'offline'}`}>
      <div className="av-wrap">
        <Avatar str={member.displayName || member.userId} size={28} />
      </div>
      <div className="info">
        <span className="nm">
          {member.displayName}
          {member.role !== 'Member' && (
            <span className="role-tag">{member.role.toUpperCase()}</span>
          )}
        </span>
      </div>
    </div>
  )
}
