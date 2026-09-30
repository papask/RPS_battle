'use client';

import { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

import { usePathname } from 'next/navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { user: me } = useAuth();
    const pathname = usePathname();
    const isGameRoom = pathname?.startsWith('/room/');

    return (
        <div className="w-full md:max-w-md mx-auto relative bg-[#fff8e1] min-h-screen shadow-2xl md:border-x border-gray-200">
            {me && <TopBar />}

            {/* Main Content Area */}
            {children}

            {me && !isGameRoom && (
                <BottomNav />
            )}
        </div>
    );
}
