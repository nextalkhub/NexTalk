export interface Guild {
    id: string
    name: string
    description?: string
    icon?: string
    ownerId: string
    createdAt: string
    memberCount: number
}

export interface Channel {
    id: string
    serverId: string
    name: string
    type: 'text' | 'voice'
}

export interface Member {
    id: string
    userId: string
    username: string
    name: string
    role: 'owner' | 'admin' | 'member'
    avatar?: string
}

export interface Invite {
    code: string
    guildId: string
    channelId: string
    inviterId: string
    maxUses?: number
    uses: number
    expiresAt?: Date
    createdAt: Date
}

export interface CreateGuildRequest {
    name: string
    description?: string
    icon?: string
}

export interface CreateChannelRequest {
    name: string
    type: 'text' | 'voice'
}

export interface CreateInviteRequest {
    channelId: string
    maxUses?: number
    expiresIn?: number // в секундах
}

export interface UpdateMemberRoleRequest {
    role: 'admin' | 'member'
}

export interface Message {
    id: string
    channelId: string
    guildId: string
    authorId: string
    authorUsername: string    // для @упоминаний, из members таблицы
    authorDisplayName: string  // отображаемое имя
    authorAvatar?: string
    content: string
    createdAt: Date
    updatedAt?: Date
    isEdited: boolean
    isDeleted: boolean
    replyToId?: string
    attachments?: MessageAttachment[]
    mentions?: string[]        // массив userId, которые упомянуты
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
    roomName: string
    wsUrl: string
    participantId: string
    participantName: string
    joinAt: Date
}

export interface VoiceParticipant {
    userId: string
    username: string
    displayName: string
    avatar?: string
    joinedAt: Date
    isMuted: boolean
    isDeafened: boolean
}

export interface VoiceRoomInfo {
    channelId: string
    guildId: string
    participants: VoiceParticipant[]
    participantCount: number
    createdAt: Date
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