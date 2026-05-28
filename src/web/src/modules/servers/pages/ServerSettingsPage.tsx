import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  IHash, ISpeaker, IPlus, ITrash, IUsers, ILink, IGear, IX, ICheck,
  IBoot, IHammer, ICopy, IShield,
} from '../../../shared/components/Icons/Icons'
import { Avatar } from '../../../shared/components/Avatar/Avatar'
import { LayoutContext } from '../../../shared/components/Layout/AppShell'
import { ConfirmDialog } from '../../../shared/components/Modals/ConfirmDialog'
import { useAppDispatch, useAppSelector } from '../../../store'
import { selectUser } from '../../../shared/slices/authSlice'
import { selectCurrentServer, removeServer } from '../../../shared/slices/serverSlice'
import { fetchMembers, kickMemberThunk, banMemberThunk } from '../../../shared/slices/memberSlice'
import { fetchChannels, createChannel, removeChannel } from '../../../shared/slices/channelSlice'
import {
  fetchBans, unbanThunk, fetchSettingsInvites, deleteInviteThunk,
  deleteGuildThunk, updateGuildThunk,
} from '../../../shared/slices/settingsSlice'
import { createInviteThunk } from '../../../shared/slices/inviteSlice'
import { updateMemberRole } from '../../../processes/guild/updateMemberRole'
import { deleteChannel } from '../../../processes/channels/deleteChannel'
import { inviteUrl, timeAgo, pluralize } from '../../../shared/utils/format'
import type { Member } from '../../../shared/types'

type Tab = 'overview' | 'members' | 'channels' | 'invites' | 'bans' | 'danger'

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
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [kickTarget, setKickTarget] = useState<Member | null>(null)
  const [banTarget, setBanTarget] = useState<Member | null>(null)

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
    if (!serverId) return
    if (tab === 'bans')    dispatch(fetchBans(serverId))
    if (tab === 'invites') dispatch(fetchSettingsInvites(serverId))
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
      // оставляем как есть
    }
  }

  const handleConfirmKick = () => {
    if (!serverId || !kickTarget) return
    dispatch(kickMemberThunk({ serverId, memberId: kickTarget.userId }))
    setKickTarget(null)
  }

  const handleConfirmBan = () => {
    if (!serverId || !banTarget) return
    dispatch(banMemberThunk({ serverId, memberId: banTarget.userId }))
    setBanTarget(null)
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
    const name = newChName.trim().toLowerCase().replace(/\s+/g, '-')
    await dispatch(createChannel({ serverId, name, type: newChType }))
    setNewChName('')
  }

  const handleDeleteInvite = (code: string) => {
    if (!serverId) return
    dispatch(deleteInviteThunk({ guildId: serverId, code }))
  }

  const handleCreateInvite = () => {
    if (!serverId) return
    dispatch(createInviteThunk({
      guildId: serverId,
      data: { maxUses: 10, expiresIn: '7d', expiresInSeconds: 604800 },
    })).then(() => dispatch(fetchSettingsInvites(serverId)))
  }

  const handleCopyInvite = async (code: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(code))
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(c => (c === code ? null : c)), 1500)
    } catch {
      // браузер запретил clipboard — игнорируем
    }
  }

  const navItems: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Обзор',        icon: <IGear /> },
    { id: 'members',  label: 'Участники',   icon: <IUsers />,  count: members.length },
    { id: 'channels', label: 'Каналы',      icon: <IHash />,   count: channels.length },
    { id: 'invites',  label: 'Приглашения', icon: <ILink />,   count: invites.length },
    { id: 'bans',     label: 'Баны',        icon: <IShield />, count: bans.length },
  ]

  return (
    <>
      <header className="top">
        <div className="top-left">
          <div className="top-breadcrumb">
            <span className="crumb-server">{server?.name ?? 'Сервер'}</span>
            <span className="crumb-sep">›</span>
            <span className="crumb-channel"><IGear />Настройки</span>
          </div>
        </div>
        <div className="top-actions">
          <button
            className="icon-btn"
            title="Закрыть"
            onClick={() => navigate(`/servers/${serverId}/channels`)}
          >
            <IX />
          </button>
        </div>
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
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.count != null && item.count > 0 && (
                  <span className="settings-nav-count mono">{item.count}</span>
                )}
              </button>
            ))}

            {isOwner && (
              <>
                <div className="settings-nav-h" style={{ marginTop: 20 }}>ОПАСНАЯ ЗОНА</div>
                <button
                  className={`settings-nav-item is-danger${tab === 'danger' ? ' is-active' : ''}`}
                  onClick={() => setTab('danger')}
                >
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
                readOnly={!isOwner && !isAdmin}
              />
            )}
            {tab === 'members' && (
              <MembersTab
                members={members}
                currentUserId={user?.id ?? ''}
                isOwner={isOwner}
                isAdmin={isAdmin}
                onKick={(m) => setKickTarget(m)}
                onBan={(m) => setBanTarget(m)}
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
                copiedCode={copiedCode}
                onCreate={handleCreateInvite}
                onDelete={handleDeleteInvite}
                onCopy={handleCopyInvite}
              />
            )}
            {tab === 'bans' && (
              <BansTab
                bans={bans}
                loading={loading}
                onUnban={handleUnban}
                resolveName={(uid) =>
                  members.find(m => m.userId === uid)?.displayName ?? uid
                }
              />
            )}
            {tab === 'danger' && isOwner && (
              <DangerTab
                serverName={server?.name ?? ''}
                deleteConfirm={deleteConfirm}
                setDeleteConfirm={setDeleteConfirm}
                onDelete={handleDeleteServer}
              />
            )}
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={!!kickTarget}
        title={kickTarget ? `Кикнуть ${kickTarget.displayName}?` : ''}
        description="Участник будет немедленно отключён от всех каналов сервера. Он сможет вернуться по новому приглашению."
        confirmLabel="Кикнуть"
        danger
        onConfirm={handleConfirmKick}
        onClose={() => setKickTarget(null)}
      />

      <ConfirmDialog
        open={!!banTarget}
        title={banTarget ? `Забанить ${banTarget.displayName}?` : ''}
        description="Участник будет отключён и не сможет вернуться, даже по приглашению. Решение можно отменить во вкладке «Баны»."
        confirmLabel="Забанить"
        danger
        onConfirm={handleConfirmBan}
        onClose={() => setBanTarget(null)}
      />
    </>
  )
}

