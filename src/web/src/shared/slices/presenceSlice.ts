import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface PresenceState {
    onlineUserIds: string[]
}

const initialState: PresenceState = {
    onlineUserIds: [],
}

const presenceSlice = createSlice({
    name: 'presence',
    initialState,
    reducers: {
        userOnline(state, action: PayloadAction<string>) {
            if (!state.onlineUserIds.includes(action.payload)) {
                state.onlineUserIds.push(action.payload)
            }
        },
        userOffline(state, action: PayloadAction<string>) {
            state.onlineUserIds = state.onlineUserIds.filter(id => id !== action.payload)
        },
    },
})

export const { userOnline, userOffline } = presenceSlice.actions
export default presenceSlice.reducer

export const selectIsUserOnline = (userId: string) =>
    (state: { presence: PresenceState }) => state.presence.onlineUserIds.includes(userId)
