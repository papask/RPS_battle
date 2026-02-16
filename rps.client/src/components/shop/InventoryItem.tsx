import { motion } from 'framer-motion';

interface InventoryItemProps {
    item: { itemId: string; count: number };
    isEquipped: boolean;
    isLoading: boolean;
    onToggle: () => void;
    index: number;
}

export default function InventoryItem({ item, isEquipped, isLoading, onToggle, index }: InventoryItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative bg-gray-800/60 border rounded-2xl p-4 flex items-center gap-4 transition-all group ${isEquipped ? 'border-yellow-500/50 shadow-lg shadow-yellow-900/10' : 'border-gray-700 hover:bg-gray-800'
                }`}
        >
            <div className="w-16 h-16 bg-gray-700/50 rounded-xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform text-white">
                {item.itemId === 'item_hint' ? '🧩' :
                    item.itemId === 'item_shield' ? '🛡️' : '📦'}
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-white text-lg group-hover:text-purple-400 transition-colors">
                        {item.itemId === 'item_hint' ? 'Mind Read' :
                            item.itemId === 'item_shield' ? 'Streak Shield' : item.itemId}
                    </h3>
                    <div className="flex gap-2">
                        <div className="bg-gray-900 border border-gray-700 px-3 py-1 rounded-lg">
                            <span className="text-yellow-500 font-mono font-bold text-sm">x{item.count}</span>
                        </div>
                    </div>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                    {item.itemId === 'item_hint' ? 'Reveals opponent\'s intended move for one round.' :
                        item.itemId === 'item_shield' ? 'Automatically prevents streak reset on loss (Passive).' : 'Unknown item'}
                </p>

                <button
                    onClick={onToggle}
                    disabled={isLoading}
                    className={`w-full py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${isEquipped
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/30'
                        }`}
                >
                    {isLoading ? (
                        <span className="animate-spin">↻</span>
                    ) : isEquipped ? (
                        <><span>✕</span> UNEQUIP</>
                    ) : (
                        <><span>⚡</span> EQUIP</>
                    )}
                </button>
            </div>

            {/* Equipped Indicator Badge */}
            {isEquipped && (
                <div className="absolute -top-2 -right-2 bg-yellow-500 text-gray-900 text-[10px] font-black px-2 py-1 rounded-full shadow-lg border border-yellow-400">
                    EQUIPPED
                </div>
            )}
        </motion.div>
    );
}
