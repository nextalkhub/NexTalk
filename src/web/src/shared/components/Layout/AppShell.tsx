import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
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

interface LayoutCtx {
  hideRight: boolean
  setHideRight: (v: boolean) => void
  mobileNavOpen: boolean
  setMobileNavOpen: (v: boolean) => void
  mobileRightOpen: boolean
  setMobileRightOpen: (v: boolean) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const LayoutContext = createContext<LayoutCtx>({
  hideRight: false, setHideRight: () => {},
  mobileNavOpen: false, setMobileNavOpen: () => {},
  mobileRightOpen: false, setMobileRightOpen: () => {},
})
// eslint-disable-next-line react-refresh/only-export-components
export const useLayout = () => useContext(LayoutContext)

const MOBILE_BP = 768

const ShellInner: React.FC = () => {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const [hideRight, setHideRight] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [mobileRightOpen, setMobileRightOpen] = useState(false)
  const { modal, close } = useGlobalModal()
  const [logoutLoading, setLogoutLoading] = useState(false)
  const touchStartX = useRef(0)

  useEffect(() => { dispatch(fetchServers()) }, [dispatch])

  // Закрывать nav-drawer при смене маршрута
  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    setLogoutLoading(true)
    try {
      await dispatch(logout())
    } finally {
      setLogoutLoading(false)
      close()
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx > 60 && touchStartX.current < 40 && !mobileNavOpen) {
      setMobileNavOpen(true)
    } else if (dx < -60 && mobileNavOpen) {
      setMobileNavOpen(false)
    }
  }

  const closeAll = () => {
    setMobileNavOpen(false)
    setMobileRightOpen(false)
  }

  const appClass = [
    'app',
    hideRight ? 'no-right' : '',
    mobileNavOpen ? 'mobile-nav-open' : '',
    mobileRightOpen ? 'mobile-right-open' : '',
  ].filter(Boolean).join(' ')

  return (
    <LayoutContext.Provider value={{ hideRight, setHideRight, mobileNavOpen, setMobileNavOpen, mobileRightOpen, setMobileRightOpen }}>
      <div
        className={appClass}
        onTouchStart={window.innerWidth <= MOBILE_BP ? handleTouchStart : undefined}
        onTouchEnd={window.innerWidth <= MOBILE_BP ? handleTouchEnd : undefined}
      >
        {/* drawer-wrap: display:contents на desktop → rail и side в grid.
            На mobile: position:fixed flex-контейнер → drawer. */}
        <div className="drawer-wrap">
          <ServerRail />
          <ChannelSidebar />
        </div>

        <div className="mobile-backdrop" onClick={closeAll} />

        <Outlet />
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
