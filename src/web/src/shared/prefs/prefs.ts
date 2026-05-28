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

const THEME_VARS: Record<ThemeId, Record<string, string>> = {
  nextalk: {
    '--bg-0': '#06070D', '--bg-1': '#0B0D17', '--bg-2': '#10121E',
    '--bg-3': '#161927', '--bg-4': '#1D2134', '--bg-5': '#262B41',
    '--brand-1': '#4F7CFF', '--brand-2': '#9061FF', '--brand-3': '#C254FF',
    '--brand-1-rgb': '79,124,255', '--brand-2-rgb': '144,97,255', '--brand-3-rgb': '194,84,255',
    '--grad-brand': 'linear-gradient(135deg,#4F7CFF,#9061FF 60%,#C254FF)',
  },
  midnight: {
    '--bg-0': '#030408', '--bg-1': '#080B12', '--bg-2': '#0D1020',
    '--bg-3': '#12162A', '--bg-4': '#181D35', '--bg-5': '#1E243E',
    '--brand-1': '#7C9AFF', '--brand-2': '#A78BFA', '--brand-3': '#E879F9',
    '--brand-1-rgb': '124,154,255', '--brand-2-rgb': '167,139,250', '--brand-3-rgb': '232,121,249',
    '--grad-brand': 'linear-gradient(135deg,#7C9AFF,#A78BFA 60%,#E879F9)',
  },
  emerald: {
    '--bg-0': '#030A07', '--bg-1': '#081410', '--bg-2': '#0D1D17',
    '--bg-3': '#10251C', '--bg-4': '#162E24', '--bg-5': '#1C3829',
    '--brand-1': '#10B981', '--brand-2': '#22D3EE', '--brand-3': '#6EE7B7',
    '--brand-1-rgb': '16,185,129', '--brand-2-rgb': '34,211,238', '--brand-3-rgb': '110,231,183',
    '--grad-brand': 'linear-gradient(135deg,#10B981,#22D3EE)',
  },
  graphite: {
    '--bg-0': '#0A0A0B', '--bg-1': '#111113', '--bg-2': '#18181B',
    '--bg-3': '#1F1F22', '--bg-4': '#27272A', '--bg-5': '#303034',
    '--brand-1': '#A1A1AA', '--brand-2': '#D4D4D8', '--brand-3': '#F4F4F5',
    '--brand-1-rgb': '161,161,170', '--brand-2-rgb': '212,212,216', '--brand-3-rgb': '244,244,245',
    '--grad-brand': 'linear-gradient(135deg,#71717A,#A1A1AA 60%,#D4D4D8)',
  },
}

export function applyPrefs(p: Prefs): void {
  const root = document.documentElement
  root.dataset.theme = p.theme
  root.dataset.density = p.density
  root.style.setProperty('font-size', `${Math.round(14 * p.fontScale)}px`)
  const vars = THEME_VARS[p.theme]
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
}

export const PALETTES: { id: ThemeId; label: string; desc: string; gradient: string }[] = [
  { id: 'nextalk',  label: 'NexTalk',  desc: 'Фирменный сине-фиолетовый', gradient: 'linear-gradient(135deg, #4F7CFF 0%, #9061FF 60%, #C254FF 100%)' },
  { id: 'midnight', label: 'Midnight', desc: 'Более контрастная тёмная',  gradient: 'linear-gradient(135deg, #7C9AFF 0%, #A78BFA 60%, #E879F9 100%)' },
  { id: 'emerald',  label: 'Emerald',  desc: 'Зелёная',                   gradient: 'linear-gradient(135deg, #10B981 0%, #22D3EE 100%)' },
  { id: 'graphite', label: 'Graphite', desc: 'Монохромная',               gradient: 'linear-gradient(135deg, #F4F5F7 0%, #9CA3AF 100%)' },
]
