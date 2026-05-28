import { createContext, useContext } from 'react'
import type { VoiceParticipant } from '../types'

interface VoiceCtx {
  isMuted: boolean
  isDeafened: boolean
  isConnected: boolean
  isLocalSpeaking: boolean
  hasMicrophonePermission: boolean | null
  participants: VoiceParticipant[]
  joinVoice: (channelId: string, user: { id: string; name: string }) => Promise<void>
  leaveVoice: (channelId: string) => Promise<void>
  toggleMic: () => void
  toggleDeafen: () => void
}

export const VoiceContext = createContext<VoiceCtx>({
  isMuted: false,
  isDeafened: false,
  isConnected: false,
  isLocalSpeaking: false,
  hasMicrophonePermission: null,
  participants: [],
  joinVoice: async () => {},
  leaveVoice: async () => {},
  toggleMic: () => {},
  toggleDeafen: () => {},
})

export const useVoiceContext = () => useContext(VoiceContext)
