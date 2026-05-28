import React, { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../store'
import { handleAuthCallback, selectAuthError, selectIsAuthenticated, selectIsLoading } from '../../../shared/slices/authSlice'
import { ICheck } from '../../../shared/components/Icons/Icons'

/**
 * Handles the Zitadel OIDC redirect. The previous implementation:
 *   • Showed a generic "Loading..." with no progress.
 *   • Always navigated to /servers on success, ignoring the original
 *     destination — so accepting an invite link kicked the user out of
 *     the invite preview.
 * This version mirrors the four-step UX from the design and respects
 * the `return_url` saved by AcceptInvitePage / ProtectedRoute.
 */
export const OidcCallback: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()

  const isAuth = useAppSelector(selectIsAuthenticated)
  const isLoading = useAppSelector(selectIsLoading)
  const error = useAppSelector(selectAuthError)

  const [step, setStep] = React.useState(0)

  // Drive the step indicator by both real auth state and small UX timeouts
  // so the user always sees movement even on fast callbacks.
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(s => Math.max(s, 1)), 300),
      setTimeout(() => setStep(s => Math.max(s, 2)), 800),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuth && !error) {
      const params = new URLSearchParams(location.search)
      const code = params.get('code')
      const state = params.get('state')
      if (code) dispatch(handleAuthCallback({ code, state: state ?? '' }))
    }
  }, [location.search, dispatch, isLoading, isAuth, error])

  useEffect(() => {
    if (isAuth) {
      setStep(3)
      const returnUrl = sessionStorage.getItem('return_url')
      const target = returnUrl && returnUrl.startsWith('/') ? returnUrl : '/servers'
      sessionStorage.removeItem('return_url')
      const t = setTimeout(() => navigate(target, { replace: true }), 500)
      return () => clearTimeout(t)
    }
  }, [isAuth, navigate])

  const steps = [
    'Проверяем state и nonce',
    'Меняем authorization code на токен',
    'Валидируем подпись JWT',
    'Сохраняем сессию и переходим…',
  ]

  return (
    <div className="auth-page">
      <div className="auth-card callback-card">
        <div className="callback-spinner" />
        <h1>Авторизуемся...</h1>
        <p className="sub">Не закрывайте вкладку — обмен токенами займёт несколько секунд.</p>

        <div className="callback-steps">
          {steps.map((label, i) => (
            <div
              key={label}
              className={
                'callback-step ' +
                (i < step ? 'done' : i === step ? 'active' : '')
              }
            >
              <span className="step-ic">
                {i < step ? <ICheck /> : i === step ? '●' : '○'}
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="auth-error" style={{ marginTop: 24 }}>
            <strong>Не удалось войти.</strong> {error}
            <button
              className="btn-cancel"
              style={{ marginTop: 12, height: 32, padding: '0 12px' }}
              onClick={() => navigate('/auth', { replace: true })}
            >
              Вернуться на страницу входа
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
