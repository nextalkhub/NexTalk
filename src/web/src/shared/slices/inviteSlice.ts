import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { createInvite } from '../../processes/guild/createInvite'
import { Invite, CreateInviteRequest } from '../types'

const USE_MOCK = import.meta.env.VITE_USE_AUTH_MOCK === 'true'

// 🔴 мок-хранилище
const mockInvites: Record<string, Invite[]> = {}

interface InviteState {
    invites: Record<string, Invite[]> // guildId -> invites[]
    loading: boolean
}

const initialState: InviteState = {
    invites: {},
    loading: false,
}

// ===== CREATE =====
export const createInviteThunk = createAsyncThunk(
    'invite/create',
    async (
        { guildId, data }: { guildId: string; data: CreateInviteRequest }
    ) => {
        if (USE_MOCK) {
            await new Promise(r => setTimeout(r, 300))

            const newInvite: Invite = {
                code: Math.random().toString(36).substring(2, 8),
                guildId,
                channelId: data.channelId,
                inviterId: 'mock-user',
                maxUses: data.maxUses,
                uses: 0,
                expiresAt: data.expiresIn
                    ? new Date(Date.now() + data.expiresIn * 1000)
                    : undefined,
                createdAt: new Date(),
            }

            if (!mockInvites[guildId]) {
                mockInvites[guildId] = []
            }

            mockInvites[guildId].push(newInvite)

            return { guildId, invite: newInvite }
        }

        const invite = await createInvite(guildId, data)
        return { guildId, invite }
    }
)

const inviteSlice = createSlice({
    name: 'invite',
    initialState,
    reducers: {},
    extraReducers: builder => {
        builder
            .addCase(createInviteThunk.pending, state => {
                state.loading = true
            })
            .addCase(createInviteThunk.fulfilled, (state, action) => {
                state.loading = false

                const { guildId, invite } = action.payload

                if (!state.invites[guildId]) {
                    state.invites[guildId] = []
                }

                state.invites[guildId].push(invite)
            })
            .addCase(createInviteThunk.rejected, state => {
                state.loading = false
            })
    },
})

export default inviteSlice.reducer