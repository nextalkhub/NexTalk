import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { IHash, ISpeaker } from '../../../shared/components/Icons/Icons'
import { createChannel } from '../../../shared/slices/channelSlice'
import { useAppDispatch } from '../../../store'

interface CreateChannelModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { serverId } = useParams()
  const [name, setName] = useState('')
  const [type, setType] = useState<'text' | 'voice'>('text')
  const [loading, setLoading] = useState(false)
  const dispatch = useAppDispatch()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !serverId || serverId === 'undefined') return
    setLoading(true)
    try {
      const formattedName = name.trim().replace(/\s/g, '-')
      await dispatch(createChannel({ serverId, name: formattedName, type }))
      setName('')
      setType('text')
      onSuccess?.()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Создать канал</h2>
          <p>Выберите тип и введите название</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="radio-cards" style={{ marginBottom: 20 }}>
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
          </div>
          <div className="modal-foot">
            <button type="button" className="btn-cancel" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn-save" disabled={!name.trim() || loading}>
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
