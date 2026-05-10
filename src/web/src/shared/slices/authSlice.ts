import {createAsyncThunk, createSlice, PayloadAction} from '@reduxjs/toolkit'
import {oidcService} from "../../modules/auth/oidc/oidcService.ts";
import {User} from "../types";

export interface Tokens {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    token_type?: string
    scope?: string
}

interface AuthState {
    user: User | null
    tokens: Tokens | null
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null
}

const initialState: AuthState = {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
}

export const login = createAsyncThunk(
    'auth/login',
    async () => {

        if (import.meta.env.VITE_USE_AUTH_MOCK === 'true') {
            await new Promise(res => setTimeout(res, 300))

            const storedUser = localStorage.getItem('mock_user')

            if (!storedUser) {
                throw new Error('Пользователь не найден')
            }

            const user = JSON.parse(storedUser)

            // if (user.email !== email) {
            //     throw new Error('Неверный email')
            // }

            return {
                user,
                tokens: {
                    access_token: 'mock-token',
                    expires_in: 3600,
                },
            }
        }

        sessionStorage.setItem('return_url', window.location.pathname)
        await oidcService.login()
        return null
    }
)

export const register = createAsyncThunk(
    'auth/register',
    async () => {
        // if (import.meta.env.VITE_USE_AUTH_MOCK === 'true') {
        //     await new Promise(res => setTimeout(res, 300))
        //
        //     const newUser = {
        //         id: Date.now().toString(),
        //         name,
        //         nickname,
        //         email,
        //         createdAt: new Date(Date.now())
        //     }
        //
        //     localStorage.setItem('mock_user', JSON.stringify(newUser))
        //
        //     return {
        //         user: newUser,
        //         tokens: {
        //             access_token: 'mock-token',
        //             expires_in: 3600,
        //         },
        //     }
        // }
        //
        // throw new Error('Register not implemented')
    }
)

export const logout = createAsyncThunk(
    'auth/logout',
    async () => {
        if (import.meta.env.VITE_USE_AUTH_MOCK === 'true') {
            return null
        }

        await oidcService.logout()
        return null
    }
)

export const initializeAuth = createAsyncThunk(
    'auth/initialize',
    async () => {
        if (import.meta.env.VITE_USE_AUTH_MOCK === 'true') {
            return {
                user: {
                    id: 'mock-id',
                    name: 'Mock User',
                    email: 'mock@example.com',
                    nickname: 'mockuser',
                    createdAt: new Date().toISOString()
                },
                tokens: {
                    access_token: 'mock-token',
                    expires_in: 3600,
                },
                isAuthenticated: true,
            }
        }
        const isAuthenticated = oidcService.isAuthenticated()
        const userInfo = oidcService.getUserInfo()
        const accessToken = oidcService.getAccessToken()

        if (isAuthenticated && userInfo && accessToken) {
            return {
                user: {
                    id: userInfo.sub,
                    name: userInfo.name,
                    email: userInfo.email,
                    nickname: userInfo.preferred_username,
                    createdAt: new Date().toISOString(),
                },
                tokens: {
                    access_token: accessToken,
                    refresh_token: undefined,
                    expires_in: 3600,
                },
                isAuthenticated: true,
            }
        }

        return null
    }
)

export const refreshToken = createAsyncThunk(
    'auth/refreshToken',
    async () => {
        return await oidcService.refreshToken()
    }
)

export const handleAuthCallback = createAsyncThunk(
    'auth/handleCallback',
    async ({ code, state }: { code: string; state: string }) => {
        const tokens = await oidcService.handleCallback(code, state)
        const userInfo = oidcService.getUserInfo()

        if (!userInfo) {
            throw new Error('User info not loaded')
        }

        return {
            user: {
                id: userInfo.sub,
                name: userInfo.name,
                email: userInfo.email,
                nickname: userInfo.preferred_username,
                createdAt: new Date().toISOString(),
            },
            tokens: {
                access_token: tokens?.access_token,
                refresh_token: tokens?.refresh_token,
                expires_in: tokens?.expires_in,
                token_type: tokens?.token_type,
                scope: tokens?.scope,
            },
        }
    }
)

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<User | null>) => {
            state.user = action.payload
            state.isAuthenticated = !!action.payload
        },

        setTokens: (state, action: PayloadAction<Tokens | null>) => {
            state.tokens = action.payload
        },

        setAuthenticated: (state, action: PayloadAction<boolean>) => {
            state.isAuthenticated = action.payload
        },

        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload
        },

        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload
        },

        clearAuth: (state) => {
            state.user = null
            state.tokens = null
            state.isAuthenticated = false
            state.error = null
        },
    },
    extraReducers: (builder) => {
        builder.addCase(login.pending, (state) => {
            state.isLoading = true
            state.error = null
        })
        builder.addCase(login.fulfilled, (state, action) => {
            state.isLoading = false

            if (action.payload) {
                state.user = action.payload.user
                state.tokens = action.payload.tokens
                state.isAuthenticated = true
            }
        })
        builder.addCase(login.rejected, (state, action) => {
            state.isLoading = false
            state.error = action.error.message || 'Login failed'
        })

        builder.addCase(register.pending, (state) => {
            state.isLoading = true
            state.error = null
        })
        // builder.addCase(register.fulfilled, (state, action) => {
        //     state.isLoading = false
        //     state.user = action.payload.user
        //     state.tokens = action.payload.tokens
        //     state.isAuthenticated = true
        // })
        builder.addCase(register.rejected, (state, action) => {
            state.isLoading = false
            state.error = action.error.message || 'Register failed'
        })

        builder.addCase(initializeAuth.pending, (state) => {
            state.isLoading = true
        })
        builder.addCase(initializeAuth.fulfilled, (state, action) => {
            state.isLoading = false
            if (action.payload) {
                state.user = action.payload.user
                state.tokens = action.payload.tokens
                state.isAuthenticated = true
            }
        })
        builder.addCase(initializeAuth.rejected, (state, action) => {
            state.isLoading = false
            state.error = action.error.message || 'Initialization failed'
        })

        builder.addCase(handleAuthCallback.pending, (state) => {
            state.isLoading = true
            state.error = null
        })
        builder.addCase(handleAuthCallback.fulfilled, (state, action) => {
            state.isLoading = false
            state.user = action.payload.user
            state.tokens = action.payload.tokens
            state.isAuthenticated = true
            state.error = null
        })
        builder.addCase(handleAuthCallback.rejected, (state, action) => {
            state.isLoading = false
            state.error = action.error.message || 'Callback handling failed'
        })

        builder.addCase(refreshToken.fulfilled, (state, action) => {
            if (!action.payload || !state.tokens) return
            state.tokens.access_token = action.payload.access_token
            if (action.payload.refresh_token) {
                state.tokens.refresh_token = action.payload.refresh_token
            }
            state.tokens.expires_in = action.payload.expires_in
        })
        builder.addCase(refreshToken.rejected, (state) => {
            state.user = null
            state.tokens = null
            state.isAuthenticated = false
        })

        builder.addCase(logout.fulfilled, (state) => {
            state.user = null
            state.tokens = null
            state.isAuthenticated = false
            state.error = null
        })
    },
})

export const {
    setUser,
    setTokens,
    setAuthenticated,
    setLoading,
    setError,
    clearAuth,
} = authSlice.actions

export default authSlice.reducer

export const selectUser = (state: { auth: AuthState }) => state.auth.user
export const selectTokens = (state: { auth: AuthState }) => state.auth.tokens
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error
export const selectAccessToken = (state: { auth: AuthState }) => state.auth.tokens?.access_token