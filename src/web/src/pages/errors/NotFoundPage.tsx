import React from 'react'
import { useNavigate } from 'react-router-dom'
import { IHome } from '../../shared/components/Icons/Icons'

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate()
  return (
    <div className="system-page">
      <div className="system-card">
        <div className="system-code">404</div>
        <h1>Страница не найдена</h1>
        <p>
          Возможно, ссылка устарела, у вас нет доступа к этому серверу или
          каналу. Вернитесь на главную и выберите сервер из списка.
        </p>
        <button className="home-link" onClick={() => navigate('/servers')}>
          <IHome />
          На главную
        </button>
      </div>
    </div>
  )
}
