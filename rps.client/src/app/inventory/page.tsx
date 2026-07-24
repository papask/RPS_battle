'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useSocket } from '@/components/providers/SocketProvider';
import InventoryItem from '@/components/shop/InventoryItem';

export default function InventoryPage() {
    const { user } = useAuth();
    const socket = useSocket();
    const [equipping, setEquipping] = useState<string | null>(null);

    const handleEquipToggle = (itemId: string, isEquipped: boolean) => {
        if (!user || !socket || equipping) return;

        setEquipping(itemId);

        // Listen for one-time success/error or just wait for user_updated
        // We'll rely on user_updated for state, but use a timeout to clear loading if needed

        if (isEquipped) {
            socket.emit('unequip_item', itemId);
        } else {
            socket.emit('equip_item', itemId);
        }

        // Simple timeout to reset loading state (server response is usually fast)
        setTimeout(() => setEquipping(null), 500);
    };

    return (
        <div className="w-full min-h-[calc(100vh-9rem)] pt-20 pb-24 px-4 flex flex-col items-center">
            <div className="w-full max-w-md space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-2xl border border-gray-800 backdrop-blur-sm">
                    <h1 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <span className="text-3xl">🎒</span> Inventory
                    </h1>
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-wide bg-gray-800 px-3 py-1 rounded-full">
                        {user?.inventory?.length || 0} Items
                    </div>
                </div>

                {/* Grid */}
                <div className="grid gap-4">
                    {user?.inventory && user.inventory.length > 0 ? (
                        user.inventory.map((item, idx) => {
                            const isEquipped = user.equippedItems?.includes(item.itemId);
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
                        <div className="text-center py-20 bg-gray-800/30 rounded-3xl border border-gray-800 border-dashed">
                            <span className="text-6xl opacity-20 block mb-4 grayscale">🎒</span>
                            <p className="text-gray-500 font-bold text-lg">Your backpack is empty</p>
                            <p className="text-gray-600 text-sm mt-2">Visit the Shop to buy items!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
