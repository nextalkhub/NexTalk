import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IPlus, IArrowOut } from '../../shared/components/Icons/Icons'
import { LayoutContext } from '../../shared/components/Layout/AppShell'
import { useGlobalModal } from '../../shared/components/Layout/ModalProvider'
import { useAppDispatch, useAppSelector } from '../../store'
import { selectUser } from '../../shared/slices/authSlice'
import { acceptInviteThunk } from '../../shared/slices/inviteSlice'
import { fetchServers, selectServers } from '../../shared/slices/serverSlice'
import { useSignalR } from '../../shared/hooks/useSignalR'
import { pluralize } from '../../shared/utils/format'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { setHideRight } = useContext(LayoutContext)
  const { open } = useGlobalModal()
  const user = useAppSelector(selectUser)
  const servers = useAppSelector(selectServers)
  const inviteLoading = useAppSelector(state => state.invite.loading)
  const { connection, isConnected } = useSignalR()

  const [inviteInput, setInviteInput] = useState('')
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    setHideRight(true)
    return () => setHideRight(false)
  }, [setHideRight])

  const extractCode = (raw: string): string => {
    const trimmed = raw.trim()
    if (!trimmed) return ''
    // Accept either bare code or full URL like https://app/invite/<code>
    const match = trimmed.match(/\/invite\/([^/?\s]+)/i)
    return (match ? match[1] : trimmed).trim()
  }

  const handleJoin = async () => {
    const code = extractCode(inviteInput)
    if (!code) return
    setJoinError('')
    try {
      const { guildId } = await dispatch(acceptInviteThunk(code)).unwrap()
      if (connection && guildId) {
        await connection.invoke('JoinGuildGroup', guildId).catch(() => {})
      }
      await dispatch(fetchServers())
      navigate(`/servers/${guildId}/channels`)
    } catch {
      setJoinError('Недействительный или истекший код приглашения.')
    }
  }

  return (
    <>
      <header className="top">
        <div className="top-left">
          <div className="top-breadcrumb">
            <span className="crumb-channel">
              Добро пожаловать{user?.name ? `, ${user.name}` : ''}
            </span>
          </div>
        </div>
        <div className="top-actions">
          <button
            className="icon-btn"
            title="Настройки приложения"
            onClick={() => navigate('/settings')}
          >
            <IArrowOut />
          </button>
        </div>
      </header>
      <main className="main">
        <div className="home">
          <div className="home-inner">
            <div className="home-mark">N</div>
            <h1>NexTalk</h1>
            <p>
              {servers.length === 0
                ? 'Ваше пространство для голосового и текстового общения. Создайте сервер или присоединитесь по приглашению.'
                : `Слева ${pluralize(servers.length, 'сервер', 'сервера', 'серверов')} - выберите любой, чтобы продолжить, или создайте новый.`}
            </p>

            <div className="home-cards">
              <button
                type="button"
                className="home-card"
                onClick={() => open('create-server')}
                style={{ font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}
              >
                <div className="ic"><IPlus /></div>
                <h3>Создать сервер</h3>
                <p>Новое сообщество с текстовыми и голосовыми каналами.</p>
              </button>

              <div
                className="home-card"
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <div className="ic"><IArrowOut /></div>
                <h3>Войти по коду</h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    className="settings-input"
                    style={{ flex: 1, height: 34, fontSize: 13, padding: '0 10px' }}
                    placeholder="код или ссылка"
                    value={inviteInput}
                    onChange={e => setInviteInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  />
                  <button
                    className="btn-add"
                    style={{ height: 34, fontSize: 13, padding: '0 12px' }}
                    onClick={handleJoin}
                    disabled={inviteLoading || !inviteInput.trim()}
                  >
                    {inviteLoading ? '...' : 'Войти'}
                  </button>
                </div>
                {joinError && <p style={{ color: 'var(--live)', fontSize: 12, margin: 0 }}>{joinError}</p>}
              </div>
            </div>

            <div style={{ marginTop: 28, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span className="chip">
                <span className={`dot ${isConnected ? 'online' : 'offline'}`} />
                {isConnected ? 'SignalR подключен' : 'нет соединения'}
              </span>
              {user && (
                <span className="chip is-brand mono">{user.nickname ? `@${user.nickname}` : user.email}</span>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
