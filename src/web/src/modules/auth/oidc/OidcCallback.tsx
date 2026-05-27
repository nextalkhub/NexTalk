import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ICheck } from '../../../shared/components/Icons/Icons'
import { useAppDispatch } from '../../../store'
import { handleAuthCallback } from '../../../shared/slices/authSlice'

const STEPS = [
  'Проверяем state и nonce',
  'Меняем authorization code на токен',
  'Валидируем подпись JWT',
  'Сохраняем сессию и переходим...',
]

export const OidcCallback: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(location.search)
      const code = params.get('code')
      const state = params.get('state')
      const errParam = params.get('error')
      const errDesc = params.get('error_description')

      if (errParam) { setError(errDesc || errParam); return }
      if (!code || !state) { setError('Missing code or state parameter'); return }

      const advance = (i: number) =>
        new Promise<void>(r => setTimeout(() => { setStep(i + 1); r() }, 700))

      try {
        await advance(0)
        await advance(1)
        await advance(2)
        await dispatch(handleAuthCallback({ code, state })).unwrap()
        setStep(3)
        await new Promise(r => setTimeout(r, 500))
        const returnUrl = sessionStorage.getItem('return_url') || '/servers'
        sessionStorage.removeItem('return_url')
        navigate(returnUrl)
      } catch (err) {
        setError('Ошибка авторизации. Попробуйте снова.')
      }
    }
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-mark" style={{ background: 'linear-gradient(135deg,#FF5A6E,#C254FF)' }}>!</div>
          <h1>Ошибка авторизации</h1>
          <p className="sub">{error}</p>
          <button className="btn-primary-lg" onClick={() => navigate('/auth')}>Вернуться</button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card callback-card">
        <div className="callback-spinner" />
        <h1>Авторизуемся...</h1>
        <p className="sub">Не закрывайте вкладку — обмен токенами займёт несколько секунд.</p>
        <div className="callback-steps">
          {STEPS.map((label, i) => (
            <div
              key={i}
              className={`callback-step${i < step ? ' done' : i === step ? ' active' : ''}`}
            >
              <span className="step-ic">{i < step ? <ICheck /> : i === step ? '●' : '○'}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
