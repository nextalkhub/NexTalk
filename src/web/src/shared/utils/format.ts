// Plural and date formatting helpers.
// Russian plural rules: 1 → one, 2-4 → few, 5+ → many (with exceptions 11-14).

export function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${few}`
  return `${n} ${many}`
}

export const pluralMembers   = (n: number) => pluralize(n, 'участник',   'участника',   'участников')
export const pluralOnline    = (n: number) => pluralize(n, 'онлайн',     'онлайн',      'онлайн')
export const pluralMessages  = (n: number) => pluralize(n, 'сообщение',  'сообщения',   'сообщений')

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** "сегодня", "вчера", "25 мая", "3 апреля 2025". */
export function formatRelativeDay(iso: string): string {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const day = startOfDay(date)
  const today = startOfDay(now)
  const oneDay = 86_400_000

  if (day === today)        return 'сегодня'
  if (day === today - oneDay) return 'вчера'

  const sameYear = date.getFullYear() === now.getFullYear()
  return sameYear
    ? `${date.getDate()} ${MONTHS[date.getMonth()]}`
    : `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

/** "14:32". */
export function formatTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

/** Whether two ISO timestamps fall on the same calendar day. */
export function isSameDay(aIso: string, bIso: string): boolean {
  const a = new Date(aIso)
  const b = new Date(bIso)
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return false
  return startOfDay(a) === startOfDay(b)
}

/** Full URL for an invite code, suitable for sharing. */
export function inviteUrl(code: string): string {
  if (typeof window === 'undefined') return `/invite/${code}`
  return `${window.location.origin}/invite/${code}`
}

/** Relative-time string for "5 мин назад" style labels. */
export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime()
  if (isNaN(d)) return ''
  const diff = Math.floor((Date.now() - d) / 1000)
  if (diff < 60)     return 'только что'
  if (diff < 3600)   return pluralize(Math.floor(diff / 60),   'минуту',  'минуты',  'минут') + ' назад'
  if (diff < 86400)  return pluralize(Math.floor(diff / 3600), 'час',     'часа',    'часов') + ' назад'
  if (diff < 604800) return pluralize(Math.floor(diff / 86400), 'день',   'дня',     'дней')  + ' назад'
  return formatRelativeDay(iso)
}
