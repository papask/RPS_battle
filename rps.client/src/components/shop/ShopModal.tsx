import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Item } from '@/types';

interface ShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onPurchase: () => void; // Callback to refresh user data
}

export default function ShopModal({ isOpen, onClose, user, onPurchase }: ShopModalProps) {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchItems();
        }
    }, [isOpen]);

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
            setError('User not identified');
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
                onPurchase(); // Refresh user data
            }
        } catch (e) {
            setError('Purchase failed');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            🛒 Item Shop
                        </h2>
                        <div className="flex items-center gap-4">
                            <div className="bg-gray-800 px-4 py-2 rounded-lg border border-yellow-500/30 text-yellow-500 font-mono">
                                🪙 {user?.tokens?.toLocaleString() || 0}
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                    </div>

                    <div className="p-6 grid gap-4 max-h-[60vh] overflow-y-auto">
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-4">
                                {error}
                            </div>
                        )}

                        {items.map((item) => (
                            <div key={item.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex justify-between items-center hover:bg-gray-800 transition-colors">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{item.name}</h3>
                                    <p className="text-gray-400 text-sm">{item.description}</p>
                                    {item.effectType === 'shield' && (
                                        <span className="inline-block mt-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                                            Hardcore Only • 1/Day
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleBuy(item.id)}
                                    disabled={loading || (user?.tokens || 0) < item.cost}
                                    className={`px-6 py-2 rounded-lg font-bold transition-all ${(user?.tokens || 0) >= item.cost
                                            ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg shadow-yellow-500/20'
                                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        }`}
                                >
                                    {loading ? '...' : `${item.cost} 🪙`}
                                </button>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
