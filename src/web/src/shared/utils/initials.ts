// Initials for avatars. Take first letters of up to two whitespace-separated words.

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const cleaned = name.trim()
  if (!cleaned) return '?'

  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) {
    // одно слово - две буквы из него
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
