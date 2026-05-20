import {useContext} from "react";
import {SignalRContext} from "./signalRContext.ts";

export const useSignalR = () => useContext(SignalRContext)