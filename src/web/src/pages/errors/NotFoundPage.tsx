import React from 'react'
import { useNavigate } from 'react-router-dom'

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate()
  return (
    <div className="system-page">
      <div className="system-card">
        <div className="system-code">404</div>
        <h1>Страница не найдена</h1>
        <p>Похоже, эта страница не существует или была удалена.</p>
        <button className="home-link" onClick={() => navigate('/servers')}>
          Вернуться домой
        </button>
      </div>
    </div>
  )
}
