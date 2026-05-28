import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../store'
import { login, selectAuthError, selectIsAuthenticated, selectIsLoading } from '../../../shared/slices/authSlice'
import { ICheck, IShield } from '../../../shared/components/Icons/Icons'

export const AuthPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const isAuth = useAppSelector(selectIsAuthenticated)
  const authError = useAppSelector(selectAuthError)
  const isAuthLoading = useAppSelector(selectIsLoading)
  const [localLoading, setLocalLoading] = useState(false)

  useEffect(() => {
    if (isAuth) {
      const returnUrl = sessionStorage.getItem('return_url')
      const target = returnUrl && returnUrl.startsWith('/') ? returnUrl : '/servers'
      sessionStorage.removeItem('return_url')
      navigate(target, { replace: true })
    }
  }, [isAuth, navigate])

  const handleLogin = async () => {
    setLocalLoading(true)
    try {
      await dispatch(login()).unwrap()
    } catch {
      setLocalLoading(false)
    }
  }

  const busy = localLoading || isAuthLoading

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-mark">N</div>
        <h1>Войти в NexTalk</h1>
        <p className="sub">
          Авторизация через Zitadel. NexTalk не хранит ваш пароль —
          им управляет ваш identity provider.
        </p>

        <div className="auth-features">
          <div className="auth-feature">
            <span className="ic"><ICheck /></span>
            <span>OpenID Connect с PKCE — без секрета на клиенте</span>
          </div>
          <div className="auth-feature">
            <span className="ic"><ICheck /></span>
            <span>Подпись JWT проверяется на каждом сервисе</span>
          </div>
          <div className="auth-feature">
            <span className="ic"><ICheck /></span>
            <span>2FA, восстановление пароля — настраиваются в Zitadel</span>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary-lg"
          onClick={handleLogin}
          disabled={busy}
        >
          {busy ? (
            <>
              <span
                className="callback-spinner"
                style={{ width: 18, height: 18, margin: 0, borderWidth: 2 }}
              />
              Перенаправляем в Zitadel...
            </>
          ) : (
            <>
              <IShield />
              Продолжить через Zitadel
            </>
          )}
        </button>

        {authError && (
          <div className="auth-error">
            <strong>Ошибка входа.</strong> {authError}
          </div>
        )}

        <div className="auth-foot">
          <span className="chip mono">
            <span className="dot online" />
            zitadel · OIDC
          </span>
        </div>
      </div>
    </div>
  )
}
