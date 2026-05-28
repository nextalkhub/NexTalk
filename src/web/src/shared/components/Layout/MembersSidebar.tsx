import React, { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Avatar } from '../Avatar/Avatar'
import { IMicOff, IHeadset } from '../Icons/Icons'
import { useAppDispatch, useAppSelector } from '../../../store'
import { fetchMembers } from '../../slices/memberSlice'
import { selectIsUserOnline } from '../../slices/presenceSlice'
import { pluralOnline } from '../../utils/format'
import { useVoiceContext } from '../../contexts/VoiceContext'
import type { Member } from '../../types'

interface GroupSpec {
  key: string
  label: string
  members: Member[]
  dim?: boolean
}

interface VoiceInfo {
  inVoice: boolean
  isMuted: boolean
  isDeafened: boolean
}

export const MembersSidebar: React.FC = () => {
  const { serverId } = useParams()
  const dispatch = useAppDispatch()
  const members = useAppSelector(
    state => state.members.members[serverId ?? ''] ?? []
  )
  const onlineSet = useAppSelector(state => state.presence.online)
  const channelParticipants = useAppSelector(state => state.voice.channelParticipants)
  const currentUser = useAppSelector(state => state.auth.user)

  const {
    participants: voiceParticipants,
    isMuted: selfMuted,
    isDeafened: selfDeafened,
    activeChannelId,
  } = useVoiceContext()

  useEffect(() => {
    if (serverId && serverId !== 'undefined') dispatch(fetchMembers(serverId))
  }, [serverId, dispatch])

  // Build voice status map for all members
  const voiceMap = useMemo<Record<string, VoiceInfo>>(() => {
    const map: Record<string, VoiceInfo> = {}

    // Mark all users in any voice channel
    Object.values(channelParticipants).forEach(userIds => {
      userIds.forEach(uid => {
        map[uid] = { inVoice: true, isMuted: false, isDeafened: false }
      })
    })

    // Override with actual mute/deafen status from our LiveKit session
    voiceParticipants.forEach(p => {
      if (map[p.userId]) {
        map[p.userId] = { inVoice: true, isMuted: p.isMuted, isDeafened: p.isDeafened }
      }
    })

    // Self status
    if (currentUser?.id && activeChannelId && map[currentUser.id]) {
      map[currentUser.id] = { inVoice: true, isMuted: selfMuted, isDeafened: selfDeafened }
    }

    return map
  }, [channelParticipants, voiceParticipants, selfMuted, selfDeafened, activeChannelId, currentUser?.id])

  const groups = useMemo<GroupSpec[]>(() => {
    const online = (m: Member) => !!onlineSet[m.userId]

    const owners      = members.filter(m => m.role === 'Owner')
    const admins      = members.filter(m => m.role === 'Admin')
    const memberOnline  = members.filter(m => m.role === 'Member' &&  online(m))
    const memberOffline = members.filter(m => m.role === 'Member' && !online(m))

    return [
      { key: 'owner',   label: 'ВЛАДЕЛЕЦ',        members: owners },
      { key: 'admin',   label: 'АДМИНИСТРАТОРЫ',  members: admins },
      { key: 'online',  label: 'В СЕТИ',          members: memberOnline },
      { key: 'offline', label: 'НЕ В СЕТИ',       members: memberOffline, dim: true },
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
                voiceMap={voiceMap}
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
  voiceMap: Record<string, VoiceInfo>
}

const MemberGroup: React.FC<GroupProps> = ({ label, members, dim, voiceMap }) => {
  if (!members.length) return null
  return (
    <>
      <div className="members-section-h">
        <span>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>{members.length}</span>
      </div>
      {members.map(m => (
        <MemberRow key={m.userId} member={m} forceOffline={!!dim} voiceInfo={voiceMap[m.userId]} />
      ))}
    </>
  )
}

const MemberRow: React.FC<{ member: Member; forceOffline?: boolean; voiceInfo?: VoiceInfo }> = ({ member, forceOffline, voiceInfo }) => {
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
      {voiceInfo?.inVoice && (
        <div className="member-voice-icons">
          {voiceInfo.isMuted && (
            <span className="mvc muted" title="Микрофон выключен"><IMicOff /></span>
          )}
          {voiceInfo.isDeafened && (
            <span className="mvc deafened" title="Наушники выключены"><IHeadset /></span>
          )}
          {!voiceInfo.isMuted && !voiceInfo.isDeafened && (
            <span className="mvc active" title="В голосовом канале"><IHeadset /></span>
          )}
        </div>
      )}
    </div>
  )
}
