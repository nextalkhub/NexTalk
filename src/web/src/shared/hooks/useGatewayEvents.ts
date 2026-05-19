import { useEffect } from 'react'
import { useAppDispatch } from '../../store'
import {messageReceived} from "../slices/chatSlice.ts";
import {useSignalR} from "./useSignalR.ts";
import { voiceParticipantJoined, voiceParticipantLeft } from '../slices/voiceSlice'

interface MessageCreatedEvent {
    type: 'message.created'
    payload: {
        AuthorName: string;
        Id: string
        ChannelId: string
        AuthorId: string
        Content: string
        CreatedAt: string
    }
}

interface VoiceJoinedEvent {
    type: 'voice.joined'
    payload: {
        ChannelId: string
        UserId: string
    }
}

interface VoiceLeftEvent {
    type: 'voice.left'
    payload: {
        ChannelId: string
        UserId: string
    }
}

interface PresenceOnlineEvent {
    type: 'presence.online'
    payload: {
        userId: string
    }
}

type GatewayEvent =
    | MessageCreatedEvent
    | VoiceJoinedEvent
    | VoiceLeftEvent
    | PresenceOnlineEvent

export const useGatewayEvents = () => {
    const { connection } = useSignalR()
    const dispatch = useAppDispatch()

    useEffect(() => {
        if (!connection) return

        const handler = (event: GatewayEvent) => {
            console.log('GatewayEvent:', event)

            switch (event.type) {

                case 'message.created':
                    dispatch(messageReceived({
                        id: event.payload.Id,
                        channelId: event.payload.ChannelId,
                        authorId: event.payload.AuthorId,
                        authorName: event.payload.AuthorName,
                        content: event.payload.Content,
                        createdAt: event.payload.CreatedAt,
                    }))
                    break

                case 'voice.joined':
                    dispatch(voiceParticipantJoined({
                        channelId: event.payload.ChannelId,
                        userId: event.payload.UserId,
                    }))
                    break

                case 'voice.left':
                    dispatch(voiceParticipantLeft({
                        channelId: event.payload.ChannelId,
                        userId: event.payload.UserId,
                    }))
                    break

                case 'presence.online':
                    console.log('online')
                    break
            }
        }

        connection.on('GatewayEvent', handler)

        return () => {
            connection.off('GatewayEvent', handler)
        }
    }, [connection, dispatch])
}