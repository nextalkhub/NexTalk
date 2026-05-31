import React, { useMemo } from 'react'
import { Message } from './Message'
import { useAppDispatch, useAppSelector } from '../../../store'
import { deleteMessage } from '../../../shared/slices/chatSlice'
import { selectUser } from '../../../shared/slices/authSlice'
import { formatRelativeDay, isSameDay } from '../../../shared/utils/format'
import type { MessageInterface } from '../../../shared/slices/chatSlice'

interface MessageListProps {
  messages: MessageInterface[]
  channelName: string
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  scrollRef: React.RefObject<HTMLDivElement>
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  channelName,
  isLoading,
  hasMore,
  onLoadMore,
  scrollRef,
}) => {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectUser)
  const guildOwnerId = useAppSelector(state => state.servers.currentServer?.ownerId)
  const currentGuildId = useAppSelector(state => state.servers.currentServer?.id)
  const members = useAppSelector(
    state => state.members.members[currentGuildId ?? ''] ?? []
  )

  const sorted = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [messages]
  )

  const currentUserRole = useMemo(() => {
    if (!user) return 'Member'
    if (user.id === guildOwnerId) return 'Owner'
    return members.find(m => m.userId === user.id)?.role ?? 'Member'
  }, [user, guildOwnerId, members])

  const handleDelete = (id: string) => {
    const msg = sorted.find(m => m.id === id)
    if (msg) dispatch(deleteMessage({ channelId: msg.channelId, messageId: id }))
  }

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollTop < 80 && hasMore && !isLoading) onLoadMore()
  }

  const isEmpty = sorted.length === 0

  return (
    <div className="chat-scroll" ref={scrollRef} onScroll={onScroll}>
      <div className="chat-scroll-inner">
        {/* Only show the friendly welcome banner at the very top of the
            channel history. Once there are messages above it (older pages
            loaded), the empty-channel framing is no longer accurate. */}
        {!hasMore && (
          <div className="chat-welcome">
            <div className="wlc-icon">#</div>
            <h2>Это начало канала #{channelName}</h2>
            <p>
              {isEmpty
                ? 'Сообщений еще нет. Напишите первым - Enter отправляет, Shift+Enter переносит строку.'
                : 'Прокручивайте вниз, чтобы читать историю. Новые сообщения появятся сами.'}
            </p>
          </div>
        )}

        {hasMore && (
          <div className="load-more-row">
            {isLoading
              ? <span className="load-more-spinner" />
              : <button className="load-more-btn" onClick={onLoadMore}>Загрузить ранее</button>}
          </div>
        )}

        {sorted.map((msg, i, arr) => {
          const prev = arr[i - 1]
          const isFirst = !prev || prev.authorId !== msg.authorId ||
            // Always break grouping on day boundary so the time stamp is fresh
            (prev && !isSameDay(prev.createdAt, msg.createdAt))
          const showDayDivider = !prev || !isSameDay(prev.createdAt, msg.createdAt)
          const canDelete =
            !!user && (msg.authorId === user.id ||
                       currentUserRole === 'Owner' ||
                       currentUserRole === 'Admin')

          const authorMember = members.find(m => m.userId === msg.authorId)
          const authorRole = authorMember?.role as 'Owner' | 'Admin' | 'Member' | undefined

          return (
            <React.Fragment key={msg.id}>
              {showDayDivider && (
                <div className="day-divider">
                  <div className="line" />
                  <div className="label">{formatRelativeDay(msg.createdAt)}</div>
                  <div className="line" />
                </div>
              )}
              <Message
                msg={msg}
                isFirst={isFirst}
                canDelete={canDelete}
                role={authorRole}
                onDelete={handleDelete}
              />
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
