// import React, { createContext, useContext, useEffect, useState } from 'react';
// import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
//
// const SignalRContext = createContext<HubConnection | null>(null);
//
// export const SignalRProvider = ({ children }: { children: React.ReactNode }) => {
//     const [connection, setConnection] = useState<HubConnection | null>(null);
//
//     useEffect(() => {
//         const newConnection = new HubConnectionBuilder()
//             .withUrl("http://localhost:19288/quizhub", {
//                 accessTokenFactory: () => localStorage.getItem('token') || ''
//             })
//             .withAutomaticReconnect()
//             .build();
//
//         newConnection.start()
//             .then(() => {
//                 console.log('SignalR Connected');
//                 setConnection(newConnection);
//             })
//             .catch(err => console.error('SignalR Connection Error:', err));
//
//         return () => {
//             newConnection.stop();
//         };
//     }, []);
//
//     return (
//         <SignalRContext.Provider value={connection}>
//             {children}
//         </SignalRContext.Provider>
//     );
// };
//
// export const useSignalR = () => useContext(SignalRContext);