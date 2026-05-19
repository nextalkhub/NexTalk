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

    const [participants, setParticipants] = useState<VoiceParticipant[]>([])
    const [isConnected, setIsConnected] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [isLocalSpeaking, setIsLocalSpeaking] = useState(false)

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

    const attachAudioTrack = (
        track: RemoteTrack,
    ) => {
        if (track.kind !== Track.Kind.Audio) return

        const audioElement = track.attach()

        audioElement.autoplay = true
        audioElement.style.display = 'none'

        document.body.appendChild(audioElement)

        return () => {
            track.detach(audioElement)
            audioElement.remove()
        }
    }

    const joinVoice = useCallback(
        async (
            channelId: string,
            _: { id: string; name: string }
        ) => {

            if (
                connectingRef.current ||
                roomRef.current
            ) return

            connectingRef.current = true

            try {
                const response =
                    await joinVoiceChannel(channelId)

                const room = new Room()

                roomRef.current = room

                room.on(
                    RoomEvent.ParticipantConnected,
                    syncParticipants
                )

                room.on(
                    RoomEvent.ParticipantDisconnected,
                    syncParticipants
                )

                room.on(
                    RoomEvent.TrackMuted,
                    syncParticipants
                )

                room.on(
                    RoomEvent.TrackUnmuted,
                    syncParticipants
                )

                room.on(
                    RoomEvent.ActiveSpeakersChanged,
                    (speakers: Participant[]) => {

                        const ids = new Set(
                            speakers.map(
                                s => s.identity
                            )
                        )

                        speakingIdsRef.current = ids

                        setIsLocalSpeaking(
                            ids.has(
                                room.localParticipant.identity
                            )
                        )

                        syncParticipants()
                    }
                )

                room.on(
                    RoomEvent.TrackSubscribed,
                    (
                        track: RemoteTrack,
                        _: RemoteTrackPublication,
                        participant: RemoteParticipant
                    ) => {

                        console.log(
                            'audio subscribed:',
                            participant.identity
                        )

                        attachAudioTrack(track)
                    }
                )

                room.on(
                    RoomEvent.Disconnected,
                    () => {
                        speakingIdsRef.current =
                            new Set()

                        roomRef.current = null

                        setParticipants([])
                        setIsConnected(false)
                        setIsLocalSpeaking(false)
                    }
                )

                await room.connect(
                    response.liveKitUrl,
                    response.token
                )

                await room.localParticipant
                    .setMicrophoneEnabled(true)

                setIsConnected(true)
                setIsMuted(false)

                syncParticipants()

            } catch (err) {
                console.error(
                    'Voice connect error:',
                    err
                )
            }
            finally {
                connectingRef.current = false
            }
        },
        [syncParticipants]
    )

    const leaveVoice = useCallback(
        async (channelId: string) => {

            const room = roomRef.current

            if (!room) return

            try {
                await leaveVoiceChannel(channelId)
            }
            catch (err) {
                console.error(err)
            }

            room.disconnect()

            roomRef.current = null

            setParticipants([])
            setIsConnected(false)
            setIsLocalSpeaking(false)
        },
        []
    )

    const toggleMic = useCallback(async () => {

        const room = roomRef.current

        if (!room) return

        const enabled =
            room.localParticipant
                .isMicrophoneEnabled

        await room.localParticipant
            .setMicrophoneEnabled(!enabled)

        setIsMuted(enabled)

    }, [])

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
