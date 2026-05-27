import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface PresenceState {
    online: Record<string, boolean>
}

const initialState: PresenceState = {
    online: {},
}

const presenceSlice = createSlice({
    name: 'presence',
    initialState,
    reducers: {
        userOnline(state, action: PayloadAction<string>) {
            state.online[action.payload] = true
        },
        userOffline(state, action: PayloadAction<string>) {
            delete state.online[action.payload]
        },
        setPresenceBulk(state, action: PayloadAction<string[]>) {
            state.online = {}
            for (const id of action.payload) {
                state.online[id] = true
            }
        },
    },
})

export const { userOnline, userOffline, setPresenceBulk } = presenceSlice.actions
export default presenceSlice.reducer

export const selectIsUserOnline = (userId: string) =>
    (state: { presence: PresenceState }) => !!state.presence.online[userId]
