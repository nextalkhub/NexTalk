import {createContext} from "react";
import {HubConnection} from "@microsoft/signalr";

interface SignalRContextType {
    connection: HubConnection | null
    isConnected: boolean
}

export const SignalRContext = createContext<SignalRContextType>({
    connection: null,
    isConnected: false,
})