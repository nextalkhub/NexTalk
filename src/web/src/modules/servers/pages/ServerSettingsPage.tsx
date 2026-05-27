import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  IHash, ISpeaker, IPlus, ITrash, IUsers, ILink, IGear, IX, ICheck, IBoot, IHammer,
} from '../../../shared/components/Icons/Icons'
import { Avatar } from '../../../shared/components/Avatar/Avatar'
import { LayoutContext } from '../../../shared/components/Layout/AppShell'
import { useAppDispatch, useAppSelector } from '../../../store'
import { selectUser } from '../../../shared/slices/authSlice'
import { selectCurrentServer, removeServer } from '../../../shared/slices/serverSlice'
import { fetchMembers, kickMemberThunk, banMemberThunk } from '../../../shared/slices/memberSlice'
import { fetchChannels, createChannel, removeChannel } from '../../../shared/slices/channelSlice'
import {
  fetchBans, unbanThunk, fetchSettingsInvites, deleteInviteThunk, deleteGuildThunk, updateGuildThunk,
} from '../../../shared/slices/settingsSlice'
import { createInviteThunk } from '../../../shared/slices/inviteSlice'
import { updateMemberRole } from '../../../processes/guild/updateMemberRole'
import { deleteChannel } from '../../../processes/channels/deleteChannel'

type Tab = 'overview' | 'members' | 'channels' | 'invites' | 'bans'

export const ServerSettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const { serverId } = useParams<{ serverId: string }>()
  const dispatch = useAppDispatch()
  const { setHideRight } = useContext(LayoutContext)

  const user = useAppSelector(selectUser)
  const server = useAppSelector(selectCurrentServer)
  const members = useAppSelector(state => state.members.members[serverId ?? ''] ?? [])
  const channels = useAppSelector(state => state.channels.channels)
  const bans = useAppSelector(state => state.settings.bans[serverId ?? ''] ?? [])
  const invites = useAppSelector(state => state.settings.invites[serverId ?? ''] ?? [])
  const loading = useAppSelector(state => state.settings.loading)

  const [tab, setTab] = useState<Tab>('overview')
  const [serverName, setServerName] = useState(server?.name ?? '')
  const [nameSaved, setNameSaved] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [newChName, setNewChName] = useState('')
  const [newChType, setNewChType] = useState<'text' | 'voice'>('text')

  const isOwner = server?.ownerId === user?.id
  const currentUserRole = members.find(m => m.userId === user?.id)?.role ?? ''
  const isAdmin = currentUserRole === 'Admin'

  useEffect(() => {
    setHideRight(true)
    return () => setHideRight(false)
  }, [setHideRight])

  useEffect(() => {
    if (!serverId) return
    dispatch(fetchMembers(serverId))
    dispatch(fetchChannels(serverId))
  }, [serverId, dispatch])

  useEffect(() => {
    if (tab === 'bans' && serverId) dispatch(fetchBans(serverId))
    if (tab === 'invites' && serverId) dispatch(fetchSettingsInvites(serverId))
  }, [tab, serverId, dispatch])

  useEffect(() => {
    setServerName(server?.name ?? '')
  }, [server?.name])

  const handleSaveName = async () => {
    if (!serverId || !serverName.trim()) return
    try {
      await dispatch(updateGuildThunk({ guildId: serverId, name: serverName.trim() })).unwrap()
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2000)
    } catch {
      // ошибка уже в redux state
    }
  }

  const handleDeleteServer = async () => {
    if (!serverId || deleteConfirm !== server?.name) return
    try {
      await dispatch(deleteGuildThunk(serverId)).unwrap()
      dispatch(removeServer(serverId))
      navigate('/servers')
    } catch {
      // ошибка уже в redux state
    }
  }

  const handleKick = (userId: string) => {
    if (!serverId) return
    dispatch(kickMemberThunk({ serverId, memberId: userId }))
  }

  const handleBan = (userId: string) => {
    if (!serverId) return
    dispatch(banMemberThunk({ serverId, memberId: userId }))
  }

  const handleUnban = (userId: string) => {
    if (!serverId) return
    dispatch(unbanThunk({ guildId: serverId, userId }))
  }

  const handleRoleChange = async (userId: string, role: 'admin' | 'member') => {
    if (!serverId) return
    await updateMemberRole(serverId, userId, { role })
    dispatch(fetchMembers(serverId))
  }

  const handleDeleteChannel = async (channelId: string) => {
    if (!serverId) return
    await deleteChannel(serverId, channelId)
    dispatch(removeChannel(channelId))
  }

  const handleCreateChannel = async () => {
    if (!serverId || !newChName.trim()) return
    await dispatch(createChannel({ serverId, name: newChName.trim().toLowerCase().replace(/\s/g, '-'), type: newChType }))
    setNewChName('')
  }

  const handleDeleteInvite = (code: string) => {
    if (!serverId) return
    dispatch(deleteInviteThunk({ guildId: serverId, code }))
  }

  const handleCreateInvite = () => {
    if (!serverId) return
    dispatch(createInviteThunk({ guildId: serverId, data: { maxUses: 10, expiresIn: '7d', expiresInSeconds: 604800 } }))
      .then(() => dispatch(fetchSettingsInvites(serverId)))
  }

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Обзор', icon: <IGear /> },
    { id: 'members', label: 'Участники', icon: <IUsers /> },
    { id: 'channels', label: 'Каналы', icon: <IHash /> },
    { id: 'invites', label: 'Приглашения', icon: <ILink /> },
    { id: 'bans', label: 'Баны', icon: <IX /> },
  ]

  return (
    <>
      <header className="top" style={{ display: 'flex', alignItems: 'center', padding: '0 22px', gap: 16 }}>
        <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>
          Настройки · {server?.name}
        </div>
        <button className="icon-btn" title="Закрыть" onClick={() => navigate(`/servers/${serverId}/channels`)}>
          <IX />
        </button>
      </header>

      <main className="main">
        <div className="settings-layout">
          <nav className="settings-nav">
            <div className="settings-nav-h">СЕРВЕР</div>
            {navItems.map(item => (
              <button
                key={item.id}
                className={`settings-nav-item${tab === item.id ? ' is-active' : ''}`}
                onClick={() => setTab(item.id)}
              >
                {item.icon}
                {item.label}
                {item.id === 'members' && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>{members.length}</span>}
                {item.id === 'bans' && bans.length > 0 && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--live)' }}>{bans.length}</span>}
              </button>
            ))}
            {isOwner && (
              <>
                <div className="settings-nav-h" style={{ marginTop: 20 }}>ОПАСНАЯ ЗОНА</div>
                <button className="settings-nav-item is-danger" onClick={() => setTab('overview')}>
                  <ITrash />
                  Удалить сервер
                </button>
              </>
            )}
          </nav>

          <div className="settings-content">
            {tab === 'overview' && (
              <OverviewTab
                name={serverName}
                setName={setServerName}
                onSave={handleSaveName}
                saved={nameSaved}
                isOwner={isOwner}
                deleteConfirm={deleteConfirm}
                setDeleteConfirm={setDeleteConfirm}
                onDelete={handleDeleteServer}
                serverName={server?.name ?? ''}
              />
            )}
            {tab === 'members' && (
              <MembersTab
                members={members}
                currentUserId={user?.id ?? ''}
                isOwner={isOwner}
                isAdmin={isAdmin}
                onKick={handleKick}
                onBan={handleBan}
                onRoleChange={handleRoleChange}
              />
            )}
            {tab === 'channels' && (
              <ChannelsTab
                channels={channels}
                newName={newChName}
                setNewName={setNewChName}
                newType={newChType}
                setNewType={setNewChType}
                onCreate={handleCreateChannel}
                onDelete={handleDeleteChannel}
              />
            )}
            {tab === 'invites' && (
              <InvitesTab
                invites={invites}
                loading={loading}
                onCreate={handleCreateInvite}
                onDelete={handleDeleteInvite}
              />
            )}
            {tab === 'bans' && (
              <BansTab
                bans={bans}
                loading={loading}
                onUnban={handleUnban}
              />
            )}
          </div>
        </div>
      </main>
    </>
  )
}

