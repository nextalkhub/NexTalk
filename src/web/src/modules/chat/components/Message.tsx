import React from 'react'
import { Avatar } from '../../../shared/components/Avatar/Avatar'
import { ITrash } from '../../../shared/components/Icons/Icons'
import type { MessageInterface } from '../../../shared/slices/chatSlice'

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

interface MessageProps {
  msg: MessageInterface
  isFirst: boolean
  isNew?: boolean
  canDelete: boolean
  onDelete: (id: string) => void
}

export const Message: React.FC<MessageProps> = ({ msg, isFirst, isNew, canDelete, onDelete }) => {
  const lines = msg.content.split('\n')

  return (
    <div className={`msg${isFirst ? ' is-first' : ''}${isNew ? ' is-new' : ''}`}>
      <div className="msg-gutter">
        {isFirst
          ? <Avatar str={msg.authorName || msg.authorId} size={40} className="msg-avatar" />
          : <span className="msg-time-hover">{fmtTime(msg.createdAt)}</span>
        }
      </div>
      <div className="msg-body">
        {isFirst && (
          <div className="msg-head">
            <span className="msg-author">{msg.authorName}</span>
            <span className="msg-stamp">сегодня в {fmtTime(msg.createdAt)}</span>
          </div>
        )}
        <div className="msg-text">
          {lines.map((line, i) => (
            <React.Fragment key={i}>
              {i > 0 && <br />}{line}
            </React.Fragment>
          ))}
        </div>
      </div>
      {canDelete && (
        <div className="msg-actions">
          <button
            title="Удалить сообщение"
            className="is-danger"
            onClick={() => onDelete(msg.id)}
          >
            <ITrash />
          </button>
        </div>
      )}
    </div>
  )
}
