import {createAsyncThunk, createSlice, PayloadAction} from '@reduxjs/toolkit'
import {CreateGuildRequest, Guild} from "../types";
import {getUserGuilds} from "../../processes/guild/getUserGuilds.ts";
import {createGuild} from "../../processes/guild/createGuild.ts";

interface ServerState {
    servers: Guild[]
    currentServer: Guild | null
    isLoading: boolean
    error: string | null
}

const initialState: ServerState = {
    servers: [],
    currentServer: null,
    isLoading: false,
    error: null,
}

const USE_MOCK = import.meta.env.VITE_USE_AUTH_MOCK === 'true'

const mockServers: Guild[] = [
    {
        ownerId: '1',
        id: '1',
        name: 'Mock Server 1',
        displayName: 'mockServer1',
        createdAt: new Date().toISOString(),
    },
    {
        ownerId: '2',
        id: '2',
        name: 'Mock Server 2',
        displayName: 'mockServer2',
        createdAt: new Date().toISOString()
    },
]

export const fetchServers = createAsyncThunk(
    'servers/fetchServers',
    async () => {
        if (USE_MOCK) {
            await new Promise(res => setTimeout(res, 300))

            return [...mockServers]
        }

        return await getUserGuilds()
    }
)

export const createServer = createAsyncThunk(
    'servers/createServer',
    async (data: CreateGuildRequest) => {
        if (USE_MOCK) {
            await new Promise(res => setTimeout(res, 300))

            const newServer: Guild = {
                id: Date.now().toString(),
                ownerId: 'mock-user',
                name: data.name,
                displayName: data.displayName,
                createdAt: new Date().toISOString()
            }

            mockServers.push(newServer)
            return newServer
        }

        return await createGuild(data)
    }
)

const serverSlice = createSlice({
    name: 'servers',
    initialState,
    reducers: {
        setCurrentServer: (state, action: PayloadAction<Guild | null>) => {
            state.currentServer = action.payload
        },
        addServer: (state, action: PayloadAction<Guild>) => {
            state.servers.push(action.payload)

            if (USE_MOCK) {
                mockServers.push(action.payload)
            }
        },
        removeServer: (state, action: PayloadAction<string>) => {
            state.servers = state.servers.filter(s => s.id !== action.payload)
            if (state.currentServer?.id === action.payload) {
                state.currentServer = null
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchServers.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(fetchServers.fulfilled, (state, action) => {
                state.isLoading = false
                state.servers = action.payload
            })
            .addCase(fetchServers.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.error.message || 'Failed to fetch servers'
            })
            .addCase(createServer.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(createServer.fulfilled, (state, action) => {
                state.isLoading = false
                state.servers.push(action.payload)
            })
            .addCase(createServer.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.error.message || 'Failed to create server'
            })
    },
})

export const { setCurrentServer, addServer, removeServer } = serverSlice.actions
export default serverSlice.reducer

export const selectServers = (state: { servers: ServerState }) => state.servers.servers
export const selectCurrentServer = (state: { servers: ServerState }) => state.servers.currentServer
export const selectServersLoading = (state: { servers: ServerState }) => state.servers.isLoading
export const selectServersError = (state: { servers: ServerState }) => state.servers.error