import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from './Modal'
import { useAppDispatch } from '../../../store'
import { createServer, setCurrentServer } from '../../slices/serverSlice'
import { useSignalR } from '../../hooks/useSignalR'

interface CreateServerModalProps {
  open: boolean
  onClose: () => void
}

export const CreateServerModal: React.FC<CreateServerModalProps> = ({ open, onClose }) => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { connection } = useSignalR()

  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName('')
    setDisplayName('')
    setLoading(false)
    setError(null)
  }

  const handleClose = () => {
    if (loading) return
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const guild = await dispatch(createServer({
        name: name.trim(),
        displayName: displayName.trim() || name.trim(),
      })).unwrap()
      if (connection && guild?.id) {
        await connection.invoke('JoinGuildGroup', guild.id).catch(() => {})
      }
      dispatch(setCurrentServer(guild))
      reset()
      onClose()
      if (guild?.id) {
        navigate(`/servers/${guild.id}/channels`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать сервер')
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-head">
          <h2>Создать сервер</h2>
          <p>Новое пространство для голосового и текстового общения.</p>
        </div>
        <div className="modal-body">
          <div className="settings-field">
            <label className="settings-label">Название сервера</label>
            <input
              className="settings-input"
              placeholder="Например: NexTalk Core"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <div className="settings-help">От 1 до 100 символов.</div>
          </div>

          {error && (
            <div className="auth-error" style={{ marginTop: 8 }}>
              <strong>Ошибка.</strong> {error}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn-cancel" onClick={handleClose} disabled={loading}>
            Отмена
          </button>
          <button type="submit" className="btn-save" disabled={!name.trim() || loading}>
            {loading ? 'Создание...' : 'Создать сервер'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
