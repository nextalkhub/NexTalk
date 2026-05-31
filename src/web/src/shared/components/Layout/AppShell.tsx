import React, { createContext, useContext, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ServerRail } from './ServerSidebar'
import { ChannelSidebar } from '../../../modules/channels/components/ChannelSidebar'
import { ReconnectBanner } from './ReconnectBanner'
import { ModalProvider, useGlobalModal } from './ModalProvider'
import { CreateServerModal } from '../Modals/CreateServerModal'
import { ConfirmDialog } from '../Modals/ConfirmDialog'
import { useAppDispatch } from '../../../store'
import { fetchServers } from '../../slices/serverSlice'
import { logout } from '../../slices/authSlice'
import { VoiceSessionProvider } from '../../contexts/VoiceContext'
import { useIsPhone } from '../../hooks/useBreakpoint'
import { useSwipe } from '../../hooks/useSwipe'

interface LayoutCtx {
  hideRight: boolean
  setHideRight: (v: boolean) => void
  drawerOpen: boolean
  setDrawerOpen: (v: boolean) => void
  membersOpen: boolean
  setMembersOpen: (v: boolean) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const LayoutContext = createContext<LayoutCtx>({
  hideRight: false, setHideRight: () => {},
  drawerOpen: false, setDrawerOpen: () => {},
  membersOpen: false, setMembersOpen: () => {},
})
// eslint-disable-next-line react-refresh/only-export-components
export const useLayout = () => useContext(LayoutContext)

const ShellInner: React.FC = () => {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const [hideRight, setHideRight] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const { modal, close } = useGlobalModal()
  const [logoutLoading, setLogoutLoading] = useState(false)
  const isPhone = useIsPhone()

  useEffect(() => { dispatch(fetchServers()) }, [dispatch])

  useEffect(() => {
    setDrawerOpen(false)
    setMembersOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (drawerOpen || membersOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [drawerOpen, membersOpen])

  useSwipe({
    enabled: isPhone,
    onSwipeRight: () => !membersOpen && setDrawerOpen(true),
    onSwipeLeft:  () => drawerOpen && setDrawerOpen(false),
  })

  const handleLogout = async () => {
    setLogoutLoading(true)
    try {
      await dispatch(logout())
    } finally {
      setLogoutLoading(false)
      close()
    }
  }

  const closeAll = () => {
    setDrawerOpen(false)
    setMembersOpen(false)
  }

  const appClass = [
    'app-shell',
    hideRight ? 'no-right' : '',
    drawerOpen ? 'is-drawer-open' : '',
    membersOpen ? 'is-members-open' : '',
  ].filter(Boolean).join(' ')

  return (
    <LayoutContext.Provider value={{ hideRight, setHideRight, drawerOpen, setDrawerOpen, membersOpen, setMembersOpen }}>
      <div className={appClass}>
        <ServerRail />
        <ChannelSidebar />

        <Outlet />

        {(drawerOpen || membersOpen) && (
          <div className="mobile-backdrop" onClick={closeAll} />
        )}
      </div>
      <ReconnectBanner />

      <CreateServerModal open={modal === 'create-server'} onClose={close} />
      <ConfirmDialog
        open={modal === 'logout'}
        title="Выйти из NexTalk?"
        description="Сессия будет завершена, токен отозван. При следующем входе нужно будет авторизоваться через Zitadel."
        confirmLabel="Выйти"
        danger
        loading={logoutLoading}
        onConfirm={handleLogout}
        onClose={close}
      />
    </LayoutContext.Provider>
  )
}

export const AppShell: React.FC = () => (
  <ModalProvider>
    <VoiceSessionProvider>
      <ShellInner />
    </VoiceSessionProvider>
  </ModalProvider>
)
