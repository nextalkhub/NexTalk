import {BrowserRouter, Routes, Route, Navigate, useLocation, Outlet} from 'react-router-dom'
import { ServersPage } from './modules/servers/pages/ServersPage'
import { ChannelChatPage } from './modules/channels/pages/ChannelChatPage'
import { VoiceChannelPage } from './modules/voice/pages/VoiceChannelPage'
import { CreateServerPage } from './modules/servers/pages/CreateServerPage'
import { CreateChannelPage } from './modules/channels/pages/CreateChannelPage'
import { MembersPage } from './modules/members/pages/MembersPage'
import { ProfilePage } from './modules/profile/pages/ProfilePage'
import { InvitePage } from './modules/invite/pages/InvitePage'
import { NotFoundPage } from './pages/errors/NotFoundPage'
import { ServerErrorPage } from './pages/errors/ServerErrorPage'
import { AuthPage } from './modules/auth/pages/AuthPage'
import {store, useAppSelector} from "./store.ts";
import {Provider} from "react-redux";
import React from "react";
import {selectIsAuthenticated, selectIsLoading} from "./shared/slices/authSlice.ts";
import {OidcCallback} from "./modules/auth/oidc/OidcCallback.tsx";
import { SignalRProvider } from "./SignalrContext.tsx"
import {GatewayListener} from "./GatewayListener.tsx";

export const ProtectedRoute: React.FC = () => {
    const isAuth = useAppSelector(selectIsAuthenticated)
    const isLoading = useAppSelector(selectIsLoading)
    const location = useLocation()

    if (isLoading) return null

    if (!isAuth) {
        return <Navigate to="/auth" replace state={{ from: location }} />
    }

    return <Outlet />
}

function App() {
    return (
        <Provider store={store}>
            <BrowserRouter>
                <SignalRProvider>
                    <GatewayListener />

                    <Routes>

                        <Route path="/auth" element={<AuthPage />} />
                        <Route path="/" element={<Navigate to="/servers" replace />} />
                        <Route path="/callback" element={<OidcCallback />} />

                        <Route element={<ProtectedRoute />}>

                            <Route path="/servers" element={<ServersPage />} />

                            <Route
                                path="/servers/:serverId/channels"
                                element={<ChannelChatPage />}
                            />

                            <Route
                                path="/servers/:serverId/channels/:channelId"
                                element={<ChannelChatPage />}
                            />

                            <Route
                                path="/servers/:serverId/voice/:channelId"
                                element={<VoiceChannelPage />}
                            />

                            <Route
                                path="/create-server"
                                element={<CreateServerPage />}
                            />

                            <Route
                                path="/servers/:serverId/create-channel"
                                element={<CreateChannelPage />}
                            />

                            <Route
                                path="/servers/:serverId/members"
                                element={<MembersPage />}
                            />

                            <Route
                                path="/servers/:serverId/invite"
                                element={<InvitePage />}
                            />

                            <Route
                                path="/profile"
                                element={<ProfilePage />}
                            />

                        </Route>

                        <Route path="/error" element={<ServerErrorPage />} />
                        <Route path="*" element={<NotFoundPage />} />

                    </Routes>
                </SignalRProvider>
            </BrowserRouter>
        </Provider>
    )
}

export default App