import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { axiosInstance } from '../../processes/axiosInstance.ts'

export interface MessageInterface {
    id: string
    channelId: string
    authorId: string
    authorName: string
    content: string
    createdAt: string
}

interface ChatState {
    messages: Record<string, MessageInterface[]>
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
            authorName: 'Алексей',
            content: 'Привет',
            createdAt: new Date().toISOString()
        }
    ]
}

export const fetchMessages = createAsyncThunk(
    'chat/fetchMessages',
    async (channelId: string) => {
        if (USE_MOCK) {
            await new Promise(r => setTimeout(r, 200))
            return mockMessages[channelId] || []
        }

        const res = await axiosInstance.get(`/api/channels/${channelId}/messages`)
        return res.data
    }
)

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        sendMessage: (state, action: PayloadAction<MessageInterface>) => {
            const msg = action.payload

            if (!state.messages[msg.channelId]) {
                state.messages[msg.channelId] = []
            }

            state.messages[msg.channelId].push(msg)

            if (USE_MOCK) {
                if (!mockMessages[msg.channelId]) {
                    mockMessages[msg.channelId] = []
                }
                mockMessages[msg.channelId].push(msg)
            }
        }
    },
    extraReducers: builder => {
        builder.addCase(fetchMessages.fulfilled, (state, action) => {
            const channelId = action.meta.arg

            state.messages[channelId] = [...action.payload]
        })
    }
})

export const { sendMessage } = chatSlice.actions
export default chatSlice.reducer