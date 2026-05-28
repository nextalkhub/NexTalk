import React from 'react'
import { useSignalR } from '../../hooks/useSignalR'

/**
 * Connection-status banner. Shown only when SignalR is reconnecting or
 * disconnected. Sits at the top of the main area inside AppShell.
 */
export const ReconnectBanner: React.FC = () => {
  const { connection, isConnected } = useSignalR()

  // Hide the banner entirely until SignalR has had a chance to connect for
  // the first time. Without this we'd flash a yellow warning on every page
  // load during the initial handshake.
  if (!connection) return null
  if (isConnected) return null

  return (
    <div className="reconnect-banner" role="status" aria-live="polite">
      <span className="spin" />
      Соединение потеряно — пытаемся восстановить...
    </div>
  )
}
