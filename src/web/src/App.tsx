import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store, useAppSelector, useAppDispatch } from './store'
import { selectIsAuthenticated, selectIsLoading, initializeAuth } from './shared/slices/authSlice'
import { SignalRProvider } from './SignalrContext'
import { GatewayListener } from './GatewayListener'
import { AppShell } from './shared/components/Layout/AppShell'
import { AuthPage } from './modules/auth/pages/AuthPage'
import { OidcCallback } from './modules/auth/oidc/OidcCallback'
import { ChannelChatPage } from './modules/channels/pages/ChannelChatPage'
import { VoiceChannelPage } from './modules/voice/pages/VoiceChannelPage'
import { InvitePage } from './modules/invite/pages/InvitePage'
import { AcceptInvitePage } from './modules/invite/pages/AcceptInvitePage'
import { ProfilePage } from './modules/profile/pages/ProfilePage'
import { ServerSettingsPage } from './modules/servers/pages/ServerSettingsPage'
import { AppSettingsPage } from './modules/settings/pages/AppSettingsPage'
import { HomePage } from './pages/home/HomePage'
import { NotFoundPage } from './pages/errors/NotFoundPage'
import { ServerErrorPage } from './pages/errors/ServerErrorPage'

export const ProtectedRoute: React.FC = () => {
  const isAuth = useAppSelector(selectIsAuthenticated)
  const isLoading = useAppSelector(selectIsLoading)
  const location = useLocation()

  if (isLoading) return null
  if (!isAuth) return <Navigate to="/auth" replace state={{ from: location }} />
  return <Outlet />
}

function AppRoutes() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(initializeAuth())
  }, [dispatch])

  return (
    <BrowserRouter>
      <SignalRProvider>
        <GatewayListener />
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/callback" element={<OidcCallback />} />
          <Route path="/" element={<Navigate to="/servers" replace />} />

          {/* Public invite acceptance - handles its own auth check internally
              so the OIDC redirect remembers the return URL. */}
          <Route path="/invite/:code" element={<AcceptInvitePage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/servers" element={<HomePage />} />
              <Route path="/servers/:serverId/channels" element={<ChannelChatPage />} />
              <Route path="/servers/:serverId/channels/:channelId" element={<ChannelChatPage />} />
              <Route path="/servers/:serverId/voice/:channelId" element={<VoiceChannelPage />} />
              <Route path="/servers/:serverId/invite" element={<InvitePage />} />
              <Route path="/servers/:serverId/settings" element={<ServerSettingsPage />} />
              <Route path="/settings" element={<AppSettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="/error" element={<ServerErrorPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </SignalRProvider>
    </BrowserRouter>
  )
}


function App() {
  return (
    <Provider store={store}>
      <AppRoutes />
    </Provider>
  )
}

export default App
