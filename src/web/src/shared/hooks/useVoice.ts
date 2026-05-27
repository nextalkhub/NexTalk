import { useCallback, useRef, useState } from 'react'
import {
    Participant,
    Room,
    RoomEvent,
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    Track,
} from 'livekit-client'

import { joinVoiceChannel } from '../../processes/voice/joinVoiceChannel'
import { leaveVoiceChannel } from '../../processes/voice/leaveVoiceChannel'
import { VoiceParticipant } from '../types'

export const useVoice = () => {
    const roomRef = useRef<Room | null>(null)
    const connectingRef = useRef(false)
    const speakingIdsRef = useRef<Set<string>>(new Set())
    const audioCleanups = useRef<Map<string, () => void>>(new Map())

    const [participants, setParticipants] = useState<VoiceParticipant[]>([])
    const [isConnected, setIsConnected] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [isLocalSpeaking, setIsLocalSpeaking] = useState(false)
    const [hasMicrophonePermission, setHasMicrophonePermission] = useState<boolean | null>(null)

    const checkMicrophonePermission = useCallback(async (): Promise<boolean> => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            stream.getTracks().forEach(track => track.stop())
            setHasMicrophonePermission(true)
            return true
        } catch (err) {
            console.error('Microphone permission denied:', err)
            setHasMicrophonePermission(false)
            return false
        }
    }, [])

    const cleanupAudio = useCallback(() => {
        audioCleanups.current.forEach(fn => fn())
        audioCleanups.current.clear()
    }, [])

    const syncParticipants = useCallback(() => {
        const room = roomRef.current
        if (!room) return

        const list = Array.from(
            room.remoteParticipants.values()
        ).map((p: RemoteParticipant) => ({
            userId: p.identity,
            username: p.name || p.identity,
            isMuted: !p.isMicrophoneEnabled,
            isDeafened: false,
            isSpeaking: speakingIdsRef.current.has(p.identity),
        }))

        setParticipants(list)
    }, [])

    const attachAudioTrack = (track: RemoteTrack, trackSid: string) => {
        if (track.kind !== Track.Kind.Audio) return

        const audioElement = track.attach()
        audioElement.autoplay = true
        audioElement.style.display = 'none'
        document.body.appendChild(audioElement)

        audioCleanups.current.set(trackSid, () => {
            track.detach(audioElement)
            audioElement.remove()
        })
    }

    const joinVoice = useCallback(
        async (channelId: string, _: { id: string; name: string }) => {
            if (connectingRef.current) return

            if (roomRef.current) {
                await roomRef.current.disconnect()
                roomRef.current = null
            }

            cleanupAudio()
            connectingRef.current = true

            try {
                const response = await joinVoiceChannel(channelId)

                const room = new Room({
                    adaptiveStream: true,
                    dynacast: true,
                    audioCaptureDefaults: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                })

                roomRef.current = room

                room.on(RoomEvent.ParticipantConnected, syncParticipants)
                room.on(RoomEvent.ParticipantDisconnected, syncParticipants)
                room.on(RoomEvent.TrackMuted, syncParticipants)
                room.on(RoomEvent.TrackUnmuted, syncParticipants)

                room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
                    const ids = new Set(speakers.map(s => s.identity))
                    speakingIdsRef.current = ids
                    setIsLocalSpeaking(ids.has(room.localParticipant.identity))
                    syncParticipants()
                })

                room.on(
                    RoomEvent.TrackSubscribed,
                    (track: RemoteTrack, pub: RemoteTrackPublication) => {
                        console.log('audio subscribed:', pub.trackSid)
                        attachAudioTrack(track, pub.trackSid)
                    }
                )

                // Очищаем <audio> элемент при отзыве трека (участник ушёл / замьютился на уровне публикации)
                room.on(
                    RoomEvent.TrackUnsubscribed,
                    (_track: RemoteTrack, pub: RemoteTrackPublication) => {
                        const cleanup = audioCleanups.current.get(pub.trackSid)
                        if (cleanup) {
                            cleanup()
                            audioCleanups.current.delete(pub.trackSid)
                        }
                    }
                )

                room.on(RoomEvent.Disconnected, () => {
                    speakingIdsRef.current = new Set()
                    roomRef.current = null
                    cleanupAudio()
                    setParticipants([])
                    setIsConnected(false)
                    setIsLocalSpeaking(false)
                    setIsMuted(false)
                })

                await room.connect(response.liveKitUrl, response.token)

                try {
                    await room.localParticipant.setMicrophoneEnabled(true)
                    setHasMicrophonePermission(true)
                    setIsMuted(false)
                } catch (err) {
                    console.warn('Microphone permission denied:', err)
                    setHasMicrophonePermission(false)
                    setIsMuted(true)
                }

                setIsConnected(true)
                syncParticipants()

            } catch (err) {
                console.error('Voice connect error:', err)
            } finally {
                connectingRef.current = false
            }
        },
        [syncParticipants, cleanupAudio]
    )

    const leaveVoice = useCallback(
        async (channelId: string) => {
            const room = roomRef.current
            if (!room) return

            try {
                await leaveVoiceChannel(channelId)
            } catch (err) {
                console.error(err)
            }

            room.disconnect()
            roomRef.current = null
            cleanupAudio()

            setParticipants([])
            setIsConnected(false)
            setIsLocalSpeaking(false)
            setIsMuted(false)
        },
        [cleanupAudio]
    )

    const toggleMic = useCallback(async () => {
        const room = roomRef.current
        if (!room) return

        if (hasMicrophonePermission === false) {
            const granted = await checkMicrophonePermission()
            if (!granted) {
                console.warn('Cannot toggle mic: permission denied')
                return
            }
        }

        const enabled = room.localParticipant.isMicrophoneEnabled

        try {
            if (enabled) {
                await room.localParticipant.setMicrophoneEnabled(false)
                setIsMuted(true)
            } else {
                await room.localParticipant.setMicrophoneEnabled(true)
                setHasMicrophonePermission(true)
                setIsMuted(false)
            }
        } catch (err) {
            console.error('Failed to toggle microphone:', err)
            if (err instanceof Error && err.name === 'NotAllowedError') {
                setHasMicrophonePermission(false)
                setIsMuted(true)
            }
        }
    }, [checkMicrophonePermission, hasMicrophonePermission])

    return {
        participants,
        isConnected,
        isMuted,
        isLocalSpeaking,
        hasMicrophonePermission,
        joinVoice,
        leaveVoice,
        toggleMic,
    }
}
