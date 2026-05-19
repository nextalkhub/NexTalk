import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface VoiceState {
    // channelId → массив userId участников, о которых знаем через gateway-события
    channelParticipants: Record<string, string[]>
}

const initialState: VoiceState = {
    channelParticipants: {},
}

const voiceSlice = createSlice({
    name: 'voice',
    initialState,
    reducers: {
        voiceParticipantJoined(state, action: PayloadAction<{ channelId: string; userId: string }>) {
            const { channelId, userId } = action.payload
            const list = state.channelParticipants[channelId] ?? []
            if (!list.includes(userId)) {
                state.channelParticipants[channelId] = [...list, userId]
            }
        },
        voiceParticipantLeft(state, action: PayloadAction<{ channelId: string; userId: string }>) {
            const { channelId, userId } = action.payload
            const list = state.channelParticipants[channelId]
            if (list) {
                state.channelParticipants[channelId] = list.filter(id => id !== userId)
            }
        },
    },
})

export const { voiceParticipantJoined, voiceParticipantLeft } = voiceSlice.actions
export default voiceSlice.reducer
