import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import {getChannelMessages} from "../../processes/channels/getChannelMessages.ts";

export interface MessageInterface {
    id: string
    channelId: string
    authorId: string
    authorName: string
    content: string
    createdAt: string
}

interface ChannelMessagesState {
    items: MessageInterface[]
    nextCursor: string | null
    hasMore: boolean
    loading: boolean
}

interface ChatState {
    messages: Record<string, ChannelMessagesState>
}

const initialState: ChatState = {
    messages: {}
}

export const fetchMessages = createAsyncThunk(
    'chat/fetchMessages',
    async ({
               channelId,
               cursor,
           }: {
        channelId: string
        userId: string
        cursor?: string
    }) => {
        return await getChannelMessages(channelId, {
            cursor,
            limit: 50,
        })
    }
)

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        messageReceived: (state, action: PayloadAction<MessageInterface>) => {
            const msg = action.payload

            if (!state.messages[msg.channelId]) {
                state.messages[msg.channelId] = {
                    items: [],
                    nextCursor: null,
                    hasMore: true,
                    loading: false,
                }
            }

            const items = state.messages[msg.channelId].items

            // убираем optimistic-сообщение по совпадению автора+контента
            const optIdx = items.findIndex(
                m => m.id.startsWith('opt_') && m.authorId === msg.authorId && m.content === msg.content
            )
            if (optIdx >= 0) items.splice(optIdx, 1)

            if (!items.some(m => m.id === msg.id)) items.push(msg)
        },

        addOptimisticMessage: (state, action: PayloadAction<MessageInterface>) => {
            const msg = action.payload
            if (!state.messages[msg.channelId]) {
                state.messages[msg.channelId] = {
                    items: [],
                    nextCursor: null,
                    hasMore: true,
                    loading: false,
                }
            }
            state.messages[msg.channelId].items.push(msg)
        },

        deleteMessage: (state, action: PayloadAction<{ channelId: string; messageId: string }>) => {
            const { channelId, messageId } = action.payload
            if (state.messages[channelId]) {
                state.messages[channelId].items = state.messages[channelId].items.filter(
                    m => m.id !== messageId
                )
            }
        },
    },
    extraReducers: builder => {
        builder.addCase(fetchMessages.pending, (state, action) => {
            const { channelId } = action.meta.arg

            if (!state.messages[channelId]) {
                state.messages[channelId] = {
                    items: [],
                    nextCursor: null,
                    hasMore: true,
                    loading: false,
                }
            }

            state.messages[channelId].loading = true
        })

        builder.addCase(fetchMessages.fulfilled, (state, action) => {
            const { channelId, cursor } = action.meta.arg

            if (!state.messages[channelId]) {
                state.messages[channelId] = {
                    items: [],
                    nextCursor: null,
                    hasMore: true,
                    loading: false,
                }
            }

            const channelState = state.messages[channelId]

            // первый запрос
            if (!cursor) {
                channelState.items = action.payload.messages
            }
            // догрузка старых сообщений
            else {
                channelState.items = [
                    ...action.payload.messages,
                    ...channelState.items,
                ]
            }

            channelState.nextCursor = action.payload.nextCursor
            channelState.hasMore = action.payload.hasMore
            channelState.loading = false
        })

        builder.addCase(fetchMessages.rejected, (state, action) => {
            const { channelId } = action.meta.arg

            if (state.messages[channelId]) {
                state.messages[channelId].loading = false
            }
        })
    }
})

export const { messageReceived, addOptimisticMessage, deleteMessage } = chatSlice.actions
export default chatSlice.reducer