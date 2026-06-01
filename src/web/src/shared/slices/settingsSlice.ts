import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { BanDto } from '../../processes/guild/getBans'
import { getBans } from '../../processes/guild/getBans'
import { unbanMember } from '../../processes/guild/unbanMember'
import { getGuildInvites } from '../../processes/invites/getGuildInvites'
import { deleteInvite } from '../../processes/invites/deleteInvite'
import { updateGuild } from '../../processes/guild/updateGuild'
import { deleteGuild } from '../../processes/guild/deleteGuild'
import type { Invite } from '../types'

interface SettingsState {
  bans: Record<string, BanDto[]>
  invites: Record<string, Invite[]>
  loading: boolean
}

const initialState: SettingsState = {
  bans: {},
  invites: {},
  loading: false,
}

export const fetchBans = createAsyncThunk(
  'settings/fetchBans',
  async (guildId: string) => {
    const bans = await getBans(guildId)
    return { guildId, bans }
  }
)

export const unbanThunk = createAsyncThunk(
  'settings/unban',
  async ({ guildId, userId }: { guildId: string; userId: string }) => {
    await unbanMember(guildId, userId)
    return { guildId, userId }
  }
)

export const fetchSettingsInvites = createAsyncThunk(
  'settings/fetchInvites',
  async (guildId: string) => {
    const invites = await getGuildInvites(guildId)
    return { guildId, invites }
  }
)

export const deleteInviteThunk = createAsyncThunk(
  'settings/deleteInvite',
  async ({ guildId, code }: { guildId: string; code: string }) => {
    await deleteInvite(guildId, code)
    return { guildId, code }
  }
)

export const updateGuildThunk = createAsyncThunk(
  'settings/updateGuild',
  async ({ guildId, name }: { guildId: string; name: string }) => {
    return await updateGuild(guildId, { name })
  }
)

export const deleteGuildThunk = createAsyncThunk(
  'settings/deleteGuild',
  async (guildId: string) => {
    await deleteGuild(guildId)
    return guildId
  }
)

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchBans.pending, state => { state.loading = true })
      .addCase(fetchBans.fulfilled, (state, action) => {
        state.loading = false
        state.bans[action.payload.guildId] = action.payload.bans
      })
      .addCase(fetchBans.rejected, state => { state.loading = false })

      .addCase(unbanThunk.fulfilled, (state, action) => {
        const { guildId, userId } = action.payload
        state.bans[guildId] = (state.bans[guildId] ?? []).filter(b => b.userId !== userId)
      })

      .addCase(fetchSettingsInvites.pending, state => { state.loading = true })
      .addCase(fetchSettingsInvites.fulfilled, (state, action) => {
        state.loading = false
        state.invites[action.payload.guildId] = action.payload.invites
      })
      .addCase(fetchSettingsInvites.rejected, state => { state.loading = false })

      .addCase(deleteInviteThunk.fulfilled, (state, action) => {
        const { guildId, code } = action.payload
        state.invites[guildId] = (state.invites[guildId] ?? []).filter(i => i.code !== code)
      })
  },
})

export default settingsSlice.reducer
