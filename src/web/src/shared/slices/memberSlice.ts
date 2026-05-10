import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {Member} from "../types";
import {getGuildMembers} from "../../processes/guild/getGuildMembers.ts";
import {kickMember} from "../../processes/guild/kickMember.ts";
import {banMember} from "../../processes/guild/banMember.ts";

const USE_MOCK = import.meta.env.VITE_USE_AUTH_MOCK === 'true'

// 🔴 общий мок (как у тебя)
export const mockMembers: Record<string, Member[]> = {
    '1': [
        { id: '1', name: 'Иван', avatar: 'И', role: 'owner', username: '@ivan', userId: '1' },
        { id: '2', name: 'Мария', avatar: 'М', role: 'admin', username: '@maria', userId: '2' },
        { id: '3', name: 'Алексей', avatar: 'А', role: 'member', username: '@alexey', userId: '3' },
    ],
    '2': [
        { id: '1', name: 'Иван', avatar: 'И', role: 'owner', username: '@ivan', userId: '1' },
        { id: '2', name: 'Мария', avatar: 'М', role: 'admin', username: '@maria', userId: '2' },
        { id: '3', name: 'Алексей', avatar: 'А', role: 'member', username: '@alexey', userId: '3' },
    ]
}

interface MembersState {
    members: Record<string, Member[]> // serverId -> members[]
    loading: boolean
}

const initialState: MembersState = {
    members: {},
    loading: false,
}

export const fetchMembers = createAsyncThunk(
    'members/fetch',
    async (serverId: string) => {
        if (USE_MOCK) {
            await new Promise(r => setTimeout(r, 200))
            return {
                serverId,
                members: mockMembers[serverId] || []
            }
        }

        const data = await getGuildMembers(serverId)
        return { serverId, members: data }
    }
)

export const kickMemberThunk = createAsyncThunk(
    'members/kick',
    async ({ serverId, memberId }: { serverId: string, memberId: string }) => {
        if (USE_MOCK) {
            mockMembers[serverId] = mockMembers[serverId].filter(m => m.id !== memberId)
            return { serverId, memberId }
        }

        await kickMember(serverId, memberId);
        return { serverId, memberId }
    }
)

export const banMemberThunk = createAsyncThunk(
    'members/ban',
    async ({ serverId, memberId }: { serverId: string, memberId: string }) => {
        if (USE_MOCK) {
            mockMembers[serverId] = mockMembers[serverId].filter(m => m.id !== memberId)
            return { serverId, memberId }
        }

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