import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { ICheck, IChevRight } from '../../../shared/components/Icons/Icons'
import { useAppDispatch, useAppSelector } from '../../../store'
import { acceptInviteThunk } from '../../../shared/slices/inviteSlice'
import { fetchServers, selectServers } from '../../../shared/slices/serverSlice'
import { selectIsAuthenticated, selectIsLoading } from '../../../shared/slices/authSlice'
import { getInviteInfo } from '../../../processes/invites/getInviteInfo'
import { useSignalR } from '../../../shared/hooks/useSignalR'
import { pluralMembers } from '../../../shared/utils/format'
import type { Invite } from '../../../shared/types'

type ViewState =
  | { kind: 'loading' }
  | { kind: 'preview'; info: Invite & { guildName: string } }
  | { kind: 'expired' }
  | { kind: 'consumed' }
  | { kind: 'banned' }
  | { kind: 'invalid' }
  | { kind: 'already-member' }

/**
 * Public invite acceptance page mounted at /invite/:code.
 *
 *  • If the user isn't authenticated, save the return URL and redirect
 *    to /auth — they'll come back after OIDC.
 *  • Calls GET /api/invites/{code} for preview.
 *  • Accept button calls POST /api/invites/{code}/accept and navigates
 *    to the joined guild.
 */
