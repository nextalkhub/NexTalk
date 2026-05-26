import React, { useRef, useEffect, useState } from 'react'
import { ISend } from '../../../shared/components/Icons/Icons'

interface ComposerProps {
  channelName: string
  onSend: (text: string) => void
  disabled?: boolean
}

export const MessageInput: React.FC<ComposerProps> = ({ channelName, onSend, disabled }) => {
  const [text, setText] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(200, el.scrollHeight)}px`
  }, [text])

  const handleSend = () => {
    if (!text.trim() || disabled) return
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
            placeholder={`Написать в #${channelName}`}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
          />
          <div className="composer-actions">
            <button
              className="composer-send"
              disabled={!text.trim() || !!disabled}
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
          <span className="chip is-ok">
            <span className="dot online" />подключено
          </span>
        </span>
      </div>
    </div>
  )
}
