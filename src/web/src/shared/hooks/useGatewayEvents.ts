import { useEffect } from 'react'
import { useAppDispatch } from '../../store'
import {messageReceived} from "../slices/chatSlice.ts";
import {useSignalR} from "./useSignalR.ts";

interface MessageCreatedEvent {
    type: 'message.created'
    payload: {
        messageId: string
        channelId: string
        authorId: string
        content: string
        createdAt: string
    }
}

interface VoiceJoinedEvent {
    type: 'voice.joined'
    payload: {
        channelId: string
        userId: string
    }
}

interface VoiceLeftEvent {
    type: 'voice.left'
    payload: {
        channelId: string
        userId: string
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
                        id: event.payload.messageId,
                        channelId: event.payload.channelId,
                        authorId: event.payload.authorId,
                        content: event.payload.content,
                        createdAt: event.payload.createdAt,
                    }))
                    break

                case 'voice.joined':
                    console.log('voice joined')
                    break

                case 'voice.left':
                    console.log('voice left')
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