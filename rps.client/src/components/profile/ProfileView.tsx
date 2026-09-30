'use client';

import { useSocket } from '@/components/providers/SocketProvider';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../providers/AuthProvider';
import InventoryItem from '../shop/InventoryItem';

export default function ProfileView() {
    const { t } = useTranslation();
    const socket = useSocket();
    const { user: me, isLoading } = useAuth();
    const [equipping, setEquipping] = useState<string | null>(null);
    const router = require('next/navigation').useRouter();

    const handleEquipToggle = (itemId: string, isEquipped: boolean) => {
        if (!me || !socket || equipping) return;

        setEquipping(itemId);

        if (isEquipped) {
            socket.emit('unequip_item', itemId);
        } else {
            socket.emit('equip_item', itemId);
        }

        setTimeout(() => setEquipping(null), 500);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!me) {
        router.push('/');
        return null;
    }

    const renderStats = (mode: 'normal' | 'rank' | 'hardcore') => {
        if (!me.stats) return null;

        const stats = me.stats[mode];
        if (!stats) return null;

        const wins = stats.wins || 0;
        const losses = stats.losses || 0;
        // @ts-ignore
        const currentStreak = stats.currentStreak || 0;
        // @ts-ignore
        const elo = stats.elo || 0;
        // @ts-ignore
        const tier = stats.tier || '';
        // @ts-ignore
        const division = stats.division || '';

        return (
            <div className="bg-white border-b-4 border-gray-200 p-4 rounded-2xl shadow-sm w-full mb-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-lg">
                        {t(`lobby.modes.${mode}`)} {t('profile.performance')}
                    </h2>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col bg-green-50 rounded-xl p-2">
                        <span className="text-green-500 font-black text-xl">{wins}</span>
                        <span className="text-green-800/50 text-[10px] font-bold uppercase">{t('profile.wins')}</span>
                    </div>
                    <div className="flex flex-col bg-red-50 rounded-xl p-2">
                        <span className="text-red-400 font-black text-xl">{losses}</span>
                        <span className="text-red-800/50 text-[10px] font-bold uppercase">{t('profile.losses')}</span>
                    </div>
                    <div className="flex flex-col bg-yellow-50 rounded-xl p-2">
                        <span className="text-yellow-500 font-black text-xl">{currentStreak}</span>
                        <span className="text-yellow-800/50 text-[10px] font-bold uppercase">{t('profile.streak')}</span>
                    </div>
                </div>
                {mode === 'rank' && (
                    <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-100 grid grid-cols-2 gap-4 text-center">
                        <div className="flex flex-col">
                            <span className="text-purple-500 font-black text-2xl">{elo}</span>
                            <span className="text-gray-400 text-[10px] font-bold uppercase">{t('profile.elo')}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-orange-500 font-black text-xl">{tier} {division}</span>
                            <span className="text-gray-400 text-[10px] font-bold uppercase">{t('profile.rank')}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center min-h-[calc(100vh-6rem)] px-4 w-full max-w-md mx-auto py-8 space-y-6 pt-36 pb-32">

            {/* Profile Header */}
            <div className="text-center space-y-3">
                <div className="w-24 h-24 bg-white rounded-[2rem] mx-auto flex items-center justify-center text-5xl shadow-xl border-4 border-white rotate-3 hover:rotate-0 transition-transform duration-300">
                    😎
                </div>
                <div className="bg-white/80 backdrop-blur-sm px-6 py-2 rounded-full inline-block shadow-sm">
                    <h1 className="text-2xl font-black text-gray-800">{me.nickname}</h1>
                </div>
            </div>

            {/* Stats */}
            <div className="w-full">
                {renderStats('rank')}
                {renderStats('normal')}
            </div>

            {/* Inventory */}
            <div className="w-full">
                <div className="flex justify-between items-center mb-4 px-1">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest pl-2 border-l-4 border-[#FF6B6B]">
                        {t('profile.inventory')}
                    </h3>
                    <span className="text-xs bg-orange-100 text-orange-600 px-3 py-1 rounded-full font-bold">
                        {me.inventory?.length || 0} Items
                    </span>
                </div>

                <div className="flex flex-col gap-3 min-h-[100px]">
                    {me.inventory && me.inventory.length > 0 ? (
                        me.inventory.map((item, idx) => {
                            const isEquipped = me.equippedItems?.includes(item.itemId);
                            const isLoading = equipping === item.itemId;

                            return (
                                <InventoryItem
                                    key={idx}
                                    item={item}
                                    isEquipped={!!isEquipped}
                                    isLoading={isLoading}
                                    onToggle={() => handleEquipToggle(item.itemId, !!isEquipped)}
                                    index={idx}
                                />
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 space-y-3 bg-white/50 rounded-2xl border-2 border-dashed border-gray-200">
                            <span className="text-4xl grayscale opacity-50">🎒</span>
                            <p className="text-sm font-medium">{t('profile.empty_inventory')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
