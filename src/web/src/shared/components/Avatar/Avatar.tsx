import React from 'react'
import { getInitials } from '../../utils/initials'

function strToHue(str: string): number {
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return h % 360
}

// eslint-disable-next-line react-refresh/only-export-components
export function avatarBg(strOrHue: string | number): string {
  const hue = typeof strOrHue === 'number' ? strOrHue : strToHue(strOrHue)
  return `linear-gradient(135deg, oklch(0.62 0.16 ${hue}), oklch(0.48 0.18 ${(hue + 40) % 360}))`
}

interface AvatarProps {
  /** Source string for both background colour and initials (usually display name). */
  str: string
  /** Override the initials if you have a better source (e.g. JWT preferred_username). */
  initialsFrom?: string
  size?: number
  className?: string
}

export const Avatar: React.FC<AvatarProps> = ({ str, initialsFrom, size = 40, className }) => {
  const initials = getInitials(initialsFrom ?? str)
  // Scale font with avatar size, but cap so 2 letters fit in tiny avatars.
  const baseScale = initials.length > 1 ? 0.36 : 0.42
  return (
    <span
      className={`av${className ? ` ${className}` : ''}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        background: avatarBg(str),
        fontSize: Math.round(size * baseScale),
      }}
    >
      {initials}
    </span>
  )
}
