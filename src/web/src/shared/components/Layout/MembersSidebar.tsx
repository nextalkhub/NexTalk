import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Avatar } from '../Avatar/Avatar'
import { useAppDispatch, useAppSelector } from '../../../store'
import { fetchMembers } from '../../slices/memberSlice'
import { selectIsUserOnline } from '../../slices/presenceSlice'
import type { Member } from '../../types'

export const MembersSidebar: React.FC = () => {
  const { serverId } = useParams()
  const dispatch = useAppDispatch()
  const members = useAppSelector(
    state => state.members.members[serverId ?? ''] ?? []
  )

  useEffect(() => {
    if (serverId) dispatch(fetchMembers(serverId))
  }, [serverId, dispatch])

  const owners  = members.filter(m => m.role === 'Owner')
  const admins  = members.filter(m => m.role === 'Admin')
  const regular = members.filter(m => m.role === 'Member')

  return (
    <aside className="right">
      <div className="right-body">
        <div className="members-list">
          <MemberGroup label="OWNER" members={owners} />
          <MemberGroup label="ADMIN" members={admins} />
          <MemberGroup label={`УЧАСТНИКИ`} members={regular} />
        </div>
      </div>
    </aside>
  )
}

interface GroupProps {
  label: string
  members: Member[]
}

const MemberGroup: React.FC<GroupProps> = ({ label, members }) => {
  if (!members.length) return null
  return (
    <>
      <div className="members-section-h">
        {label} — {members.length}
      </div>
      {members.map(m => (
        <MemberRow key={m.userId} member={m} />
      ))}
    </>
  )
}

const MemberRow: React.FC<{ member: Member }> = ({ member }) => {
  const isOnline = useAppSelector(selectIsUserOnline(member.userId))
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
