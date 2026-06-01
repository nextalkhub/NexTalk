import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { axiosInstance } from '../../processes/axiosInstance.ts'
import { Channel } from '../types'
import { getGuildChannels } from '../../processes/channels/getGuildChannels.ts'

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

export const fetchChannels = createAsyncThunk(
    'channels/fetch',
    async (serverId: string) => await getGuildChannels(serverId)
)

export const createChannel = createAsyncThunk(
    'channels/create',
    async ({ serverId, name, type }: { serverId: string; name: string; type: 'text' | 'voice' }) => {
        const res = await axiosInstance.post(`/api/guilds/${serverId}/channels`, { name, type })
        return res.data as Channel
    }
)

export const renameChannelThunk = createAsyncThunk(
    'channels/rename',
    async ({ serverId, channelId, name }: { serverId: string; channelId: string; name: string }) => {
        const res = await axiosInstance.patch(`/api/guilds/${serverId}/channels/${channelId}`, { name })
        return res.data as Channel
    }
)

const channelSlice = createSlice({
    name: 'channels',
    initialState,
    reducers: {
        setCurrentChannel: (state, action: PayloadAction<string | null>) => {
            state.currentChannelId = action.payload
        },
        addChannel: (state, action: PayloadAction<Channel>) => {
            if (!state.channels.some(c => c.id === action.payload.id)) {
                state.channels.push(action.payload)
            }
        },
        removeChannel: (state, action: PayloadAction<string>) => {
            state.channels = state.channels.filter(c => c.id !== action.payload)
            if (state.currentChannelId === action.payload) {
                state.currentChannelId = null
            }
        },
        removeChannelsByServer: (state, action: PayloadAction<string>) => {
            state.channels = state.channels.filter(c => c.serverId !== action.payload)
        },
    },
    extraReducers: builder => {
        builder
            .addCase(fetchChannels.pending, state => { state.loading = true })
            .addCase(fetchChannels.fulfilled, (state, action) => {
                state.loading = false
                state.channels = action.payload
            })
            .addCase(fetchChannels.rejected, state => { state.loading = false })
            .addCase(createChannel.fulfilled, (state, action) => {
                if (!state.channels.some(c => c.id === action.payload.id)) {
                    state.channels.push(action.payload)
                }
            })
            .addCase(renameChannelThunk.fulfilled, (state, action) => {
                const idx = state.channels.findIndex(c => c.id === action.payload.id)
                if (idx !== -1) state.channels[idx] = action.payload
            })
    }
})

export const { setCurrentChannel, addChannel, removeChannel, removeChannelsByServer } = channelSlice.actions
export default channelSlice.reducer
