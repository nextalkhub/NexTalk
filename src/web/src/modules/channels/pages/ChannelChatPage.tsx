import React, { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TopBar } from '../../../shared/components/Layout/TopBar'
import { MembersSidebar } from '../../../shared/components/Layout/MembersSidebar'
import { MessageList } from '../../chat/components/MessageList'
import { MessageInput } from '../../chat/components/MessageInput'
import { LayoutContext } from '../../../shared/components/Layout/AppShell'
import { useAppDispatch, useAppSelector } from '../../../store'
import { selectUser } from '../../../shared/slices/authSlice'
import { fetchChannels } from '../../../shared/slices/channelSlice'
import { fetchMessages, addOptimisticMessage } from '../../../shared/slices/chatSlice'
import { useSignalR } from '../../../shared/hooks/useSignalR'

export const ChannelChatPage: React.FC = () => {
  const { serverId, channelId } = useParams()
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectUser)
  const channels = useAppSelector(state => state.channels.channels)
  const messages = useAppSelector(state => state.chat.messages)
  const { connection, isConnected } = useSignalR()
  const { setHideRight } = useContext(LayoutContext)
  const [showMembers, setShowMembers] = useState(true)

  useEffect(() => {
    setHideRight(!showMembers)
  }, [showMembers, setHideRight])

  useEffect(() => {
    return () => setHideRight(false)
  }, [setHideRight])

  useEffect(() => {
    if (serverId && serverId !== 'undefined') dispatch(fetchChannels(serverId))
  }, [serverId, dispatch])

  useEffect(() => {
    if (channelId && user) {
      dispatch(fetchMessages({ channelId, userId: user.id }))
    }
  }, [channelId, dispatch, user])

  const currentChannel = channels.find(c => c.id === channelId)
  const channelState = messages[channelId ?? '']
  const currentMessages = channelState?.items ?? []
  const isLoadingMessages = channelState?.loading ?? false

  const handleSend = async (text: string) => {
    if (!connection || !channelId || !user) return
    dispatch(addOptimisticMessage({
      id: `opt_${crypto.randomUUID()}`,
      channelId,
      authorId: user.id,
      authorName: user.name,
      content: text,
      createdAt: new Date().toISOString(),
    }))
    await connection.invoke('SendMessage', channelId, text, crypto.randomUUID())
  }

  if (!channelId || !currentChannel) {
    return (
      <>
        <TopBar showMembers={showMembers} onToggleMembers={() => setShowMembers(v => !v)} />
        <main className="main">
          <div className="empty-state">
            <div className="icon-blob">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h2>Выберите канал</h2>
            <p>Нажмите на текстовый канал в боковой панели, чтобы начать общение.</p>
          </div>
        </main>
        {showMembers && <MembersSidebar />}
      </>
    )
  }

  return (
    <>
      <TopBar showMembers={showMembers} onToggleMembers={() => setShowMembers(v => !v)} />
      <main className="main">
        {isLoadingMessages && currentMessages.length === 0 ? (
          <div className="empty-state">
            <div style={{ color: 'var(--fg-3)', fontSize: 14 }}>Загрузка сообщений…</div>
          </div>
        ) : (
          <MessageList
            messages={currentMessages}
            channelName={currentChannel.name}
            currentUserId={user?.id}
          />
        )}
        <MessageInput
          channelName={currentChannel.name}
          onSend={handleSend}
          isConnected={isConnected}
        />
      </main>
      {showMembers && <MembersSidebar />}
    </>
  )
}
