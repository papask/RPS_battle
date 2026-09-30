'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSocket } from './SocketProvider';
import { IPlayerState } from '@/types';

interface AuthContextType {
    user: IPlayerState | null;
    isLoading: boolean;
    logout: () => void;
    updateUser: (updates: Partial<IPlayerState>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const socket = useSocket();
    const [user, setUser] = useState<IPlayerState | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading by default

    useEffect(() => {
        if (!socket) return;

        console.log('[AuthProvider] Socket connected/changed');

        // The server authenticated us from the handshake token; ask for the result once our
        // listeners are attached (and again after every reconnect, e.g. a server restart).
        const syncUser = () => {
            if (localStorage.getItem('rps_token')) socket.emit('sync_user');
        };
        if (localStorage.getItem('rps_token')) {
            syncUser();
        } else {
            console.log('[AuthProvider] No token found, ready as guest.');
            setIsLoading(false);
        }
        socket.on('connect', syncUser);

        const handleAuthSuccess = (data: { message: string }) => {
            console.log('[AuthProvider] Auth Success:', data.message);
            setIsLoading(false);
        };

        const handleAuthError = (msg: string) => {
            console.error('[AuthProvider] Auth Error:', msg);
            localStorage.removeItem('rps_token');
            setUser(null);
            setIsLoading(false);
        };

        const handleUserUpdated = (updatedUser: IPlayerState) => {
            console.log('[AuthProvider] User Updated:', updatedUser);
            setUser(updatedUser);
            if (updatedUser.nickname) {
                localStorage.setItem('rps_nickname', updatedUser.nickname);
            }
            // We can also infer loading is done if user is updated
            setIsLoading(false);
        };

        const handleAuthToken = (token: string) => {
            console.log('[AuthProvider] Received new token');
            localStorage.setItem('rps_token', token);
        };

        socket.on('auth_success', handleAuthSuccess);
        socket.on('auth_error', handleAuthError);
        socket.on('user_updated', handleUserUpdated);
        socket.on('auth_token', handleAuthToken);

        return () => {
            socket.off('auth_success', handleAuthSuccess);
            socket.off('auth_error', handleAuthError);
            socket.off('user_updated', handleUserUpdated);
            socket.off('auth_token', handleAuthToken);
            socket.off('connect', syncUser);
        };

    }, [socket]);

    // Full reload: the server authenticates per connection, so a fresh socket is a fresh guest session
    const logout = () => {
        localStorage.removeItem('rps_token');
        localStorage.removeItem('rps_nickname');
        window.location.href = '/';
    };

    const updateUser = (updates: Partial<IPlayerState>) => {
        if (user) {
            setUser({ ...user, ...updates });
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};