// ─── Tab components ────────────────────────────────────────────────────────

interface OverviewTabProps {
  name: string
  setName: (v: string) => void
  onSave: () => void
  saved: boolean
  isOwner: boolean
  deleteConfirm: string
  setDeleteConfirm: (v: string) => void
  onDelete: () => void
  serverName: string
}

const OverviewTab: React.FC<OverviewTabProps> = ({ name, setName, onSave, saved, isOwner, deleteConfirm, setDeleteConfirm, onDelete, serverName }) => (
  <div>
    <div className="settings-section-head">
      <h1>Обзор</h1>
      <p>Основные параметры сервера.</p>
    </div>
    <div className="settings-field">
      <label className="settings-label">Название сервера</label>
      <input className="settings-input" value={name} onChange={e => setName(e.target.value)} />
    </div>
    <div className="settings-actions">
      <button className="btn-save" onClick={onSave} disabled={!name.trim()}>
        {saved ? <><ICheck /> Сохранено</> : 'Сохранить'}
      </button>
    </div>

    {isOwner && (
      <div className="danger-card" style={{ marginTop: 40 }}>
        <h3>Удалить сервер</h3>
        <p>Это действие необратимо. Все каналы, сообщения и участники будут удалены.</p>
        <div className="confirm-typing">
          <p>Введите <code>{serverName}</code> для подтверждения:</p>
          <input
            className="settings-input"
            value={deleteConfirm}
            onChange={e => setDeleteConfirm(e.target.value)}
            placeholder={serverName}
            style={{ marginTop: 8 }}
          />
        </div>
        <button
          className="btn-danger"
          style={{ marginTop: 16 }}
          disabled={deleteConfirm !== serverName}
          onClick={onDelete}
        >
          Удалить сервер навсегда
        </button>
      </div>
    )}
  </div>
)

