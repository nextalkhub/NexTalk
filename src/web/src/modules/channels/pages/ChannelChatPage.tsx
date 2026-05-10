import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MessageList } from '../../chat/components/MessageList'
import { MessageInput } from '../../chat/components/MessageInput'
import { ServerSidebar } from '../../../shared/components/Layout/ServerSidebar'
import { ChannelSidebar } from '../components/ChannelSidebar'
import { MembersSidebar } from '../../../shared/components/Layout/MembersSidebar'
import { Button } from '../../../shared/components/Button/Button'
import { Icon } from '../../../shared/components/Icon/Icon'
import styles from './ChannelChatPage.module.scss'
import {useAppDispatch, useAppSelector} from "../../../store.ts";
import {selectUser} from "../../../shared/slices/authSlice.ts";
import {fetchChannels} from "../../../shared/slices/channelSlice.ts";
import {fetchMessages, sendMessage} from "../../../shared/slices/chatSlice.ts";

export const ChannelChatPage: React.FC = () => {
    const { serverId, channelId } = useParams()
    const navigate = useNavigate()
    const user = useAppSelector(selectUser)
    const dispatch = useAppDispatch()
    const channels = useAppSelector(state => state.channels.channels)
    const messages = useAppSelector(state => state.chat.messages)

    useEffect(() => {
        if (serverId) dispatch(fetchChannels(serverId))
    }, [serverId, dispatch])

    useEffect(() => {
        if (channelId) dispatch(fetchMessages(channelId))
    }, [channelId, dispatch])

    const currentMessages = messages[channelId || ''] || []
    const currentChannel = channels.find(c => c.id === channelId)

    const handleSend = (text: string) => {
        if (!user || !channelId) return

        dispatch(sendMessage({
            id: Date.now().toString(),
            channelId,
            authorId: user.id,
            authorName: user.name,
            content: text,
            createdAt: new Date().toISOString()
        }))
    }

    const handleInvite = () => {
        if (serverId) {
            navigate(`/servers/${serverId}/invite`)
        }
    }

    if (!serverId) {
        return (
            <div className={styles.layout}>
                <ServerSidebar />
                <div className={styles.chatArea}>
                    <div className={styles.loading}>Загрузка...</div>
                </div>
            </div>
        )
    }

    if (!currentChannel || channels.length === 0) {
        return (
            <div className={styles.layout}>
                <ServerSidebar />
                <ChannelSidebar />
                <div className={styles.chatArea}>
                    <div className={styles.notFound}>
                        <Icon name="message" size={48} />
                        <p>Выберите канал</p>
                        <Button variant="secondary" onClick={() => navigate('./../..')}>
                            Вернуться назад
                        </Button>
                    </div>
                </div>
                <MembersSidebar />
            </div>
        )
    }

    return (
        <div className={styles.layout}>
            <ServerSidebar />
            <ChannelSidebar />

            <div className={styles.chatArea}>
                <div className={styles.header}>
                    <div className={styles.title}>
                        <Icon name="hash" size={20} />
                        <span>{currentChannel.name}</span>
                    </div>
                    <Button
                        variant="secondary"
                        size="small"
                        onClick={handleInvite}
                    >
                        <Icon name="plus" size={14} />
                        Пригласить
                    </Button>
                </div>

                <MessageList messages={currentMessages} />

                <div className={styles.inputArea}>
                    <MessageInput
                        onSend={handleSend}
                        placeholder={`Сообщение в #${currentChannel.name}`}
                    />
                </div>
            </div>

            <MembersSidebar />
        </div>
    )
}