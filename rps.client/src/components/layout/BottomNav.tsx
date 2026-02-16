'use client';

import { useRouter, usePathname } from 'next/navigation';

interface BottomNavProps { }

export default function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    const navItems = [
        {
            label: 'Shop',
            icon: '🛍️',
            action: () => router.push('/shop'),
            active: isActive('/shop')
        },
        {
            label: 'Battle',
            icon: '⚔️',
            action: () => router.push('/'),
            active: isActive('/')
        },
        {
            label: 'Rank',
            icon: '🏆',
            action: () => router.push('/leaderboard'),
            active: isActive('/leaderboard')
        },
        {
            label: 'Items',
            icon: '🎒',
            action: () => router.push('/inventory'),
            active: isActive('/inventory')
        }
    ];

    return (
        <div className="fixed bottom-0 left-0 w-full z-50 md:left-1/2 md:-translate-x-1/2 md:max-w-md h-20 bg-gray-900/95 backdrop-blur-xl border-t border-gray-700/50 pb-safe safe-bottom md:border-x border-gray-800">
            <div className="flex items-center justify-around h-full px-2">
                {navItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={item.action}
                        className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-200 active:scale-95 ${item.active
                            ? 'bg-purple-500/10 text-purple-400'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <span className={`text-2xl mb-1 ${item.active ? 'scale-110' : ''} transition-transform`}>
                            {item.icon}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                            {item.label}
                        </span>
                        {item.active && (
                            <span className="absolute bottom-2 w-1 h-1 bg-purple-500 rounded-full" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
