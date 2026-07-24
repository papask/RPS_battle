'use client';

import { useSocket } from '@/components/providers/SocketProvider';
import { IPlayerState } from '@/types';
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
            <div className="bg-gray-800/40 border border-gray-700/50 p-4 rounded-xl backdrop-blur-sm w-full mb-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {t(`lobby.modes.${mode}`)} {t('profile.performance')}
                    </h2>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col">
                        <span className="text-green-400 font-bold text-xl">{wins}</span>
                        <span className="text-gray-500 text-xs uppercase">{t('profile.wins')}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-red-400 font-bold text-xl">{losses}</span>
                        <span className="text-gray-500 text-xs uppercase">{t('profile.losses')}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-yellow-400 font-bold text-xl">{currentStreak}</span>
                        <span className="text-gray-500 text-xs uppercase">{t('profile.streak')}</span>
                    </div>
                </div>
                {mode === 'rank' && (
                    <div className="mt-4 pt-4 border-t border-gray-700/30 grid grid-cols-2 gap-4 text-center">
                        <div className="flex flex-col">
                            <span className="text-purple-400 font-bold">{elo}</span>
                            <span className="text-gray-500 text-xs uppercase">{t('profile.elo')}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-yellow-400 font-bold">{tier} {division}</span>
                            <span className="text-gray-500 text-xs uppercase">{t('profile.rank')}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center min-h-[calc(100vh-6rem)] px-4 w-full max-w-md mx-auto py-8 space-y-6">

            {/* Profile Header */}
            <div className="text-center space-y-2">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto flex items-center justify-center text-4xl shadow-xl border-4 border-gray-900">
                    😎
                </div>
                <h1 className="text-2xl font-black text-white">{me.nickname}</h1>
            </div>

            {/* Stats */}
            <div className="w-full">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{t('profile.performance')}</h3>
                {renderStats('rank')}
                {renderStats('normal')}
            </div>

            {/* Inventory */}
            <div className="w-full">
                <div className="flex justify-between items-center mb-2 px-1">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                        {t('profile.inventory')}
                    </h3>
                    <span className="text-[10px] bg-gray-700/50 text-gray-300 px-2 py-0.5 rounded-full font-mono">
                        {me.inventory?.length || 0}
                    </span>
                </div>

                <div className="flex flex-col gap-2 bg-gray-800/20 p-2 rounded-xl border border-gray-700/30 min-h-[100px]">
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
                        <div className="flex flex-col items-center justify-center py-8 text-gray-500 space-y-2">
                            <span className="text-2xl">🎒</span>
                            <p className="text-xs">{t('profile.empty_inventory')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
