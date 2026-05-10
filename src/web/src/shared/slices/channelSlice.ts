import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { axiosInstance } from '../../processes/axiosInstance.ts'
import {Channel} from "../types";

interface ChannelState {
    channels: Channel[]
    currentChannelId: string | null
    loading: boolean
}

const initialState: ChannelState = {
    channels: [],
    currentChannelId: null,
    loading: false,
}

const USE_MOCK = import.meta.env.VITE_USE_AUTH_MOCK === 'true'

const mockChannels: Channel[] = [
    { id: '1', serverId: '1', name: 'general', type: 'text' },
    { id: '2', serverId: '1', name: 'valorant', type: 'text' },
]

export const fetchChannels = createAsyncThunk(
    'channels/fetch',
    async (serverId: string) => {
        if (USE_MOCK) {
            await new Promise(r => setTimeout(r, 200))
            return mockChannels.filter(c => c.serverId === serverId)
        }

        const res = await axiosInstance.get(`/api/guilds/${serverId}/channels`)
        return res.data
    }
)

const channelSlice = createSlice({
    name: 'channels',
    initialState,
    reducers: {
        setCurrentChannel: (state, action: PayloadAction<string>) => {
            state.currentChannelId = action.payload
        },
        addChannel: (state, action: PayloadAction<Channel>) => {
            state.channels.push(action.payload)
            if (USE_MOCK) mockChannels.push(action.payload)
        }
    },
    extraReducers: builder => {
        builder
            .addCase(fetchChannels.pending, (state) => {
                state.loading = true
            })
            .addCase(fetchChannels.fulfilled, (state, action) => {
                state.loading = false
                state.channels = action.payload
            })
            .addCase(fetchChannels.rejected, (state) => {
                state.loading = false
            })
            .addCase(createChannel.fulfilled, (state, action) => {
                state.channels.push(action.payload)
            })
    }
})

// + ДОБАВЬ В channelSlice.ts

export const createChannel = createAsyncThunk(
    'channels/create',
    async (data: { serverId: string; name: string; type: 'text' | 'voice' }) => {
        const { serverId, name, type } = data

        if (USE_MOCK) {
            await new Promise(r => setTimeout(r, 200))

            const newChannel: Channel = {
                id: Date.now().toString(),
                serverId,
                name,
                type,
            }

            mockChannels.push(newChannel)
            return newChannel
        }

        const res = await axiosInstance.post(`/api/guilds/${serverId}/channels`, {
            name,
            type,
        })

        return res.data
    }
)

export const { setCurrentChannel, addChannel } = channelSlice.actions
export default channelSlice.reducer