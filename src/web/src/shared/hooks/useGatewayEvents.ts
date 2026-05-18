import { useEffect } from 'react'
import { useAppDispatch } from '../../store'
import {useSignalR} from "../../SignalrContext.tsx";
import {messageReceived} from "../slices/chatSlice.ts";

export const useGatewayEvents = () => {
    const { connection } = useSignalR()
    const dispatch = useAppDispatch()

    useEffect(() => {
        if (!connection) return

        const handler = (event: any) => {
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