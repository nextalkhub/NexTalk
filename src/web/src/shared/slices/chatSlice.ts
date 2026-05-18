import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import {getChannelMessages} from "../../processes/channels/getChannelMessages.ts";

export interface MessageInterface {
    id: string
    channelId: string
    authorId: string
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

const USE_MOCK = import.meta.env.VITE_USE_AUTH_MOCK === 'true'

const mockMessages: Record<string, MessageInterface[]> = {
    '1': [
        {
            id: '1',
            channelId: '1',
            authorId: '1',
            content: 'Привет',
            createdAt: new Date().toISOString()
        }
    ]
}

export const fetchMessages = createAsyncThunk(
    'chat/fetchMessages',
    async ({
               channelId,
               cursor,
           }: {
        channelId: string
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
        sendMessage: (state, action: PayloadAction<MessageInterface>) => {
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

            if (USE_MOCK) {
                if (!mockMessages[msg.channelId]) {
                    mockMessages[msg.channelId] = []
                }

                mockMessages[msg.channelId].push(msg)
            }
        }
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

export const { sendMessage } = chatSlice.actions
export default chatSlice.reducer