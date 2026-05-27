import React, {
    useEffect,
    useState,
} from 'react'

import {
    HttpTransportType,
    HubConnection,
    HubConnectionBuilder,
    LogLevel,
} from '@microsoft/signalr'
import { selectIsAuthenticated } from "./shared/slices/authSlice.ts"
import { useAppDispatch, useAppSelector } from "./store.ts"
import { SignalRContext } from "./shared/hooks/signalRContext.ts"
import { oidcService } from "./modules/auth/oidc/oidcService.ts"
import { setPresenceBulk } from "./shared/slices/presenceSlice.ts"

const fetchPresenceSnapshot = async (conn: HubConnection, dispatch: ReturnType<typeof useAppDispatch>) => {
    try {
        const ids = await conn.invoke<string[]>('GetOnlineUsers')
        dispatch(setPresenceBulk(ids))
    } catch (err) {
        console.warn('GetOnlineUsers failed:', err)
    }
}

export const SignalRProvider = ({
                                    children,
                                }: {
    children: React.ReactNode
}) => {
    const isAuthenticated = useAppSelector(selectIsAuthenticated)
    const dispatch = useAppDispatch()

    const [connection, setConnection] = useState<HubConnection | null>(null)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        if (!isAuthenticated) return

        if (!oidcService.getAccessToken()) return

        // Фабрика вызывается на каждом коннекте/реконнекте — берём свежий токен
        // из oidcService, иначе после refresh SignalR будет ходить с протухшим.
        const conn = new HubConnectionBuilder()
            .withUrl(import.meta.env.VITE_WS_URL, {
                accessTokenFactory: () => oidcService.getAccessToken() ?? '',
                transport: HttpTransportType.WebSockets,
                skipNegotiation: true,
            })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.Information)
            .build()

        conn.start()
            .then(() => {
                console.log('SignalR connected')
                setIsConnected(true)
                fetchPresenceSnapshot(conn, dispatch)
            })
            .catch(err => {
                console.error('SignalR error:', err)
            })

        conn.onclose(() => setIsConnected(false))
        conn.onreconnecting(() => setIsConnected(false))
        conn.onreconnected(() => {
            setIsConnected(true)
            fetchPresenceSnapshot(conn, dispatch)
        })

        setConnection(conn)

        return () => {
            conn.stop()
            setConnection(null)
            setIsConnected(false)
        }
    }, [isAuthenticated, dispatch])

    useEffect(() => {
        if (!connection) return

        const interval = setInterval(() => {
            connection.invoke('Heartbeat')
                .catch(console.error)
        }, 20000)

        return () => clearInterval(interval)
    }, [connection])

    return (
        <SignalRContext.Provider
            value={{
                connection,
                isConnected,
            }}
        >
            {children}
        </SignalRContext.Provider>
    )
}
