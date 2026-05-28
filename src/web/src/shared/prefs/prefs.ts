// Centralised client preferences. Used by main.tsx (apply before React mounts to
// avoid a flash of default theme) and by AppSettingsPage (interactive editor).
//
// Backend doesn't know about these — they're purely cosmetic and audio-routing.

export type ThemeId = 'nextalk' | 'midnight' | 'emerald' | 'graphite'
export type Density = 'cozy' | 'comfortable' | 'airy'

export interface Prefs {
  theme: ThemeId
  density: Density
  fontScale: number
  echoCancellation: boolean
  noiseSuppression: boolean
  pushToTalk: boolean
  desktopNotifications: boolean
  newMessageSound: boolean
}

export const DEFAULTS: Prefs = {
  theme: 'nextalk',
  density: 'comfortable',
  fontScale: 1,
  echoCancellation: true,
  noiseSuppression: true,
  pushToTalk: false,
  desktopNotifications: true,
  newMessageSound: false,
}

const PREFS_KEY = 'nextalk-prefs'

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

export function savePrefs(p: Prefs): void {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)) } catch { /* ignore */ }
}

export function applyPrefs(p: Prefs): void {
  const root = document.documentElement
  root.dataset.theme = p.theme
  root.dataset.density = p.density
  root.style.setProperty('font-size', `${Math.round(14 * p.fontScale)}px`)
}

export const PALETTES: { id: ThemeId; label: string; desc: string; gradient: string }[] = [
  { id: 'nextalk',  label: 'NexTalk',  desc: 'Фирменный сине-фиолетовый', gradient: 'linear-gradient(135deg, #4F7CFF 0%, #9061FF 60%, #C254FF 100%)' },
  { id: 'midnight', label: 'Midnight', desc: 'Более контрастная тёмная',  gradient: 'linear-gradient(135deg, #7C9AFF 0%, #A78BFA 60%, #E879F9 100%)' },
  { id: 'emerald',  label: 'Emerald',  desc: 'Зелёная',                   gradient: 'linear-gradient(135deg, #10B981 0%, #22D3EE 100%)' },
  { id: 'graphite', label: 'Graphite', desc: 'Монохромная',               gradient: 'linear-gradient(135deg, #F4F5F7 0%, #9CA3AF 100%)' },
]
