import React from 'react'

function strToHue(str: string): number {
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return h % 360
}

export function avatarBg(strOrHue: string | number): string {
  const hue = typeof strOrHue === 'number' ? strOrHue : strToHue(strOrHue)
  return `linear-gradient(135deg, oklch(0.62 0.16 ${hue}), oklch(0.48 0.18 ${(hue + 40) % 360}))`
}

interface AvatarProps {
  str: string
  size?: number
  className?: string
}

export const Avatar: React.FC<AvatarProps> = ({ str, size = 40, className }) => {
  const letter = str.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      className={`av${className ? ` ${className}` : ''}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        background: avatarBg(str),
        fontSize: Math.round(size * 0.375),
      }}
    >
      {letter}
    </span>
  )
}
