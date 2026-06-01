import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { useVoice } from '../hooks/useVoice'
import type { VoiceParticipant, VoiceReaction } from '../types'

interface VoiceCtx {
  activeChannelId: string | null
  isMuted: boolean
  isDeafened: boolean
  isConnected: boolean
  isLocalSpeaking: boolean
  hasMicrophonePermission: boolean | null
  participants: VoiceParticipant[]
  reactions: VoiceReaction[]
  joinVoice: (channelId: string, user: { id: string; name: string }) => Promise<void>
  leaveVoice: (channelId: string) => Promise<void>
  toggleMic: () => void
  toggleDeafen: () => void
  sendReaction: (emoji: string) => void
}

const VoiceContext = createContext<VoiceCtx>({
  activeChannelId: null,
  isMuted: false,
  isDeafened: false,
  isConnected: false,
  isLocalSpeaking: false,
  hasMicrophonePermission: null,
  participants: [],
  reactions: [],
  joinVoice: async () => {},
  leaveVoice: async () => {},
  toggleMic: () => {},
  toggleDeafen: () => {},
  sendReaction: () => {},
})

export const VoiceSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    joinVoice: joinVoiceBase,
    leaveVoice: leaveVoiceBase,
    ...voiceState
  } = useVoice()

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  // ref for non-stale reads inside callbacks
  const activeChannelIdRef = useRef<string | null>(null)

  const joinVoice = useCallback(async (channelId: string, user: { id: string; name: string }) => {
    // same channel and already connected - skip
    if (activeChannelIdRef.current === channelId) return

    // leave old channel if we were in one
    if (activeChannelIdRef.current) {
      await leaveVoiceBase(activeChannelIdRef.current)
    }

    activeChannelIdRef.current = channelId
    setActiveChannelId(channelId)
    await joinVoiceBase(channelId, user)
  }, [joinVoiceBase, leaveVoiceBase])

  const leaveVoice = useCallback(async (channelId: string) => {
    await leaveVoiceBase(channelId)
    activeChannelIdRef.current = null
    setActiveChannelId(null)
  }, [leaveVoiceBase])

  return (
    <VoiceContext.Provider value={{ ...voiceState, activeChannelId, joinVoice, leaveVoice }}>
      {children}
    </VoiceContext.Provider>
  )
}

export const useVoiceContext = () => useContext(VoiceContext)
