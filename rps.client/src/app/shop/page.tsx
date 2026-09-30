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
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('rps_token')}`
                },
                body: JSON.stringify({ itemId })
            });
            const data = await res.json();

            if (data.error) {
                setError(data.error);
            } else {
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
        <div className="w-full min-h-[calc(100vh-9rem)] pt-36 pb-32 px-4 flex flex-col items-center">
            <div className="w-full max-w-md space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center bg-white p-4 rounded-[1.5rem] shadow-md border-4 border-white">
                    <h1 className="text-2xl font-black text-[#FF6B6B] uppercase tracking-widest pl-2 border-l-4 border-orange-200">
                        {t('shop.title')}
                    </h1>
                    <div className="bg-yellow-50 px-4 py-2 rounded-xl border-2 border-yellow-200 text-yellow-600 font-mono font-black flex items-center gap-2 shadow-inner">
                        <span className="text-lg">💎</span>
                        {user?.tokens?.toLocaleString() || 0}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border-2 border-red-100 text-red-500 p-4 rounded-xl text-center font-bold shadow-sm"
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
                            className="bg-white border-2 border-gray-100 rounded-[1.5rem] p-5 flex justify-between items-center group shadow-sm hover:shadow-lg hover:border-orange-200 transition-all hover:scale-[1.01]"
                        >
                            <div className="space-y-1">
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl bg-gray-50 p-3 rounded-2xl shadow-inner group-hover:scale-110 transition-transform">
                                        {item.id === 'item_hint' ? '🧩' : item.id === 'item_shield' ? '🛡️' : '📦'}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-800 group-hover:text-[#FF6B6B] transition-colors">
                                            {t(`shop.items.${item.id}.name`, { defaultValue: item.name })}
                                        </h3>
                                        <div className="flex gap-2 items-center">
                                            <span className="text-sm font-bold text-gray-400">{item.cost} 💎</span>
                                            {item.effectType === 'shield' && (
                                                <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-bold border border-blue-100">
                                                    Hardcore
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-gray-500 text-xs pl-16 max-w-[200px] leading-tight">
                                    {t(`shop.items.${item.id}.description`, { defaultValue: item.description })}
                                </p>
                            </div>

                            <button
                                onClick={() => handleBuy(item.id)}
                                disabled={loading || (user?.tokens || 0) < item.cost}
                                className={`btn-3d px-5 py-3 rounded-xl font-black transition-all shadow-md transform active:scale-95 flex flex-col items-center min-w-[80px] border-b-4 active:translate-y-1 active:border-b-0 ${(user?.tokens || 0) >= item.cost
                                    ? 'bg-[#FF6B6B] text-white border-red-700 hover:bg-[#ff5252]'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-300'
                                    }`}
                            >
                                {loading && (user?.tokens || 0) >= item.cost ? (
                                    <span className="animate-spin">↻</span>
                                ) : (
                                    <span className="text-sm">{t('shop.buy')}</span>
                                )}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
