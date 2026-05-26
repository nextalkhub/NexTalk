import React, { createContext, useContext, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { ServerRail } from './ServerSidebar'
import { ChannelSidebar } from '../../../modules/channels/components/ChannelSidebar'
import { useAppDispatch } from '../../../store'
import { fetchServers } from '../../slices/serverSlice'

interface LayoutCtx {
  hideRight: boolean
  setHideRight: (v: boolean) => void
}

export const LayoutContext = createContext<LayoutCtx>({ hideRight: false, setHideRight: () => {} })
export const useLayout = () => useContext(LayoutContext)

export const AppShell: React.FC = () => {
  const dispatch = useAppDispatch()
  const [hideRight, setHideRight] = useState(false)

  useEffect(() => {
    dispatch(fetchServers())
  }, [dispatch])

  return (
    <LayoutContext.Provider value={{ hideRight, setHideRight }}>
      <div className={`app${hideRight ? ' no-right' : ''}`}>
        <ServerRail />
        <ChannelSidebar />
        <Outlet />
      </div>
    </LayoutContext.Provider>
  )
}