export const AcceptInvitePage: React.FC = () => {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const isAuth = useAppSelector(selectIsAuthenticated)
  const isAuthLoading = useAppSelector(selectIsLoading)
  const userServers = useAppSelector(selectServers)
  const acceptLoading = useAppSelector(state => state.invite.loading)
  const { connection } = useSignalR()

  const [view, setView] = useState<ViewState>({ kind: 'loading' })
  const [submitting, setSubmitting] = useState(false)

  // Load preview (only when authenticated).
  useEffect(() => {
    if (!isAuth || !code) return
    let cancelled = false
    setView({ kind: 'loading' })
    getInviteInfo(code)
      .then(info => {
        if (cancelled) return
        // already a member?
        if (userServers.some(s => s.id === info.guildId)) {
          setView({ kind: 'already-member' })
          return
        }
        // expired / consumed checks
        if (info.expiresAt && new Date(info.expiresAt).getTime() < Date.now()) {
          setView({ kind: 'expired' })
          return
        }
        if (info.maxUses != null && info.userCount >= info.maxUses) {
          setView({ kind: 'consumed' })
          return
        }
        setView({ kind: 'preview', info })
      })
      .catch(err => {
        if (cancelled) return
        const status = err?.response?.status
        if (status === 403) setView({ kind: 'banned' })
        else if (status === 410) setView({ kind: 'expired' })
        else setView({ kind: 'invalid' })
      })
    return () => { cancelled = true }
  }, [code, isAuth, userServers])

  if (isAuthLoading) {
    return (
      <div className="auth-page">
        <div className="auth-card callback-card">
          <div className="callback-spinner" />
          <p className="sub" style={{ marginBottom: 0 }}>Проверяем сессию...</p>
        </div>
      </div>
    )
  }

  if (!code) {
    return <Navigate to="/servers" replace />
  }

  if (!isAuth) {
    // Save the URL synchronously so OidcCallback can bring the user back
    // to this page after Zitadel returns.
    sessionStorage.setItem('return_url', `/invite/${code}`)
    return <Navigate to="/auth" replace />
  }

  const handleAccept = async () => {
    if (!code || submitting) return
    setSubmitting(true)
    try {
      const { guildId } = await dispatch(acceptInviteThunk(code)).unwrap()
      if (connection && guildId) {
        await connection.invoke('JoinGuildGroup', guildId).catch(() => {})
      }
      await dispatch(fetchServers())
      navigate(`/servers/${guildId}/channels`)
    } catch {
      setView({ kind: 'invalid' })
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card invite-card">
        {view.kind === 'loading' && (
          <>
            <div className="callback-spinner" />
            <p className="sub" style={{ textAlign: 'center', marginBottom: 0 }}>Загружаем приглашение...</p>
          </>
        )}

        {view.kind === 'invalid' && (
          <InviteStatus
            mark="?"
            markBg="linear-gradient(135deg,#6B7280,#4B5563)"
            title="Приглашение не найдено"
            description={<>Код <code className="mono">{code}</code> не существует или был отозван.</>}
            onBack={() => navigate('/servers')}
          />
        )}

        {view.kind === 'expired' && (
          <InviteStatus
            mark="!"
            markBg="linear-gradient(135deg,#F5C451,#D97757)"
            title="Срок действия истёк"
            description="Это приглашение больше не действует. Попросите новую ссылку у владельца сервера."
            onBack={() => navigate('/servers')}
          />
        )}

        {view.kind === 'consumed' && (
          <InviteStatus
            mark="!"
            markBg="linear-gradient(135deg,#F5C451,#D97757)"
            title="Лимит использований исчерпан"
            description="Этим приглашением уже воспользовались максимальное число раз."
            onBack={() => navigate('/servers')}
          />
        )}

        {view.kind === 'banned' && (
          <InviteStatus
            mark="×"
            markBg="linear-gradient(135deg,#FF5A6E,#C254FF)"
            title="Доступ заблокирован"
            description="Вы забанены на этом сервере. Свяжитесь с владельцем, чтобы оспорить решение."
            onBack={() => navigate('/servers')}
          />
        )}

        {view.kind === 'already-member' && (
          <InviteStatus
            mark="✓"
            markBg="linear-gradient(135deg,#34D399,#10B981)"
            title="Вы уже на сервере"
            description="Это приглашение для сервера, к которому вы уже присоединились."
            onBack={() => navigate('/servers')}
            backLabel="Перейти на сервер"
          />
        )}

        {view.kind === 'preview' && (
          <>
            <div className="invite-banner" />
            <div className="invite-meta">
              <div className="ic">{view.info.guildName.charAt(0).toUpperCase()}</div>
              <div>
                <div className="invite-name">{view.info.guildName}</div>
                <div className="invite-sub">Приглашение в сервер</div>
                {view.info.userCount > 0 && (
                  <div className="invite-presence">
                    <span className="dot online" />
                    {pluralMembers(view.info.userCount)} принято
                  </div>
                )}
              </div>
            </div>

            <div className="invite-detail-grid">
              <div className="invite-detail">
                <div className="lbl">КОД</div>
                <div className="val mono">{view.info.code}</div>
              </div>
              <div className="invite-detail">
                <div className="lbl">ДЕЙСТВУЕТ ДО</div>
                <div className="val">{
                  view.info.expiresAt
                    ? new Date(view.info.expiresAt).toLocaleDateString('ru-RU')
                    : 'бессрочно'
                }</div>
              </div>
              <div className="invite-detail">
                <div className="lbl">ИСПОЛЬЗОВАНО</div>
                <div className="val mono">
                  {view.info.userCount} / {view.info.maxUses || '∞'}
                </div>
              </div>
              <div className="invite-detail">
                <div className="lbl">ВАША РОЛЬ</div>
                <div className="val">Member</div>
              </div>
            </div>

            <div className="invite-actions">
              <button className="btn-secondary" onClick={() => navigate('/servers')}>
                Не сейчас
              </button>
              <button
                className="btn-primary"
                onClick={handleAccept}
                disabled={submitting || acceptLoading}
              >
                {submitting ? 'Присоединяемся...' : <>Присоединиться <IChevRight /></>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const InviteStatus: React.FC<{
  mark: string
  markBg: string
  title: string
  description: React.ReactNode
  onBack: () => void
  backLabel?: string
}> = ({ mark, markBg, title, description, onBack, backLabel = 'Вернуться' }) => (
  <>
    <div className="auth-mark" style={{ background: markBg }}>{mark}</div>
    <h1>{title}</h1>
    <p className="sub">{description}</p>
    <button className="btn-primary-lg" onClick={onBack}>
      {backLabel === 'Перейти на сервер' && <ICheck />}
      {backLabel}
    </button>
  </>
)
