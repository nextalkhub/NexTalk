export interface Guild {
    id: string
    name: string
    ownerId: string
    createdAt: string
}

export interface Channel {
    id: string
    serverId: string
    name: string
    type: 'text' | 'voice'
}

export interface Member {
    displayName: string
    // id отсутствует в payload member.joined от gateway - используем userId как стабильный ключ
    id?: string
    role: 'Owner' | 'Admin' | 'Member'
    userId: string
    username: string
    joinedAt?: string
}

export interface Invite {
    id: string
    code: string
    url?: string
    guildId?: string
    expiresAt: string | null
    maxUses: number | null
    usesCount?: number
    userCount?: number
    createdBy?: string
    createdAt: string
}

export interface CreateGuildRequest {
    name: string
    displayName: string
}

export interface CreateChannelRequest {
    name: string
    type: 'text' | 'voice'
}

export interface CreateInviteRequest {
    expiresIn?: string
    expiresInSeconds?: number
    maxUses?: number
}

export interface UpdateMemberRoleRequest {
    role: 'admin' | 'member'
}

export interface Message {
    id: string
    authorId: string
    authorName: string
    channelId: string
    content: string
    createdAt: string
}

export interface GetMessagesResponse {
    messages: Message[]
    nextCursor: string | null
    prevCursor: string | null
    hasMore: boolean
    total?: number
}

export interface CreateMessageRequest {
    channelId: string
    content: string
    replyToId?: string
    mentions?: string[]
    attachments?: File[]
}

// Idempotency ключ генерируется на клиенте
// Формат: `msg_${channelId}_${Date.now()}_${randomString}`
export interface IdempotencyKey {
    key: string
    expiresAt: string
}

export interface JoinVoiceResponse {
    token: string
    liveKitUrl: string
    channelId: string
    guildId: string
}

export interface VoiceParticipant {
    userId: string
    username: string
    isMuted: boolean
    isDeafened: boolean
    isSpeaking: boolean
}

// Всплывающая реакция-смайлик в голосовом канале (через LiveKit data channel).
export interface VoiceReaction {
    id: string
    emoji: string
    senderId: string
    senderName: string
    // позиция по горизонтали в процентах, чтобы реакции не накладывались
    left: number
}

export interface VoiceRoomInfo {
    channelId: string
    guildId: string
    participants: VoiceParticipant[]
    participantCount: number
    createdAt: string
}

export interface JoinRequest {
    userId: string
    username: string
    displayName: string
    avatar?: string
    mute?: boolean
    deaf?: boolean
}

export interface LeaveRequest {
    userId: string
}