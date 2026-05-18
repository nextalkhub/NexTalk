import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { createInvite } from '../../processes/invites/createInvite.ts'
import { Invite, CreateInviteRequest } from '../types'
import {acceptInvite} from "../../processes/invites/acceptInvite.ts";

interface InviteState {
    invites: Record<string, Invite[]>
    loading: boolean
}

const initialState: InviteState = {
    invites: {},
    loading: false,
}

export const createInviteThunk = createAsyncThunk(
    'invite/create',
    async (
        { guildId, data }: { guildId: string; data: CreateInviteRequest }
    ): Promise<string> => {
        const invite = await createInvite(guildId, data)
        return invite.code
    }
)

export const acceptInviteThunk = createAsyncThunk(
    'invite/accept',
    async (code: string) => {
        return await acceptInvite(code)
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
            .addCase(acceptInviteThunk.pending, state => {
                state.loading = true
            })
            .addCase(acceptInviteThunk.fulfilled, state => {
                state.loading = false
            })
            .addCase(acceptInviteThunk.rejected, state => {
                state.loading = false
            })
    },
})

export default inviteSlice.reducer