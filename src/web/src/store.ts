import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'
import authReducer from './shared/slices/authSlice.ts'
import serverReducer from './shared/slices/serverSlice.ts'
import channelReducer from './shared/slices/channelSlice.ts'
import chatReducer from './shared/slices/chatSlice.ts'
import membersReducer from './shared/slices/memberSlice.ts'
import inviteReducer from './shared/slices/inviteSlice.ts'

export const store = configureStore({
    reducer: {
        auth: authReducer,
        servers: serverReducer,
        channels: channelReducer,
        chat: chatReducer,
        members: membersReducer,
        invite: inviteReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['auth/handleAuthCallback/fulfilled'],
            },
        }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type AppStore = typeof store

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

import { injectStore } from './processes/axiosInstance'

injectStore(store)