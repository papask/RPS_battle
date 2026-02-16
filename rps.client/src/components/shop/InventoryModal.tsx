import { motion, AnimatePresence } from 'framer-motion';
import { User, Item } from '@/types';

interface InventoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

export default function InventoryModal({ isOpen, onClose, user }: InventoryModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[70vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
                        <h2 className="text-xl font-bold text-white">🎒 Inventory</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                    </div>

                    <div className="p-4 overflow-y-auto flex-1 space-y-3">
                        {user?.inventory && user.inventory.length > 0 ? (
                            user.inventory.map((item, idx) => (
                                <div key={idx} className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
                                        {item.itemId === 'item_hint' ? '🧩' :
                                            item.itemId === 'item_shield' ? '🛡️' : '📦'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-white text-sm">
                                                {item.itemId === 'item_hint' ? 'Mind Read' :
                                                    item.itemId === 'item_shield' ? 'Streak Shield' : item.itemId}
                                            </h3>
                                            <span className="text-yellow-500 font-mono text-xs">x{item.count}</span>
                                        </div>
                                        <p className="text-gray-400 text-xs mt-1">
                                            {item.itemId === 'item_hint' ? 'Reveals opponent moves.' :
                                                item.itemId === 'item_shield' ? 'Protects streak (Passive).' : ''}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500 flex flex-col items-center gap-2">
                                <span className="text-4xl opacity-50">🎒</span>
                                <p>No items yet</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
