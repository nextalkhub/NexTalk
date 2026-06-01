import React from 'react'
import { IMenu } from '../Icons/Icons'

interface Props {
  onClick: () => void
}

export const MobileMenuButton: React.FC<Props> = ({ onClick }) => (
  <button
    className="icon-btn mobile-menu-btn"
    onClick={onClick}
    aria-label="Открыть меню"
    style={{ minWidth: 44, minHeight: 44 }}
  >
    <IMenu />
  </button>
)
