import React, { useRef, useEffect, useState } from 'react'
import { ISend } from '../../../shared/components/Icons/Icons'

interface ComposerProps {
  channelName: string
  onSend: (text: string) => void
  disabled?: boolean
  isConnected?: boolean
}

export const MessageInput: React.FC<ComposerProps> = ({ channelName, onSend, disabled, isConnected = true }) => {
  const [text, setText] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  const isDisabled = disabled || !isConnected

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(200, el.scrollHeight)}px`
  }, [text])

  const handleSend = () => {
    if (!text.trim() || isDisabled) return
    onSend(text.trim())
    setText('')
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="composer-wrap">
      <div className="composer">
        <div className="composer-editor">
          <textarea
            ref={taRef}
            rows={1}
            className="composer-textarea"
            placeholder={isConnected ? `Написать в #${channelName}` : 'Нет соединения...'}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={isDisabled}
          />
          <div className="composer-actions">
            <button
              className="composer-send"
              disabled={!text.trim() || isDisabled}
              onClick={handleSend}
              title="Отправить (⏎)"
            >
              <ISend />
            </button>
          </div>
        </div>
      </div>
      <div className="composer-foot">
        <span>
          <kbd>⏎</kbd> отправить · <kbd>⇧⏎</kbd> новая строка
        </span>
        <span>
          <span className={`chip ${isConnected ? 'is-ok' : ''}`}>
            <span className={`dot ${isConnected ? 'online' : 'offline'}`} />
            {isConnected ? 'подключено' : 'нет связи'}
          </span>
        </span>
      </div>
    </div>
  )
}
