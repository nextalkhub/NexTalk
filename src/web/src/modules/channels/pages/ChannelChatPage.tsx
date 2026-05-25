import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MessageList } from '../../chat/components/MessageList'
import { MessageInput } from '../../chat/components/MessageInput'
import { ServerSidebar } from '../../../shared/components/Layout/ServerSidebar'
import { ChannelSidebar } from '../components/ChannelSidebar'
import { TopBar } from '../components/TopBar'
import { RightRail } from '../components/RightRail'
import { Icon } from '../../../shared/components/Icon/Icon'
import styles from './ChannelChatPage.module.scss'
import { useAppDispatch, useAppSelector } from '../../../store'
import { selectUser } from '../../../shared/slices/authSlice'
import { fetchChannels } from '../../../shared/slices/channelSlice'
import { fetchMessages, MessageInterface } from '../../../shared/slices/chatSlice'
import { useSignalR } from '../../../shared/hooks/useSignalR'

type RightView = 'members' | 'thread' | 'pinned' | 'search' | 'inbox'

export const ChannelChatPage: React.FC = () => {
    const { serverId, channelId } = useParams()
    const dispatch = useAppDispatch()
    const user = useAppSelector(selectUser)
    const channels = useAppSelector(state => state.channels.channels)
    const messages = useAppSelector(state => state.chat.messages)
    const { connection } = useSignalR()

    const [rightView, setRightView] = useState<RightView>('members')
    const [showRight, setShowRight] = useState(true)
    const [replyTo, setReplyTo] = useState<MessageInterface | null>(null)

    useEffect(() => {
        if (serverId) dispatch(fetchChannels(serverId))
    }, [serverId, dispatch])

    useEffect(() => {
        if (channelId && user) {
            dispatch(fetchMessages({ channelId, userId: user.id }))
        }
    }, [channelId, dispatch, user])

    const currentMessages = messages[channelId ?? '']?.items ?? []
    const currentChannel = channels.find(c => c.id === channelId) ?? null

    const handleSend = async (text: string) => {
        if (!connection || !channelId || !user) return
        await connection.invoke('SendMessage', channelId, text, crypto.randomUUID())
    }

    const handleRightView = (view: RightView) => {
        if (showRight && rightView === view) {
            setShowRight(false)
        } else {
            setRightView(view)
            setShowRight(true)
        }
    }

    return (
        <div className={`${styles.layout} ${showRight ? '' : styles.noRight}`}>
            <div className={styles.rail}>
                <ServerSidebar />
            </div>

            <div className={styles.side}>
                <ChannelSidebar />
            </div>

            <div className={styles.top}>
                <TopBar
                    channel={currentChannel}
                    rightView={showRight ? rightView : null}
                    onRightView={handleRightView}
                />
            </div>

            <div className={styles.main}>
                {!currentChannel ? (
                    <div className={styles.empty}>
                        <Icon name="message" size={48} />
                        <p>Выберите канал</p>
                    </div>
                ) : (
                    <>
                        <MessageList
                            messages={currentMessages}
                            currentUserId={user?.id}
                            onReply={setReplyTo}
                        />
                        <MessageInput
                            onSend={handleSend}
                            placeholder={`Сообщение в #${currentChannel.name}`}
                            replyTo={replyTo}
                            onCancelReply={() => setReplyTo(null)}
                        />
                    </>
                )}
            </div>

            {showRight && (
                <div className={styles.right}>
                    <RightRail
                        view={rightView}
                        onView={setRightView}
                        channelId={channelId ?? ''}
                        messages={currentMessages}
                    />
                </div>
            )}
        </div>
    )
}
