import { useCallback, useRef, useState } from 'react'
import { Participant, Room, RoomEvent, RemoteParticipant } from 'livekit-client'

import { joinVoiceChannel } from '../../processes/voice/joinVoiceChannel'
import { leaveVoiceChannel } from '../../processes/voice/leaveVoiceChannel'
import { VoiceParticipant } from '../types'

export const useVoice = () => {
    const roomRef = useRef<Room | null>(null)
    const connectingRef = useRef(false)
    const speakingIdsRef = useRef<Set<string>>(new Set())

    const [participants, setParticipants] = useState<VoiceParticipant[]>([])
    const [isConnected, setIsConnected] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [isLocalSpeaking, setIsLocalSpeaking] = useState(false)

    // Читает текущее состояние room.remoteParticipants и обновляет стейт.
    // Вызывается на каждое событие, меняющее состав или статус участников.
    const syncParticipants = useCallback(() => {
        const room = roomRef.current
        if (!room) return

        const list = Array.from(room.remoteParticipants.values()).map(
            (p: RemoteParticipant): VoiceParticipant => ({
                userId: p.identity,
                username: p.name || p.identity,
                isMuted: !p.isMicrophoneEnabled,
                isDeafened: false,
                isSpeaking: speakingIdsRef.current.has(p.identity),
            })
        )

        setParticipants(list)
    }, [])

    const joinVoice = useCallback(async (
        channelId: string,
        _: { id: string; name: string }
    ) => {
        if (connectingRef.current || roomRef.current) return

        connectingRef.current = true

        try {
            const response = await joinVoiceChannel(channelId)

            const room = new Room()
            roomRef.current = room

            room.on(RoomEvent.ParticipantConnected, syncParticipants)
            room.on(RoomEvent.ParticipantDisconnected, syncParticipants)

            // TrackMuted/TrackUnmuted обновляют isMicrophoneEnabled участника,
            // поэтому пересинхронизируем список после каждого изменения.
            room.on(RoomEvent.TrackMuted, () => syncParticipants())
            room.on(RoomEvent.TrackUnmuted, () => syncParticipants())

            room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
                const ids = new Set(speakers.map(s => s.identity))
                speakingIdsRef.current = ids
                setIsLocalSpeaking(ids.has(room.localParticipant.identity))
                syncParticipants()
            })

            room.on(RoomEvent.Disconnected, () => {
                speakingIdsRef.current = new Set()
                roomRef.current = null
                setParticipants([])
                setIsConnected(false)
                setIsLocalSpeaking(false)
            })

            await room.connect(response.liveKitUrl, response.token)
            await room.localParticipant.setMicrophoneEnabled(true)

            setIsConnected(true)
            setIsMuted(false)
            // Подхватываем участников, уже бывших в комнате до нашего join.
            syncParticipants()
        } catch (err) {
            console.error('Voice connect error:', err)
        } finally {
            connectingRef.current = false
        }
    }, [syncParticipants])

    const leaveVoice = useCallback(async (channelId: string) => {
        const room = roomRef.current
        if (!room) return

        try {
            await leaveVoiceChannel(channelId)
        } catch (err) {
            console.error(err)
        }

        speakingIdsRef.current = new Set()
        room.disconnect()
        roomRef.current = null
        setParticipants([])
        setIsConnected(false)
        setIsLocalSpeaking(false)
    }, [])

    const toggleMic = useCallback(async () => {
        const room = roomRef.current
        if (!room) return

        // isMuted=true → микрофон выключен → setMicrophoneEnabled(true) = включить
        const newMuted = !isMuted
        await room.localParticipant.setMicrophoneEnabled(!newMuted)
        setIsMuted(newMuted)
    }, [isMuted])

    return {
        participants,
        isConnected,
        isMuted,
        isLocalSpeaking,
        joinVoice,
        leaveVoice,
        toggleMic,
    }
}
