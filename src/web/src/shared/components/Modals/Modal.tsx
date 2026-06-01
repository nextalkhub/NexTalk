import React, { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  danger?: boolean
  width?: number
}

/**
 * Generic modal wrapper. Renders a blurred backdrop, traps Esc, and
 * stops click propagation from the card. Children should contain
 * <div className="modal-head">, <div className="modal-body">, <div className="modal-foot">.
 */
export const Modal: React.FC<ModalProps> = ({ open, onClose, children, danger, width }) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal${danger ? ' modal-danger' : ''}`}
        style={width ? { width } : undefined}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  )
}
