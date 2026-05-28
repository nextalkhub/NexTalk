import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { axiosInstance } from '../../processes/axiosInstance.ts'
import {Channel} from "../types";
import {getGuildChannels} from "../../processes/channels/getGuildChannels.ts";

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
    async (serverId: string) => {

        return await getGuildChannels(serverId);
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
            const exists = state.channels.some(
                c => c.id === action.payload.id
            )

            if (!exists) {
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
                if (!state.channels.some(c => c.id === action.payload.id)) {
                    state.channels.push(action.payload)
                }
            })
    }
})

export const createChannel = createAsyncThunk(
    'channels/create',
    async (data: { serverId: string; name: string; type: 'text' | 'voice' }) => {
        const { serverId, name, type } = data

        const res = await axiosInstance.post(`/api/guilds/${serverId}/channels`, {
            name,
            type,
        })

        return res.data
    }
)

export const { setCurrentChannel, addChannel, removeChannel, removeChannelsByServer } = channelSlice.actions
export default channelSlice.reducer