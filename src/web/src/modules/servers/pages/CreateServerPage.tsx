import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../shared/components/Button/Button'
import { Input } from '../../../shared/components/Input/Input'
import { GradientBackground } from '../../../shared/components/GradientBackground/GradientBackground'
import { Icon } from '../../../shared/components/Icon/Icon'
import styles from './CreateServerPage.module.scss'
import {createServer} from "../../../shared/slices/serverSlice.ts";
import {useAppDispatch} from "../../../store.ts";
import {useSignalR} from "../../../shared/hooks/useSignalR.ts";

export const CreateServerPage: React.FC = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const dispatch = useAppDispatch()
  const { connection } = useSignalR()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)

    try {
      const guild = await dispatch(createServer({ name, displayName })).unwrap()

      // Создатель уже member на бэке, но ChatHub узнал о гильдии только на старте
      // соединения. JoinGuildGroup подписывает текущий connection до того, как
      // прилетит первый channel.created / member.joined.
      if (connection && guild?.id) {
        await connection.invoke('JoinGuildGroup', guild.id).catch(() => {})
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      navigate('/servers')
    }
  }

  return (
      <GradientBackground>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.backLink} onClick={() => navigate('/servers')}>
              <Icon name="arrow-left" size={16} />
              Назад к серверам
            </div>

            <div className={styles.title}>Создать сервер</div>

            <form onSubmit={handleSubmit}>
              <Input
                  label="Название сервера"
                  placeholder="Например: Game Night"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={styles.input}
              />

              <Input
                  label="Отображаемое название сервера"
                  placeholder="Например: game1"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={styles.input}
              />

              <div className={styles.buttons}>
                <Button type="button" variant="secondary" onClick={() => navigate('/servers')} fullWidth>
                  Отмена
                </Button>
                <Button type="submit" variant="primary" fullWidth disabled={loading}>
                  {loading ? 'Создание...' : 'Создать сервер'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </GradientBackground>
  )
}