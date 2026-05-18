import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {Member} from "../types";
import {getGuildMembers} from "../../processes/guild/getGuildMembers.ts";
import {kickMember} from "../../processes/guild/kickMember.ts";
import {banMember} from "../../processes/guild/banMember.ts";


interface MembersState {
    members: Record<string, Member[]>
    loading: boolean
}

const initialState: MembersState = {
    members: {},
    loading: false,
}

export const fetchMembers = createAsyncThunk(
    'members/fetch',
    async (serverId: string) => {

        const data = await getGuildMembers(serverId)
        return { serverId, members: data }
    }
)

export const kickMemberThunk = createAsyncThunk(
    'members/kick',
    async ({ serverId, memberId }: { serverId: string, memberId: string }) => {

        await kickMember(serverId, memberId);
        return { serverId, memberId }
    }
)

export const banMemberThunk = createAsyncThunk(
    'members/ban',
    async ({ serverId, memberId }: { serverId: string, memberId: string }) => {


        await banMember(serverId, memberId);
        return { serverId, memberId }
    }
)

const membersSlice = createSlice({
    name: 'members',
    initialState,
    reducers: {},
    extraReducers: builder => {
        builder
            .addCase(fetchMembers.pending, (state) => {
                state.loading = true
            })
            .addCase(fetchMembers.fulfilled, (state, action) => {
                state.loading = false
                state.members[action.payload.serverId] = action.payload.members
            })
            .addCase(kickMemberThunk.fulfilled, (state, action) => {
                const { serverId, memberId } = action.payload
                state.members[serverId] =
                    state.members[serverId].filter(m => m.id !== memberId)
            })

    }
})

export default membersSlice.reducer