interface MembersTabProps {
  members: { userId: string; displayName: string; role: string; username: string }[]
  currentUserId: string
  isOwner: boolean
  isAdmin: boolean
  onKick: (id: string) => void
  onBan: (id: string) => void
  onRoleChange: (id: string, role: 'admin' | 'member') => void
}

const MembersTab: React.FC<MembersTabProps> = ({ members, currentUserId, isOwner, isAdmin, onKick, onBan, onRoleChange }) => {
  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<string>('all')

  const filtered = members.filter(m => {
    const matchName = m.displayName.toLowerCase().includes(search.toLowerCase()) ||
      m.username.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || m.role.toLowerCase() === roleFilter
    return matchName && matchRole
  })

  return (
  <div>
    <div className="settings-section-head">
      <h1>Участники</h1>
      <p>{members.length} участников на сервере.</p>
    </div>

    <div className="list-toolbar" style={{ marginBottom: 16 }}>
      <div className="left" style={{ display: 'flex', gap: 8 }}>
        <input
          className="settings-input"
          style={{ width: 220, height: 36, padding: '0 12px', fontSize: 13 }}
          placeholder="Поиск по имени..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="settings-input"
          style={{ width: 130, height: 36, padding: '0 10px', fontSize: 13 }}
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="all">Все роли</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
        </select>
      </div>
    </div>

    <div className="data-table">
      <div className="dt-head dt-members">
        <span>Участник</span>
        <span>Роль</span>
        <span>Дата входа</span>
        <span />
      </div>
      {filtered.map(m => {
        const isSelf = m.userId === currentUserId
        const roleLower = m.role.toLowerCase() as 'owner' | 'admin' | 'member'
        const canManage = !isSelf && (
          (isOwner && m.role !== 'Owner') ||
          (isAdmin && m.role === 'Member')
        )
        return (
          <div key={m.userId} className="dt-row dt-members">
            <div className="nm-cell">
              <Avatar str={m.displayName || m.userId} size={32} />
              <div className="stack">
                <span className="nm">{m.displayName}</span>
                <span className="hn">@{m.username}</span>
              </div>
            </div>
            <div>
              {canManage ? (
                <select
                  className="role-select"
                  value={m.role.toLowerCase()}
                  onChange={e => onRoleChange(m.userId, e.target.value as 'admin' | 'member')}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              ) : (
                <span className={`role-pill ${roleLower}`}>
                  <span className="dot-r" />
                  {m.role}
                </span>
              )}
            </div>
            <div className="joined-cell">—</div>
            <div className="row-actions">
              {canManage && (
                <>
                  <button className="row-action-btn is-danger" title="Исключить" onClick={() => onKick(m.userId)}>
                    <IBoot />
                  </button>
                  <button className="row-action-btn is-danger" title="Забанить" onClick={() => onBan(m.userId)}>
                    <IHammer />
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })}
      {filtered.length === 0 && (
        <div className="empty-table-state">
          <div className="h">{search || roleFilter !== 'all' ? 'Никто не найден' : 'Нет участников'}</div>
        </div>
      )}
    </div>
  </div>
  )
}

interface ChannelsTabProps {
  channels: { id: string; name: string; type: 'text' | 'voice' }[]
  newName: string
  setNewName: (v: string) => void
  newType: 'text' | 'voice'
  setNewType: (v: 'text' | 'voice') => void
  onCreate: () => void
  onDelete: (id: string) => void
}

const ChannelsTab: React.FC<ChannelsTabProps> = ({ channels, newName, setNewName, newType, setNewType, onCreate, onDelete }) => (
  <div>
    <div className="settings-section-head">
      <h1>Каналы</h1>
      <p>{channels.length} каналов на сервере.</p>
    </div>

    <div className="list-toolbar" style={{ marginBottom: 16 }}>
      <div className="left">
        <input
          className="settings-input"
          style={{ width: 220, height: 36, padding: '0 12px', fontSize: 13 }}
          placeholder="Название нового канала"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onCreate()}
        />
        <select
          className="settings-input"
          style={{ width: 130, height: 36, padding: '0 10px', fontSize: 13 }}
          value={newType}
          onChange={e => setNewType(e.target.value as 'text' | 'voice')}
        >
          <option value="text">Текстовый</option>
          <option value="voice">Голосовой</option>
        </select>
      </div>
      <button className="btn-add" onClick={onCreate} disabled={!newName.trim()}>
        <IPlus />Создать
      </button>
    </div>

    <div className="data-table">
      <div className="dt-head dt-channels">
        <span>Канал</span>
        <span>Тип</span>
        <span>ID</span>
        <span />
      </div>
      {channels.map(ch => (
        <div key={ch.id} className="dt-row dt-channels">
          <div className="ch-cell">
            <div className="ch-ic">{ch.type === 'text' ? <IHash /> : <ISpeaker />}</div>
            <span className="nm">{ch.name}</span>
          </div>
          <div>
            <span className={`ch-type-pill${ch.type === 'voice' ? ' voice' : ''}`}>
              {ch.type === 'text' ? <IHash /> : <ISpeaker />}
              {ch.type}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ch.id}
          </div>
          <div className="row-actions">
            <button className="row-action-btn is-danger" title="Удалить" onClick={() => onDelete(ch.id)}>
              <ITrash />
            </button>
          </div>
        </div>
      ))}
      {channels.length === 0 && (
        <div className="empty-table-state">
          <div className="h">Нет каналов</div>
        </div>
      )}
    </div>
  </div>
)

interface InvitesTabProps {
  invites: { id: string; code: string; maxUses: number; userCount: number; expiresAt: string }[]
  loading: boolean
  onCreate: () => void
  onDelete: (code: string) => void
}

const InvitesTab: React.FC<InvitesTabProps> = ({ invites, loading, onCreate, onDelete }) => (
  <div>
    <div className="settings-section-head">
      <h1>Приглашения</h1>
      <p>Активные ссылки-приглашения для вступления на сервер.</p>
    </div>

    <div className="list-toolbar">
      <div className="left" />
      <button className="btn-add" onClick={onCreate} disabled={loading}>
        <IPlus />Создать приглашение
      </button>
    </div>

    <div className="data-table">
      <div className="dt-head dt-invites">
        <span>Код</span>
        <span>Создатель</span>
        <span>Использований</span>
        <span>Истекает</span>
        <span />
      </div>
      {invites.map(inv => (
        <div key={inv.id} className="dt-row dt-invites">
          <div className="invite-code-cell">
            <ILink />{inv.code}
            <button
              className="invite-code-copy"
              title="Скопировать"
              onClick={() => navigator.clipboard.writeText(inv.code)}
            >
              <ILink />
            </button>
          </div>
          <div style={{ color: 'var(--fg-1)', fontSize: 13 }}>—</div>
          <div className="uses-cell">
            {inv.userCount} / {inv.maxUses}
            <div className="uses-bar">
              <div className="uses-fill" style={{ width: `${Math.min(100, (inv.userCount / inv.maxUses) * 100)}%` }} />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)' }}>
            {new Date(inv.expiresAt).toLocaleDateString('ru-RU')}
          </div>
          <div className="row-actions">
            <button className="row-action-btn is-danger" title="Удалить" onClick={() => onDelete(inv.code)}>
              <ITrash />
            </button>
          </div>
        </div>
      ))}
      {invites.length === 0 && !loading && (
        <div className="empty-table-state">
          <div className="ic-blob"><ILink /></div>
          <div className="h">Нет активных приглашений</div>
          <div className="p">Создайте приглашение, чтобы пригласить участников.</div>
        </div>
      )}
    </div>
  </div>
)

