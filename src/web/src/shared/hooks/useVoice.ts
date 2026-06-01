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
import { loadPrefs } from '../prefs/prefs'
import { VoiceParticipant } from '../types'

export const useVoice = () => {
    const roomRef = useRef<Room | null>(null)
    // Каждый новый join инкрементирует счетчик; устаревшие попытки сравнивают с ним и молча выходят.
    const connectGenRef = useRef(0)
    const speakingIdsRef = useRef<Set<string>>(new Set())
    const audioCleanups = useRef<Map<string, () => void>>(new Map())

    const [participants, setParticipants] = useState<VoiceParticipant[]>([])
    const [isConnected, setIsConnected] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [isDeafened, setIsDeafened] = useState(false)
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
            const gen = ++connectGenRef.current

            // Отключаем текущую комнату (это прерывает незавершенный room.connect()).
            if (roomRef.current) {
                roomRef.current.disconnect()
                roomRef.current = null
            }

            cleanupAudio()

            try {
                const response = await joinVoiceChannel(channelId)
                if (gen !== connectGenRef.current) return // вытеснено следующим join

                // Настройки захвата берем из клиентских prefs (вкладка "Звук").
                const prefs = loadPrefs()
                const room = new Room({
                    adaptiveStream: true,
                    dynacast: true,
                    audioCaptureDefaults: {
                        echoCancellation: prefs.echoCancellation,
                        noiseSuppression: prefs.noiseSuppression,
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

                // Проверяем снова после async - мог прийти новый join пока ждали.
                if (gen !== connectGenRef.current) {
                    room.disconnect()
                    return
                }

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
                // Если gen устарел - это ожидаемый abort от disconnect(), не логируем.
                if (gen !== connectGenRef.current) return
                console.error('Voice connect error:', err)
            }
        },
        [syncParticipants, cleanupAudio]
    )

    const leaveVoice = useCallback(
        async (channelId: string) => {
            connectGenRef.current++

            try {
                await leaveVoiceChannel(channelId)
            } catch (err) {
                console.error(err)
            }

            if (roomRef.current) {
                roomRef.current.disconnect()
                roomRef.current = null
            }
            cleanupAudio()

            setParticipants([])
            setIsConnected(false)
            setIsLocalSpeaking(false)
            setIsMuted(false)
            setIsDeafened(false)
        },
        [cleanupAudio]
    )

    const toggleDeafen = useCallback(() => {
        setIsDeafened(prev => {
            const next = !prev
            document.querySelectorAll<HTMLAudioElement>('body > audio').forEach(el => {
                el.muted = next
            })
            return next
        })
    }, [])

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
        isDeafened,
        isLocalSpeaking,
        hasMicrophonePermission,
        joinVoice,
        leaveVoice,
        toggleMic,
        toggleDeafen,
    }
}
