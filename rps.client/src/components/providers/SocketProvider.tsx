
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3701';
        // The token rides in the handshake so the server authenticates before any event is handled.
        // A function (not a value) so automatic reconnects pick up a token issued mid-session.
        const socketInstance = io(socketUrl, {
            auth: (cb) => {
                let token: string | null = null;
                try { token = localStorage.getItem('rps_token'); } catch { }
                cb(token ? { token } : {});
            },
        });

        socketInstance.on('connect', () => {
            console.log('Connected to server via socket.io');
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
