import { useState } from 'react'
import { useWebRTC } from "./useWerbRtc.ts"
import { joinVoiceChannel } from "../../processes/voice/joinVoiceChannel.ts"
import { leaveVoiceChannel } from "../../processes/voice/leaveVoiceChannel.ts"
import { getVoiceChannelParticipants } from "../../processes/voice/getVoiceChannelParticipants.ts"
import {VoiceParticipant} from "../types";

export const useVoice = () => {
    const webrtc = useWebRTC({
        signalingServerUrl: import.meta.env.VITE_LIVEKIT_URL || 'http://localhost:3000/livekit',
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
        ]
    })

    // ===== REAL STATE =====
    const [participants, setParticipants] = useState<VoiceParticipant[]>([])

    // ===== JOIN =====
    const joinVoice = async (
        channelId: string,
        user: { id: string; name: string }
    ) => {

        // 1. JOIN API
        await joinVoiceChannel(channelId, {
            userId: user.id,
            username: user.name,
            displayName: user.name,
        })

        // 2. GET PARTICIPANTS
        const users = await getVoiceChannelParticipants(channelId)

        setParticipants(
            users.map(u => ({
                userId: u.userId,
                username: u.username,
                displayName: u.displayName,
                joinedAt: u.joinedAt,
                avatar: u.username[0].toUpperCase(),
                isSpeaking: false,
                isMuted: false,
                isDeafened: false,
            }))
        )

        // 3. WEBRTC
        await webrtc.joinRoom(channelId, user.name)
        await webrtc.startVoice()
    }

    // ===== LEAVE =====
    const leaveVoice = async (channelId: string, userId?: string) => {
        await leaveVoiceChannel(channelId, userId || '')
        webrtc.stopVoice()
        setParticipants([])
    }

    // ===== MIC =====
    const toggleMic = () => {
        webrtc.toggleMic()
    }

    return {
        isConnected: webrtc.connectionStatus === 'connected',
        isMuted: webrtc.isMuted,
        participants,

        joinVoice,
        leaveVoice,
        toggleMic,
    }
}