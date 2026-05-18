import React, {
    useEffect,
    useState,
} from 'react'

import {
    HubConnection,
    HubConnectionBuilder,
    LogLevel,
} from '@microsoft/signalr'
import {selectIsAuthenticated} from "./shared/slices/authSlice.ts";
import {useAppSelector} from "./store.ts";
import { SignalRContext } from "./shared/hooks/signalRContext.ts";

export const SignalRProvider = ({
                                    children,
                                }: {
    children: React.ReactNode
}) => {
    const isAuthenticated = useAppSelector(selectIsAuthenticated)

    const [connection, setConnection] = useState<HubConnection | null>(null)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        if (!isAuthenticated) return

        const token = localStorage.getItem('access_token')

        if (!token) return

        const conn = new HubConnectionBuilder()
            .withUrl(import.meta.env.VITE_WS_URL, {
                accessTokenFactory: () => token,
            })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.Information)
            .build()

        conn.start()
            .then(() => {
                console.log('SignalR connected')
                setIsConnected(true)
            })
            .catch(err => {
                console.error('SignalR error:', err)
            })

        conn.onclose(() => {
            setIsConnected(false)
        })

        setConnection(conn)

        return () => {
            conn.stop()
        }
    }, [isAuthenticated])

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

