import React from 'react'
import { useNavigate } from 'react-router-dom'
import { IHome, IArrowOut } from '../../shared/components/Icons/Icons'

interface Props {
  code?: string
  message?: string
}

export const ServerErrorPage: React.FC<Props> = ({ code = '503', message }) => {
  const navigate = useNavigate()
  return (
    <div className="system-page">
      <div className="system-card">
        <div
          className="system-code"
          style={{
            background: 'linear-gradient(135deg, #FF5A6E, #F5C451)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {code}
        </div>
        <h1>{message || 'Сервис временно недоступен'}</h1>
        <p>
          Один из микросервисов не отвечает. Polly Circuit Breaker откроется и автоматически
          восстановит соединение в ближайшие 15 секунд. Если ничего не меняется — посмотрите
          статус-страницу.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="home-link" onClick={() => navigate('/servers')}>
            <IHome />
            На главную
          </button>
          <a
            className="home-link"
            href="#"
            style={{ background: 'rgba(255,255,255,.06)', color: 'var(--fg-0)' }}
            onClick={e => e.preventDefault()}
          >
            <IArrowOut />
            status.nextalk.io
          </a>
        </div>
      </div>
    </div>
  )
}
