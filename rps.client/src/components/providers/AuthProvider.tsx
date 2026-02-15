'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSocket } from './SocketProvider';
import { IPlayerState } from '@/types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: IPlayerState | null;
    isLoading: boolean;
    loginWithToken: (token: string) => void;
    logout: () => void;
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
    const router = useRouter();
    const [user, setUser] = useState<IPlayerState | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading by default

    useEffect(() => {
        if (!socket) return;

        console.log('[AuthProvider] Socket connected/changed');

        const savedToken = localStorage.getItem('rps_token');
        if (savedToken) {
            console.log('[AuthProvider] Found token, attempting login...');
            socket.emit('login_with_token', savedToken);
        } else {
            console.log('[AuthProvider] No token found, ready as guest.');
            setIsLoading(false);
        }

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
        };

    }, [socket]);

    const loginWithToken = (token: string) => {
        if (socket) {
            setIsLoading(true);
            socket.emit('login_with_token', token);
        }
    };

    const logout = () => {
        localStorage.removeItem('rps_token');
        localStorage.removeItem('rps_nickname');
        setUser(null);
        setIsLoading(false);
        router.push('/');
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, loginWithToken, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
