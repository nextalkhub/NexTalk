import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IHash, ISpeaker } from '../../../shared/components/Icons/Icons'
import { createChannel } from '../../../shared/slices/channelSlice'
import { useAppDispatch } from '../../../store'

export const CreateChannelPage: React.FC = () => {
  const navigate = useNavigate()
  const { serverId } = useParams()
  const [name, setName] = useState('')
  const [type, setType] = useState<'text' | 'voice'>('text')
  const [loading, setLoading] = useState(false)
  const dispatch = useAppDispatch()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !serverId) return
    setLoading(true)
    const formattedName = name.toLowerCase().replace(/\s/g, '-')
    await dispatch(createChannel({ serverId, name: formattedName, type }))
    setLoading(false)
    navigate(`/servers/${serverId}/channels`)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-mark">
          {type === 'text' ? <IHash /> : <ISpeaker />}
        </div>
        <h1>Создать канал</h1>
        <p className="sub">Выберите тип канала и задайте название.</p>

        <div className="radio-cards" style={{ marginBottom: 20, marginTop: 8 }}>
          <button
            type="button"
            className={`radio-card${type === 'text' ? ' is-selected' : ''}`}
            onClick={() => setType('text')}
          >
            <div className="ic"><IHash /></div>
            <div className="name">Текстовый</div>
            <div className="desc">Для сообщений и обсуждений</div>
          </button>
          <button
            type="button"
            className={`radio-card${type === 'voice' ? ' is-selected' : ''}`}
            onClick={() => setType('voice')}
          >
            <div className="ic"><ISpeaker /></div>
            <div className="name">Голосовой</div>
            <div className="desc">Для голосовых разговоров</div>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="settings-field" style={{ marginBottom: 0 }}>
            <label className="settings-label">Название канала</label>
            <input
              className="settings-input"
              placeholder="например: general"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
            <div className="settings-help">
              {type === 'text' ? 'Буквы, цифры и дефисы' : 'Участники смогут заходить и выходить'}
            </div>
          </div>
          <button type="submit" className="btn-primary-lg" disabled={!name.trim() || loading}>
            {loading ? 'Создание...' : 'Создать канал'}
          </button>
        </form>

        <div className="auth-foot">
          <button
            style={{ background: 'none', border: 'none', color: 'var(--fg-2)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
            onClick={() => navigate(`/servers/${serverId}/channels`)}
          >
            ← Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
