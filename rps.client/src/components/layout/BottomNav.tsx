'use client';

import { useRouter, usePathname } from 'next/navigation';

import { useTranslation } from 'react-i18next';

export default function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation();

    const isActive = (path: string) => pathname === path;

    const navItems = [
        { id: 'home', label: t('navigation.home'), icon: '🏠', path: '/' },
        { id: 'shop', label: t('navigation.shop'), icon: '🛍️', path: '/shop' },
        { id: 'battle', label: t('navigation.battle'), icon: '⚔️', path: '/battle', main: true },
        { id: 'rank', label: t('navigation.rank'), icon: '🏆', path: '/leaderboard' },
        { id: 'profile', label: t('navigation.profile'), icon: '👤', path: '/profile' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 pb-safe md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-md md:border-x">
            <div className="flex justify-around items-end px-2 pb-2">
                {navItems.map((item) => {
                    const active = isActive(item.path);

                    if (item.main) {
                        return (
                            <button
                                key={item.id}
                                onClick={() => router.push(item.path)}
                                className="relative -top-6 group"
                            >
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg transition-transform duration-200 group-active:scale-95 border-4 ${active
                                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 border-gray-900 text-white'
                                    : 'bg-gray-800 border-gray-900 text-gray-400 group-hover:bg-gray-700'
                                    }`}>
                                    {item.icon}
                                </div>
                                <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${active ? 'text-white' : 'text-gray-500'
                                    }`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    }

                    return (
                        <button
                            key={item.id}
                            onClick={() => router.push(item.path)}
                            className={`flex flex-col items-center py-3 px-2 min-w-[4rem] transition-colors duration-200 ${active ? 'text-white' : 'text-gray-600 hover:text-gray-400'
                                }`}
                        >
                            <span className={`text-2xl mb-1 transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                                {item.icon}
                            </span>
                            <span className="text-[10px] font-medium uppercase tracking-wide">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
