'use client';

import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';

import { useTranslation } from 'react-i18next';

export default function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation();

    const isActive = (path: string) => pathname === path;

    const navItems = [
        { id: 'home', label: t('navigation.home'), icon: '/icons/nav/home.svg', path: '/' },
        { id: 'shop', label: t('navigation.shop'), icon: '/icons/nav/shop.svg', path: '/shop' },
        { id: 'battle', label: t('navigation.battle'), icon: '/icons/nav/battle.svg', path: '/battle', main: true },
        { id: 'rank', label: t('navigation.rank'), icon: '/icons/nav/rank.svg', path: '/leaderboard' },
        { id: 'profile', label: t('navigation.profile'), icon: '/icons/nav/profile.svg', path: '/profile' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 border-t border-orange-100 shadow-[0_-2px_0_#000] md:border-orange-100 pb-safe md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-md md:border-x">
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
                                <div className={`w-20 h-20 flex items-center justify-center border-4 border-[#1b1030] shadow-[4px_4px_0_#1b1030] outline-4 outline-white -outline-offset-8 transition-transform duration-100 group-hover:-translate-y-0.5 group-active:translate-x-1 group-active:translate-y-1 group-active:shadow-none ${active
                                    ? 'bg-[#FF6B6B]'
                                    : 'bg-[#4ECDC4]'
                                    }`}>
                                    <Image src={item.icon} alt="" width={48} height={48} className="[image-rendering:pixelated]" />
                                </div>
                                <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-colors ${active ? 'text-[#FF6B6B]' : 'text-gray-400'
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
                            className="group flex flex-col items-center py-2 px-2 min-w-[4rem]"
                        >
                            <Image
                                src={item.icon}
                                alt=""
                                width={32}
                                height={32}
                                className={`mb-1 [image-rendering:pixelated] transition-transform duration-100 group-active:translate-y-0.5 ${active
                                    ? '-translate-y-1 drop-shadow-[2px_2px_0_#1b1030]'
                                    : 'grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100'
                                    }`}
                            />
                            <span className={`text-[10px] font-black uppercase tracking-wide ${active ? 'text-[#FF6B6B]' : 'text-gray-400'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
