import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../../../shared/components/Button/Button'
import { Input } from '../../../shared/components/Input/Input'
import { Icon } from '../../../shared/components/Icon/Icon'
import styles from './CreateChannelModal.module.scss'
import { createChannel } from '../../../shared/slices/channelSlice.ts'
import { useAppDispatch } from '../../../store'

interface CreateChannelModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
                                                                          isOpen,
                                                                          onClose,
                                                                          onSuccess
                                                                      }) => {
    const { serverId } = useParams()
    const [name, setName] = useState('')
    const [type, setType] = useState<'text' | 'voice'>('text')
    const [loading, setLoading] = useState(false)

    const dispatch = useAppDispatch()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !serverId) return

        setLoading(true)

        const formattedName = name.toLowerCase().replace(/\s/g, '-')

        await dispatch(createChannel({
            serverId,
            name: formattedName,
            type
        }))

        setLoading(false)

        setName('')
        setType('text')
        onSuccess?.()
        onClose()
    }

    if (!isOpen) return null

    return (
        <>
            <div className={styles.overlay} onClick={onClose} />
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div className={styles.title}>Создать канал</div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <Icon name="close" size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.typeSelector}>
                        <button
                            type="button"
                            onClick={() => setType('text')}
                            className={`${styles.typeOption} ${type === 'text' ? styles.active : ''}`}
                        >
                            <div className={styles.typeIcon}>
                                <Icon name="hash" size={24} />
                            </div>
                            <div className={styles.typeLabel}>Текстовый</div>
                            <div className={styles.typeDesc}>Для сообщений и обсуждений</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('voice')}
                            className={`${styles.typeOption} ${type === 'voice' ? styles.active : ''}`}
                        >
                            <div className={styles.typeIcon}>
                                <Icon name="voice" size={24} />
                            </div>
                            <div className={styles.typeLabel}>Голосовой</div>
                            <div className={styles.typeDesc}>Для голосовых разговоров</div>
                        </button>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>
                            Название канала
                            <span className={styles.required}>*</span>
                        </label>
                        <div className={styles.inputWrapper}>
              <span className={styles.inputPrefix}>
                {type === 'text' ? '#' : <Icon name="voice" size={18} />}
              </span>
                            <Input
                                placeholder="например: general"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={styles.input}
                                autoFocus
                            />
                        </div>
                        <div className={styles.hint}>
                            {type === 'text'
                                ? 'Название может содержать буквы, цифры и дефисы'
                                : 'Участники смогут заходить и выходить из голосового канала'}
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Отмена
                        </Button>
                        <Button type="submit" variant="primary" disabled={!name.trim() || loading}>
                            {loading ? 'Создание...' : 'Создать канал'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    )
}