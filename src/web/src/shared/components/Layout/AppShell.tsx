import React, { createContext, useContext, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { ServerRail } from './ServerSidebar'
import { ChannelSidebar } from '../../../modules/channels/components/ChannelSidebar'
import { ReconnectBanner } from './ReconnectBanner'
import { ModalProvider, useGlobalModal } from './ModalProvider'
import { CreateServerModal } from '../Modals/CreateServerModal'
import { ConfirmDialog } from '../Modals/ConfirmDialog'
import { useAppDispatch } from '../../../store'
import { fetchServers } from '../../slices/serverSlice'
import { logout } from '../../slices/authSlice'

interface LayoutCtx {
  hideRight: boolean
  setHideRight: (v: boolean) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const LayoutContext = createContext<LayoutCtx>({ hideRight: false, setHideRight: () => {} })
// eslint-disable-next-line react-refresh/only-export-components
export const useLayout = () => useContext(LayoutContext)

const ShellInner: React.FC = () => {
  const dispatch = useAppDispatch()
  const [hideRight, setHideRight] = useState(false)
  const { modal, close } = useGlobalModal()
  const [logoutLoading, setLogoutLoading] = useState(false)

  useEffect(() => {
    dispatch(fetchServers())
  }, [dispatch])

  const handleLogout = async () => {
    setLogoutLoading(true)
    try {
      await dispatch(logout())
    } finally {
      setLogoutLoading(false)
      close()
    }
  }

  return (
    <LayoutContext.Provider value={{ hideRight, setHideRight }}>
      <div className={`app${hideRight ? ' no-right' : ''}`}>
        <ServerRail />
        <ChannelSidebar />
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
    <ShellInner />
  </ModalProvider>
)
