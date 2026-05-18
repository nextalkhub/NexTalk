import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../../shared/components/Button/Button'
import { GradientBackground } from '../../../shared/components/GradientBackground/GradientBackground'
import { Icon } from '../../../shared/components/Icon/Icon'
import styles from './InvitePage.module.scss'
import {useAppDispatch, useAppSelector} from "../../../store.ts";
import {createInviteThunk} from "../../../shared/slices/inviteSlice.ts";

export const InvitePage: React.FC = () => {
  const navigate = useNavigate()
  const { serverId } = useParams()
  const dispatch = useAppDispatch()

  const loading = useAppSelector(state => state.invite.loading)

  const [copied, setCopied] = useState(false)
  const [inviteCode, setInviteCode] = useState('')

  const handleCreate = async () => {
    if (!serverId) return

    try {
      const code = await dispatch(
          createInviteThunk({
            guildId: serverId,
            data: {
              maxUses: 10,
              expiresIn: '7d',
              expiresInSeconds: 60 * 60 * 24 * 7,
            },
          })
      ).unwrap()

      setInviteCode(code)

    } catch (e) {
      console.error('Ошибка создания инвайта', e)
    }
  }

  const handleCopy = () => {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
      <GradientBackground>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.serverIcon}>
              <Icon name="server-default" size={48} />
            </div>

            <div className={styles.serverName}>Invite</div>

            {!inviteCode ? (
                <Button onClick={handleCreate} disabled={loading}>
                  {loading ? 'Создание...' : 'Создать инвайт'}
                </Button>
            ) : (
                <>
                  <div className={styles.inviteLink}>
                    <input
                        type="text"
                        value={inviteCode}
                        readOnly
                        className={styles.linkInput}
                    />
                    <Button onClick={handleCopy} size="small">
                      {copied ? 'Скопировано' : 'Копировать'}
                    </Button>
                  </div>

                  <div className={styles.settings}>
                    <div className={styles.settingItem}>
                      <span className={styles.settingLabel}>Срок действия</span>
                      <span className={styles.settingValue}>7 дней</span>
                    </div>
                    <div className={styles.settingItem}>
                      <span className={styles.settingLabel}>Макс. использований</span>
                      <span className={styles.settingValue}>10</span>
                    </div>
                  </div>
                </>
            )}

            <Button
                variant="primary"
                onClick={() => navigate(`/servers/${serverId}/channels`)}
                fullWidth
            >
              Готово
            </Button>
          </div>
        </div>
      </GradientBackground>
  )
}