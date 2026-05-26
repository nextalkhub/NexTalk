import React from 'react'
import { Link } from 'react-router-dom'
import { IRefresh } from '../../shared/components/Icons/Icons'

interface ServerErrorPageProps {
  error?: Error
  resetError?: () => void
}

export const ServerErrorPage: React.FC<ServerErrorPageProps> = ({ resetError }) => {

  const handleRetry = () => {
    resetError?.()
    window.location.reload()
  }

  // navigate not needed here; window.location.reload() covers refresh

  return (
    <div className="system-page">
      <div className="system-card">
        <div className="system-code">503</div>
        <h1>Сервис недоступен</h1>
        <p>Сервер временно недоступен. Попробуйте обновить страницу через несколько секунд.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="home-link" onClick={handleRetry}>
            <IRefresh />
            Обновить страницу
          </button>
          <Link
            className="home-link"
            to="/servers"
            style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--bd-2)', color: 'var(--fg-1)', boxShadow: 'none' }}
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  )
}
