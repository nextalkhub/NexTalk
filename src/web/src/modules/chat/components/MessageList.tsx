import React, { useRef, useEffect } from 'react'
import { Message } from './Message'
import { useAppDispatch, useAppSelector } from '../../../store'
import { deleteMessage } from '../../../shared/slices/chatSlice'
import { selectUser } from '../../../shared/slices/authSlice'
import type { MessageInterface } from '../../../shared/slices/chatSlice'

interface MessageListProps {
  messages: MessageInterface[]
  channelName: string
  currentUserId?: string
}

export const MessageList: React.FC<MessageListProps> = ({ messages, channelName, currentUserId: _ }) => {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectUser)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastIdRef = useRef<string | undefined>(undefined)

  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // Скроллим вниз только когда появляется новое сообщение снизу,
  // но не когда старые подгружаются сверху (пагинация).
  useEffect(() => {
    const last = sorted[sorted.length - 1]
    if (!last || last.id === lastIdRef.current) return
    lastIdRef.current = last.id
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [sorted])

  const handleDelete = (id: string) => {
    const msg = sorted.find(m => m.id === id)
    if (msg) dispatch(deleteMessage({ channelId: msg.channelId, messageId: id }))
  }

  return (
    <div className="chat-scroll" ref={scrollRef}>
      <div className="chat-scroll-inner">
        <div className="chat-welcome">
          <div className="wlc-icon">#</div>
          <h2>Добро пожаловать в #{channelName}</h2>
          <p>Это начало канала. Сообщения хранятся в Messaging Service · cursor-based история, доставка через SignalR.</p>
        </div>

        <div className="day-divider">
          <div className="line" />
          <div className="label">сегодня</div>
          <div className="line" />
        </div>

        {sorted.map((msg, i, arr) => {
          const isFirst = i === 0 || arr[i - 1].authorId !== msg.authorId
          const canDelete = !!(user && msg.authorId === user.id)
          return (
            <Message
              key={msg.id}
              msg={msg}
              isFirst={isFirst}
              canDelete={canDelete}
              onDelete={handleDelete}
            />
          )
        })}
      </div>
    </div>
  )
}
