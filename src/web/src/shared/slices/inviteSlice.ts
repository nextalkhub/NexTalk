import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { createInvite } from '../../processes/invites/createInvite.ts'
import { Invite, CreateInviteRequest } from '../types'

interface InviteState {
    invites: Record<string, Invite[]>
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
    ): Promise<string> => {
        const invite = await createInvite(guildId, data)
        return invite.code
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
            .addCase(createInviteThunk.fulfilled, (state) => {
                state.loading = false
            })
            .addCase(createInviteThunk.rejected, state => {
                state.loading = false
            })
    },
})

export default inviteSlice.reducer