import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IShield, ICheck } from '../../../shared/components/Icons/Icons'
import { useAppDispatch, useAppSelector } from '../../../store'
import { login, selectIsAuthenticated, selectAuthError } from '../../../shared/slices/authSlice'

export const AuthPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const error = useAppSelector(selectAuthError)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/servers')
  }, [isAuthenticated, navigate])

  const handleLogin = async () => {
    setLoading(true)
    try {
      await dispatch(login()).unwrap()
      if (import.meta.env.VITE_USE_AUTH_MOCK === 'true') navigate('/servers')
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-mark">N</div>
        <h1>Войти в NexTalk</h1>
        <p className="sub">
          Авторизация через Zitadel · ваш единый identity provider.
          Учётные данные NexTalk не хранит.
        </p>

        <div className="auth-features">
          <div className="auth-feature">
            <span className="ic"><ICheck /></span>
            <span>OpenID Connect · PKCE flow, без секрета на клиенте</span>
          </div>
          <div className="auth-feature">
            <span className="ic"><ICheck /></span>
            <span>JWT с claims <code className="mono" style={{ fontSize: 11 }}>sub</code>, <code className="mono" style={{ fontSize: 11 }}>email</code>, <code className="mono" style={{ fontSize: 11 }}>preferred_username</code></span>
          </div>
          <div className="auth-feature">
            <span className="ic"><ICheck /></span>
            <span>2FA, политики паролей и восстановление — в Zitadel</span>
          </div>
        </div>

        <button className="btn-primary-lg" onClick={handleLogin} disabled={loading}>
          {loading ? (
            <>
              <span className="callback-spinner" style={{ width: 18, height: 18, margin: 0, borderWidth: 2 }} />
              Перенаправляем в Zitadel...
            </>
          ) : (
            <>
              <IShield />
              Продолжить через Zitadel
            </>
          )}
        </button>

        {error && (
          <div className="auth-error">
            <strong>Ошибка входа.</strong> {error}
          </div>
        )}

        <div className="auth-foot">
          <span className="chip mono">prod · zitadel.nextalk.io</span>
        </div>
      </div>
    </div>
  )
}
