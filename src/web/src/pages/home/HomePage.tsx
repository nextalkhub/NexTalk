import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IPlus, IArrowOut } from '../../shared/components/Icons/Icons'
import { LayoutContext } from '../../shared/components/Layout/AppShell'
import { useAppDispatch, useAppSelector } from '../../store'
import { selectUser } from '../../shared/slices/authSlice'
import { acceptInviteThunk } from '../../shared/slices/inviteSlice'
import { fetchServers } from '../../shared/slices/serverSlice'
import { useSignalR } from '../../shared/hooks/useSignalR'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { setHideRight } = useContext(LayoutContext)
  const user = useAppSelector(selectUser)
  const inviteLoading = useAppSelector(state => state.invite.loading)
  const { connection } = useSignalR()

  const [inviteInput, setInviteInput] = useState('')
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    setHideRight(true)
    return () => setHideRight(false)
  }, [setHideRight])

  const handleJoin = async () => {
    const code = inviteInput.trim()
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
      setJoinError('Недействительный или истёкший код приглашения.')
    }
  }

  return (
    <>
      <header className="top" style={{ display: 'flex', alignItems: 'center', padding: '0 22px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>
          Добро пожаловать{user?.name ? `, ${user.name}` : ''}
        </div>
      </header>
      <main className="main">
        <div className="home">
          <div className="home-inner">
            <div className="home-mark">N</div>
            <h1>NexTalk</h1>
            <p>Ваше пространство для голосового и текстового общения. Создайте сервер или присоединитесь по приглашению.</p>

            <div className="home-cards">
              <div className="home-card" onClick={() => navigate('/create-server')}>
                <div className="ic"><IPlus /></div>
                <h3>Создать сервер</h3>
                <p>Новое сообщество с текстовыми и голосовыми каналами</p>
              </div>
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
                    placeholder="Код приглашения"
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
          </div>
        </div>
      </main>
    </>
  )
}
