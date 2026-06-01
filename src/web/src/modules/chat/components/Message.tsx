import React from 'react'
import { Avatar } from '../../../shared/components/Avatar/Avatar'
import { ITrash } from '../../../shared/components/Icons/Icons'
import { formatTime } from '../../../shared/utils/format'
import type { MessageInterface } from '../../../shared/slices/chatSlice'

interface MessageProps {
  msg: MessageInterface
  isFirst: boolean
  isNew?: boolean
  canDelete: boolean
  role?: 'Owner' | 'Admin' | 'Member'
  onDelete: (id: string) => void
}

const ROLE_COLOR: Record<string, string> = {
  Owner: 'var(--warn)',
  Admin: 'var(--brand-2)',
}

export const Message: React.FC<MessageProps> = ({ msg, isFirst, isNew, canDelete, role, onDelete }) => {
  const lines = msg.content.split('\n')
  const stableName = msg.authorName || msg.authorId
  const nameColor = role ? ROLE_COLOR[role] : undefined

  return (
    <div className={`msg${isFirst ? ' is-first' : ''}${isNew ? ' is-new' : ''}`}>
      <div className="msg-gutter">
        {isFirst
          ? <Avatar str={stableName} size={40} className="msg-avatar" />
          : <span className="msg-time-hover">{formatTime(msg.createdAt)}</span>
        }
      </div>
      <div className="msg-body">
        {isFirst && (
          <div className="msg-head">
            <span className="msg-author" style={nameColor ? { color: nameColor } : undefined}>{msg.authorName}</span>
            {role && role !== 'Member' && (
              <span className={`msg-role-badge ${role.toLowerCase()}`}>{role.toUpperCase()}</span>
            )}
            <span className="msg-stamp">{formatTime(msg.createdAt)}</span>
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