// ─── Overview ────────────────────────────────────────────────────────────────

const OverviewTab: React.FC<{
  name: string
  setName: (v: string) => void
  onSave: () => void
  saved: boolean
  readOnly: boolean
}> = ({ name, setName, onSave, saved, readOnly }) => (
  <div>
    <div className="settings-section-head">
      <h1>Обзор</h1>
      <p>Основные параметры сервера. Изменения сразу же видны всем участникам.</p>
    </div>
    <div className="settings-field">
      <label className="settings-label">Название сервера</label>
      <input
        className="settings-input"
        value={name}
        onChange={e => setName(e.target.value)}
        disabled={readOnly}
        maxLength={100}
      />
      <div className="settings-help">
        От 1 до 100 символов. {readOnly && '— у вас нет прав на изменение.'}
      </div>
    </div>
    {!readOnly && (
      <div className="settings-actions">
        <button className="btn-save" onClick={onSave} disabled={!name.trim()}>
          {saved ? <><ICheck /> Сохранено</> : 'Сохранить'}
        </button>
      </div>
    )}
  </div>
)

// ─── Members ─────────────────────────────────────────────────────────────────

const MembersTab: React.FC<{
  members: Member[]
  currentUserId: string
  isOwner: boolean
  isAdmin: boolean
  onKick: (m: Member) => void
  onBan: (m: Member) => void
  onRoleChange: (id: string, role: 'admin' | 'member') => void
}> = ({ members, currentUserId, isOwner, isAdmin, onKick, onBan, onRoleChange }) => {
  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<string>('all')

  const filtered = members.filter(m => {
    const matchName =
      m.displayName.toLowerCase().includes(search.toLowerCase()) ||
      m.username.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || m.role.toLowerCase() === roleFilter
    return matchName && matchRole
  })

  return (
    <div>
      <div className="settings-section-head">
        <h1>Участники</h1>
        <p>{pluralize(members.length, 'участник', 'участника', 'участников')} на сервере.</p>
      </div>

      <div className="list-toolbar">
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
            style={{ width: 140, height: 36, padding: '0 10px', fontSize: 13 }}
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
          <span style={{ justifySelf: 'end' }}>Действия</span>
        </div>
        {filtered.map(m => {
          const isSelf = m.userId === currentUserId
          const roleLower = m.role.toLowerCase() as 'owner' | 'admin' | 'member'
          const canManage = !isSelf && (
            (isOwner && m.role !== 'Owner') ||
            (isAdmin && m.role === 'Member')
          )
          return (
            <div key={m.userId} className="dt-row dt-members" style={{ gridTemplateColumns: '2fr 1fr 100px' }}>
              <div className="nm-cell">
                <Avatar str={m.displayName || m.userId} size={32} />
                <div className="stack">
                  <span className="nm">
                    {m.displayName}
                    {isSelf && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--brand-1)', fontFamily: 'var(--font-mono)' }}>(вы)</span>}
                  </span>
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
              <div className="row-actions">
                {canManage && (
                  <>
                    <button className="row-action-btn" title="Исключить" onClick={() => onKick(m)}>
                      <IBoot />
                    </button>
                    <button className="row-action-btn is-danger" title="Забанить" onClick={() => onBan(m)}>
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
            <div className="h">
              {search || roleFilter !== 'all' ? 'Никто не найден' : 'Нет участников'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Channels ────────────────────────────────────────────────────────────────

const ChannelsTab: React.FC<{
  channels: { id: string; name: string; type: 'text' | 'voice' }[]
  newName: string
  setNewName: (v: string) => void
  newType: 'text' | 'voice'
  setNewType: (v: 'text' | 'voice') => void
  onCreate: () => void
  onDelete: (id: string) => void
}> = ({ channels, newName, setNewName, newType, setNewType, onCreate, onDelete }) => {
  const [confirmDelete, setConfirmDelete] = React.useState<{ id: string; name: string } | null>(null)

  return (
    <div>
      <div className="settings-section-head">
        <h1>Каналы</h1>
        <p>{pluralize(channels.length, 'канал', 'канала', 'каналов')} на сервере.</p>
      </div>

      <div className="list-toolbar">
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
          <span style={{ justifySelf: 'end' }}>Действия</span>
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
                {ch.type === 'text' ? 'текст' : 'голос'}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ch.id}
            </div>
            <div className="row-actions">
              <button
                className="row-action-btn is-danger"
                title="Удалить"
                onClick={() => setConfirmDelete({ id: ch.id, name: ch.name })}
              >
                <ITrash />
              </button>
            </div>
          </div>
        ))}
        {channels.length === 0 && (
          <div className="empty-table-state">
            <div className="ic-blob"><IHash /></div>
            <div className="h">На сервере нет каналов</div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete ? `Удалить канал #${confirmDelete.name}?` : ''}
        description="История сообщений будет удалена безвозвратно. Это действие нельзя отменить."
        confirmLabel="Удалить"
        danger
        onConfirm={() => {
          if (confirmDelete) onDelete(confirmDelete.id)
          setConfirmDelete(null)
        }}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  )
}

// ─── Invites ─────────────────────────────────────────────────────────────────

const InvitesTab: React.FC<{
  invites: { id: string; code: string; maxUses: number; userCount: number; expiresAt: string; createdAt: string }[]
  loading: boolean
  copiedCode: string | null
  onCreate: () => void
  onDelete: (code: string) => void
  onCopy: (code: string) => void
}> = ({ invites, loading, copiedCode, onCreate, onDelete, onCopy }) => {
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null)

  return (
    <div>
      <div className="settings-section-head">
        <h1>Приглашения</h1>
        <p>Гибкие ссылки с TTL и лимитом использований. Делитесь ссылкой целиком — она ведёт на /invite/&lt;код&gt;.</p>
      </div>

      <div className="list-toolbar">
        <div className="left" />
        <button className="btn-add" onClick={onCreate} disabled={loading}>
          <IPlus />Создать приглашение
        </button>
      </div>

      <div className="data-table">
        <div className="dt-head dt-invites">
          <span>Ссылка</span>
          <span>Создано</span>
          <span>Использований</span>
          <span>Истекает</span>
          <span style={{ justifySelf: 'end' }}>Действия</span>
        </div>
        {invites.map(inv => {
          const uses = inv.maxUses ? Math.min(100, (inv.userCount / inv.maxUses) * 100) : 0
          const isCopied = copiedCode === inv.code
          return (
            <div key={inv.id} className="dt-row dt-invites">
              <div className="invite-code-cell" title={inviteUrl(inv.code)}>
                <ILink />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  /invite/<b>{inv.code}</b>
                </span>
                <button
                  className="invite-code-copy"
                  title="Скопировать полную ссылку"
                  onClick={() => onCopy(inv.code)}
                >
                  {isCopied ? <ICheck /> : <ICopy />}
                </button>
              </div>
              <div style={{ color: 'var(--fg-2)', fontSize: 12 }}>
                {inv.createdAt ? timeAgo(inv.createdAt) : '—'}
              </div>
              <div className="uses-cell">
                {inv.userCount} / {inv.maxUses || '∞'}
                {inv.maxUses > 0 && (
                  <div className="uses-bar">
                    <div className="uses-fill" style={{ width: `${uses}%` }} />
                  </div>
                )}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)' }}>
                {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString('ru-RU') : 'бессрочно'}
              </div>
              <div className="row-actions">
                <button
                  className="row-action-btn is-danger"
                  title="Отозвать приглашение"
                  onClick={() => setConfirmDelete(inv.code)}
                >
                  <ITrash />
                </button>
              </div>
            </div>
          )
        })}
        {invites.length === 0 && !loading && (
          <div className="empty-table-state">
            <div className="ic-blob"><ILink /></div>
            <div className="h">Нет активных приглашений</div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-3)' }}>
              Создайте приглашение, чтобы пригласить участников на сервер.
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Отозвать приглашение?"
        description={
          confirmDelete
            ? <>Ссылка <code className="mono">/invite/{confirmDelete}</code> перестанет работать. Тех, кто уже принят, это не затронет.</>
            : ''
        }
        confirmLabel="Отозвать"
        danger
        onConfirm={() => {
          if (confirmDelete) onDelete(confirmDelete)
          setConfirmDelete(null)
        }}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  )
}

// ─── Bans ────────────────────────────────────────────────────────────────────

const BansTab: React.FC<{
  bans: { userId: string; bannedBy: string; reason: string | null; bannedAt: string }[]
  loading: boolean
  onUnban: (userId: string) => void
  resolveName: (userId: string) => string
}> = ({ bans, loading, onUnban, resolveName }) => {
  const [confirmUnban, setConfirmUnban] = React.useState<string | null>(null)

  return (
    <div>
      <div className="settings-section-head">
        <h1>Баны</h1>
        <p>Заблокированные пользователи не могут вернуться даже по приглашению, пока вы не снимете бан.</p>
      </div>

      <div className="data-table">
        <div className="dt-head dt-bans">
          <span>Пользователь</span>
          <span>Причина</span>
          <span>Забанил</span>
          <span style={{ justifySelf: 'end' }}>Действия</span>
        </div>
        {bans.map(ban => {
          const display = resolveName(ban.userId)
          const isUuid = display === ban.userId
          return (
            <div key={ban.userId} className="dt-row dt-bans">
              <div className="nm-cell">
                <Avatar str={display} size={32} />
                <div className="stack">
                  <span className="nm">{isUuid ? 'Неизвестный пользователь' : display}</span>
                  <span className="hn">{isUuid ? ban.userId.slice(0, 8) + '...' : ''}</span>
                </div>
              </div>
              <div className="reason">
                {ban.reason || <span style={{ color: 'var(--fg-3)' }}>—</span>}
              </div>
              <div>
                <div style={{ fontSize: 13 }}>{resolveName(ban.bannedBy)}</div>
                <div className="hn">{timeAgo(ban.bannedAt)}</div>
              </div>
              <div className="row-actions">
                <button
                  className="row-action-btn"
                  title="Снять бан"
                  onClick={() => setConfirmUnban(ban.userId)}
                >
                  <ICheck />
                </button>
              </div>
            </div>
          )
        })}
        {bans.length === 0 && !loading && (
          <div className="empty-table-state">
            <div className="ic-blob"><IShield /></div>
            <div className="h">В сервере нет банов</div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-3)' }}>Это хорошие новости.</div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmUnban}
        title="Снять бан?"
        description="Пользователь снова сможет принимать приглашения и присоединяться к серверу."
        confirmLabel="Снять бан"
        onConfirm={() => {
          if (confirmUnban) onUnban(confirmUnban)
          setConfirmUnban(null)
        }}
        onClose={() => setConfirmUnban(null)}
      />
    </div>
  )
}

// ─── Danger ──────────────────────────────────────────────────────────────────

const DangerTab: React.FC<{
  serverName: string
  deleteConfirm: string
  setDeleteConfirm: (v: string) => void
  onDelete: () => void
}> = ({ serverName, deleteConfirm, setDeleteConfirm, onDelete }) => (
  <div>
    <div className="settings-section-head">
      <h1>Опасная зона</h1>
      <p>Необратимые действия. Подумайте дважды — отменить будет нельзя.</p>
    </div>

    <div className="danger-card">
      <h3>Удалить сервер «{serverName}»</h3>
      <p>
        Все каналы, сообщения, приглашения и баны будут удалены безвозвратно.
        Участники получат уведомление и будут отключены от сервера немедленно.
      </p>
      <div className="confirm-typing">
        <p>Для подтверждения введите название сервера: <code>{serverName}</code></p>
        <input
          className="settings-input"
          value={deleteConfirm}
          onChange={e => setDeleteConfirm(e.target.value)}
          placeholder={serverName}
          style={{ marginTop: 8 }}
          autoFocus
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
  </div>
)
