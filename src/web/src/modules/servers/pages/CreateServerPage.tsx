import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createServer } from '../../../shared/slices/serverSlice'
import { useAppDispatch } from '../../../store'
import { useSignalR } from '../../../shared/hooks/useSignalR'

export const CreateServerPage: React.FC = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const dispatch = useAppDispatch()
  const { connection } = useSignalR()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const guild = await dispatch(createServer({ name, displayName })).unwrap()
      if (connection && guild?.id) {
        await connection.invoke('JoinGuildGroup', guild.id).catch(() => {})
      }
      navigate('/servers')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-mark">N</div>
        <h1>Создать сервер</h1>
        <p className="sub">Новое пространство для голосового и текстового общения с вашей командой.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <div className="settings-field" style={{ marginBottom: 0 }}>
            <label className="settings-label">Название сервера</label>
            <input
              className="settings-input"
              placeholder="Например: Game Night"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="settings-field" style={{ marginBottom: 0 }}>
            <label className="settings-label">Отображаемое название</label>
            <input
              className="settings-input"
              placeholder="Например: game-night"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
            <div className="settings-help">Короткое имя, используется в URL и метаданных</div>
          </div>
          <button type="submit" className="btn-primary-lg" style={{ marginTop: 4 }} disabled={!name.trim() || loading}>
            {loading ? 'Создание...' : 'Создать сервер'}
          </button>
        </form>

        <div className="auth-foot">
          <button
            style={{ background: 'none', border: 'none', color: 'var(--fg-2)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
            onClick={() => navigate('/servers')}
          >
            ← Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
