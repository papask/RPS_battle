'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Item } from '@/types';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function ShopPage() {
    const { t } = useTranslation();
    const { user, updateUser } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/shop`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setItems(data);
            }
        } catch (e) {
            console.error('Failed to fetch items', e);
        }
    };

    const handleBuy = async (itemId: string) => {
        if (!user || !user._id) {
            setError(t('shop.user_not_identified'));
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/shop/buy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id, itemId })
            });
            const data = await res.json();

            if (data.error) {
                setError(data.error); // Keep server error for now or map it
            } else {
                // Success - update local state immediately from response
                // (Socket event is also sent, but this ensures immediate UI feedback)
                updateUser({
                    tokens: data.tokens,
                    inventory: data.inventory
                });
            }
        } catch (e) {
            setError(t('shop.purchase_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full min-h-[calc(100vh-9rem)] pt-20 pb-24 px-4 flex flex-col items-center">
            <div className="w-full max-w-md space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-2xl border border-gray-800 backdrop-blur-sm">
                    <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 uppercase tracking-widest">
                        {t('shop.title')}
                    </h1>
                    <div className="bg-gray-800 px-4 py-2 rounded-xl border border-yellow-500/30 text-yellow-500 font-mono font-bold flex items-center gap-2 shadow-inner">
                        <span className="text-lg">💎</span>
                        {user?.tokens?.toLocaleString() || 0}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl text-center font-bold"
                    >
                        {error}
                    </motion.div>
                )}

                {/* Items Grid */}
                <div className="grid gap-4">
                    {items.map((item) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 flex justify-between items-center group hover:bg-gray-800 transition-all hover:scale-[1.01] hover:border-gray-600 hover:shadow-xl"
                        >
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl bg-gray-700/50 p-2 rounded-lg">
                                        {item.id === 'item_hint' ? '🧩' : item.id === 'item_shield' ? '🛡️' : '📦'}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors">
                                            {t(`shop.items.${item.id}.name`, { defaultValue: item.name })}
                                        </h3>
                                        <p className="text-gray-400 text-xs">
                                            {t(`shop.items.${item.id}.description`, { defaultValue: item.description })}
                                        </p>
                                    </div>
                                </div>
                                {item.effectType === 'shield' && (
                                    <div className="inline-flex items-center gap-1 mt-2 text-[10px] bg-blue-500/10 text-blue-300 px-2 py-1 rounded-full border border-blue-500/20">
                                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                                        {t('shop.hardcore_only')} • {t('shop.daily_limit')}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => handleBuy(item.id)}
                                disabled={loading || (user?.tokens || 0) < item.cost}
                                className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg transform active:scale-95 flex flex-col items-center min-w-[100px] ${(user?.tokens || 0) >= item.cost
                                    ? 'bg-gradient-to-br from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white shadow-orange-900/20'
                                    : 'bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-600'
                                    }`}
                            >
                                {loading && (user?.tokens || 0) >= item.cost ? (
                                    <span className="animate-spin">↻</span>
                                ) : (
                                    <>
                                        <span className="text-sm">{t('shop.buy')}</span>
                                        <span className="text-xs opacity-90">{t('shop.cost', { cost: item.cost })}</span>
                                    </>
                                )}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
