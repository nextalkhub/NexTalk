import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../../store'
import { messageReceived } from '../slices/chatSlice.ts'
import { useSignalR } from './useSignalR.ts'
import { voiceParticipantJoined, voiceParticipantLeft } from '../slices/voiceSlice'
import { addChannel, removeChannel, removeChannelsByServer, setCurrentChannel } from '../slices/channelSlice.ts'
import { clearMembers, memberBanned, memberJoined, memberKicked, memberLeft } from '../slices/memberSlice.ts'
import { removeServer } from '../slices/serverSlice.ts'
import { userOffline, userOnline } from '../slices/presenceSlice.ts'

// SignalR JsonHubProtocol сериализует анонимные C#-объекты в camelCase, поэтому
// payload-ы здесь зеркалят свойства камеля. PascalCase оставляли по ошибке.

interface MessageCreatedEvent {
    type: 'message.created'
    payload: {
        id: string
        channelId: string
        authorId: string
        authorName: string
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
    payload: { userId: string }
}

interface PresenceOfflineEvent {
    type: 'presence.offline'
    payload: { userId: string }
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

interface ChannelDeletedEvent {
    type: 'channel.deleted'
    payload: {
        channelId: string
        guildId: string
    }
}

interface MemberJoinedEvent {
    type: 'member.joined'
    payload: {
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

interface MemberLeftEvent {
    type: 'member.left'
    payload: {
        userId: string
        guildId: string
    }
}

interface GuildDeletedEvent {
    type: 'guild.deleted'
    payload: { guildId: string }
}

interface ForcedDisconnectEvent {
    type: 'guild.force.disconnect'
    payload: { guildId: string }
}

type GatewayEvent =
    | MessageCreatedEvent
    | VoiceJoinedEvent
    | VoiceLeftEvent
    | PresenceOnlineEvent
    | PresenceOfflineEvent
    | ChannelCreatedEvent
    | ChannelDeletedEvent
    | MemberJoinedEvent
    | MemberKickedEvent
    | MemberBannedEvent
    | MemberLeftEvent
    | GuildDeletedEvent
    | ForcedDisconnectEvent

export const useGatewayEvents = () => {
    const { connection } = useSignalR()
    const dispatch = useAppDispatch()
    const navigate = useNavigate()

    useEffect(() => {
        if (!connection) return

        const handler = (event: GatewayEvent) => {
            switch (event.type) {
                case 'message.created':
                    dispatch(messageReceived({
                        id: event.payload.id,
                        channelId: event.payload.channelId,
                        authorId: event.payload.authorId,
                        authorName: event.payload.authorName,
                        content: event.payload.content,
                        createdAt: event.payload.createdAt,
                    }))
                    break

                case 'voice.joined':
                    dispatch(voiceParticipantJoined({
                        channelId: event.payload.channelId,
                        userId: event.payload.userId,
                    }))
                    break

                case 'voice.left':
                    dispatch(voiceParticipantLeft({
                        channelId: event.payload.channelId,
                        userId: event.payload.userId,
                    }))
                    break

                case 'channel.created':
                    dispatch(addChannel({
                        id: event.payload.id,
                        serverId: event.payload.guildId,
                        name: event.payload.name,
                        type: event.payload.type === 0 ? 'text' : 'voice',
                    }))
                    break

                case 'channel.deleted':
                    dispatch(removeChannel(event.payload.channelId))
                    break

                case 'member.joined':
                    dispatch(memberJoined({
                        serverId: event.payload.guildId,
                        member: {
                            id: event.payload.userId,
                            userId: event.payload.userId,
                            displayName: event.payload.displayName,
                            username: event.payload.username,
                            role: 'Member',
                        },
                    }))
                    break

                case 'member.kicked':
                    dispatch(memberKicked({
                        serverId: event.payload.guildId,
                        userId: event.payload.userId,
                    }))
                    break

                case 'member.banned':
                    dispatch(memberBanned({
                        serverId: event.payload.guildId,
                        userId: event.payload.userId,
                    }))
                    break

                case 'member.left':
                    dispatch(memberLeft({
                        serverId: event.payload.guildId,
                        userId: event.payload.userId,
                    }))
                    break

                case 'guild.deleted':
                    dispatch(removeServer(event.payload.guildId))
                    dispatch(removeChannelsByServer(event.payload.guildId))
                    dispatch(clearMembers(event.payload.guildId))
                    navigate('/servers')
                    break

                case 'guild.force.disconnect':
                    dispatch(removeServer(event.payload.guildId))
                    dispatch(removeChannelsByServer(event.payload.guildId))
                    dispatch(clearMembers(event.payload.guildId))
                    dispatch(setCurrentChannel(null))
                    connection.invoke('LeaveGuildGroup', event.payload.guildId).catch(() => {})
                    navigate('/servers')
                    break

                case 'presence.online':
                    dispatch(userOnline(event.payload.userId))
                    break

                case 'presence.offline':
                    dispatch(userOffline(event.payload.userId))
                    break
            }
        }

        connection.on('GatewayEvent', handler)

        return () => {
            connection.off('GatewayEvent', handler)
        }
    }, [connection, dispatch, navigate])
}