interface BansTabProps {
  bans: { userId: string; bannedBy: string; reason: string | null; bannedAt: string }[]
  loading: boolean
  onUnban: (userId: string) => void
}

const BansTab: React.FC<BansTabProps> = ({ bans, loading, onUnban }) => (
  <div>
    <div className="settings-section-head">
      <h1>Баны</h1>
      <p>Заблокированные пользователи не могут вступить на сервер.</p>
    </div>

    <div className="data-table">
      <div className="dt-head dt-bans">
        <span>Пользователь</span>
        <span>Забанил</span>
        <span>Дата</span>
        <span />
      </div>
      {bans.map(ban => (
        <div key={ban.userId} className="dt-row dt-bans">
          <div className="nm-cell" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar str={ban.userId} size={32} />
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-0)' }}>{ban.userId}</div>
              {ban.reason && <div className="reason">{ban.reason}</div>}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)' }}>{ban.bannedBy}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)' }}>
            {new Date(ban.bannedAt).toLocaleDateString('ru-RU')}
          </div>
          <div className="row-actions">
            <button className="row-action-btn" title="Разбанить" onClick={() => onUnban(ban.userId)}>
              <ICheck />
            </button>
          </div>
        </div>
      ))}
      {bans.length === 0 && !loading && (
        <div className="empty-table-state">
          <div className="ic-blob"><IX /></div>
          <div className="h">Нет банов</div>
          <div className="p">Заблокированные пользователи появятся здесь.</div>
        </div>
      )}
    </div>
  </div>
)
