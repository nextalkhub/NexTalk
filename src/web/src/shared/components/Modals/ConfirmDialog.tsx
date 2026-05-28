import React from 'react'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}) => {
  return (
    <Modal open={open} onClose={onClose} danger={danger}>
      <div className="modal-head">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="modal-foot">
        <button className="btn-cancel" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </button>
        <button
          className={danger ? 'btn-danger' : 'btn-save'}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? '...' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
