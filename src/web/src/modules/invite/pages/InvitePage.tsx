import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ICopy, ICheck, IChevRight } from '../../../shared/components/Icons/Icons'
import { LayoutContext } from '../../../shared/components/Layout/AppShell'
import { useAppDispatch, useAppSelector } from '../../../store'
import { createInviteThunk } from '../../../shared/slices/inviteSlice'
import { selectCurrentServer } from '../../../shared/slices/serverSlice'

export const InvitePage: React.FC = () => {
  const navigate = useNavigate()
  const { serverId } = useParams()
  const dispatch = useAppDispatch()
  const { setHideRight } = useContext(LayoutContext)
  const loading = useAppSelector(state => state.invite.loading)
  const server = useAppSelector(selectCurrentServer)

  const [inviteCode, setInviteCode] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setHideRight(true)
    return () => setHideRight(false)
  }, [setHideRight])

  const handleCreate = async () => {
    if (!serverId) return
    try {
      const code = await dispatch(createInviteThunk({
        guildId: serverId,
        data: { maxUses: 10, expiresIn: '7d', expiresInSeconds: 604800 },
      })).unwrap()
      setInviteCode(code)
    } catch {
      // ignore
    }
  }

  const handleCopy = () => {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <header className="top" style={{ display: 'flex', alignItems: 'center', padding: '0 22px', gap: 16 }}>
        <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--fg-0)' }}>
          Пригласить участников
        </div>
      </header>
      <main className="main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="auth-card invite-card" style={{ width: 480 }}>
          <div className="invite-banner" />
          <div className="invite-meta">
            <div className="ic">{server?.name?.charAt(0).toUpperCase() ?? 'N'}</div>
            <div>
              <div className="invite-name">{server?.name ?? 'Сервер'}</div>
              <div className="invite-sub">Создайте ссылку-приглашение</div>
            </div>
          </div>

          {!inviteCode ? (
            <button className="btn-primary-lg" onClick={handleCreate} disabled={loading}>
              {loading ? 'Создание...' : 'Создать приглашение'}
            </button>
          ) : (
            <>
              <div className="invite-detail-grid">
                <div className="invite-detail">
                  <div className="lbl">КОД</div>
                  <div className="val mono">{inviteCode}</div>
                </div>
                <div className="invite-detail">
                  <div className="lbl">ДЕЙСТВУЕТ ДО</div>
                  <div className="val">7 дней</div>
                </div>
                <div className="invite-detail">
                  <div className="lbl">ИСПОЛЬЗОВАНИЙ</div>
                  <div className="val mono">0 / 10</div>
                </div>
                <div className="invite-detail">
                  <div className="lbl">РОЛЬ</div>
                  <div className="val">Member</div>
                </div>
              </div>
              <div className="invite-actions">
                <button className="btn-secondary" onClick={handleCopy}>
                  {copied ? <ICheck /> : <ICopy />}
                  {copied ? 'Скопировано!' : 'Копировать код'}
                </button>
                <button className="btn-primary" onClick={() => navigate(`/servers/${serverId}/channels`)}>
                  Готово <IChevRight />
                </button>
              </div>
            </>
          )}

          <div className="auth-foot" style={{ marginTop: 20 }}>
            <span className="chip mono">invite.api.nextalk.io</span>
          </div>
        </div>
      </main>
    </>
  )
}
