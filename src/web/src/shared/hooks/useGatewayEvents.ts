import { useEffect } from 'react'
import { useAppDispatch } from '../../store'
import {messageReceived} from "../slices/chatSlice.ts";
import {useSignalR} from "./useSignalR.ts";
import { voiceParticipantJoined, voiceParticipantLeft } from '../slices/voiceSlice'
import {addChannel, setCurrentChannel} from "../slices/channelSlice.ts";
import {memberBanned, memberJoined, memberKicked} from "../slices/memberSlice.ts";
import {useNavigate} from "react-router-dom";

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

interface ChannelCreatedEvent {
    type: 'channel.created'
    payload: {
        id: string
        guildId: string
        name: string
        type: number
    }
}

interface MemberJoinedEvent {
    type: 'member.joined'
    payload: {
        id: string
        userId: string
        guildId: string
        displayName: string
        username: string
    }
}

interface MemberKickedEvent {
    type: 'member.kicked'
    payload: {
        userId: string
        guildId: string
    }
}

interface MemberBannedEvent {
    type: 'member.banned'
    payload: {
        userId: string
        guildId: string
    }
}

interface ForcedDisconnectEvent {
    type: 'guild.force.disconnect'
    payload: {
        guildId: string
    }
}

type GatewayEvent =
    | MessageCreatedEvent
    | VoiceJoinedEvent
    | VoiceLeftEvent
    | PresenceOnlineEvent
    | ChannelCreatedEvent
    | MemberJoinedEvent
    | MemberKickedEvent
    | MemberBannedEvent
    | ForcedDisconnectEvent

export const useGatewayEvents = () => {
    const { connection } = useSignalR()
    const dispatch = useAppDispatch()
    const navigate = useNavigate();

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

                case 'channel.created':
                    dispatch(addChannel({
                        id: event.payload.id,
                        serverId: event.payload.guildId,
                        name: event.payload.name,
                        type: event.payload.type === 0
                            ? 'text'
                            : 'voice',
                    }))
                    break

                case 'member.joined':
                    dispatch(memberJoined({
                        serverId: event.payload.guildId,
                        member: {
                            id: event.payload.id,
                            userId: event.payload.userId,
                            displayName: event.payload.displayName,
                            username: event.payload.username,
                            role: 'Member'
                        }
                    }))
                    break

                case 'member.kicked':
                    dispatch(memberKicked({
                        serverId: event.payload.guildId,
                        userId: event.payload.userId
                    }))
                    break

                case 'member.banned':
                    dispatch(memberBanned({
                        serverId: event.payload.guildId,
                        userId: event.payload.userId
                    }))
                    break

                case 'guild.force.disconnect':
                    dispatch(setCurrentChannel(null));
                    navigate('/servers');
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
    }, [connection, dispatch, navigate])
}