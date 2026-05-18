export interface Guild {
    id: string
    name: string
    displayName: string
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
    id: string
    joinedAt: string
    role: 'Owner' | 'Admin' | 'Member'
    userId: string
    username: string
}

export interface Invite {
    id: string
    code: string
    url: string
    guildId: string
    expiresAt: string
    maxUses: number
    userCount: number
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
    expiresIn: '24h' | '7d' | '30m'
    expiresInSeconds: number
    maxUses: number
}

export interface UpdateMemberRoleRequest {
    role: 'admin' | 'member'
}

export interface Message {
    id: string
    channelId: string
    guildId: string
    authorId: string
    authorUsername: string
    authorDisplayName: string
    authorAvatar?: string
    content: string
    createdAt: string
    updatedAt?: string
    isEdited: boolean
    isDeleted: boolean
    replyToId?: string
    attachments?: MessageAttachment[]
    mentions?: string[]
}

export interface MessageAttachment {
    id: string
    messageId: string
    type: 'image' | 'video' | 'file'
    url: string
    fileName: string
    fileSize: number
    width?: number
    height?: number
}

export interface GetMessagesRequest {
    channelId: string
    cursor?: string
    limit?: number
    direction?: 'before' | 'after' | 'around'
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

export interface CreateMessageInternalRequest {
    channelId: string
    guildId: string
    authorId: string
    authorUsername: string
    authorDisplayName: string
    authorAvatar?: string
    content: string
    replyToId?: string
    mentions?: string[]
    sentAt: Date
}

export interface DeleteMessageRequest {
    messageId: string
    reason?: string
}

// Idempotency ключ генерируется на клиенте
// Формат: `msg_${channelId}_${Date.now()}_${randomString}`
export interface IdempotencyKey {
    key: string
    expiresAt: Date
}

export interface JoinVoiceResponse {
    token: string
    url: string
}

export interface VoiceParticipant {
    userId: string
    username: string
    isMuted: boolean
    isDeafened: boolean
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