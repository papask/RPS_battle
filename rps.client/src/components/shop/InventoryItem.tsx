import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface InventoryItemProps {
    item: { itemId: string; count: number };
    isEquipped: boolean;
    isLoading: boolean;
    onToggle: () => void;
    index: number;
}

export default function InventoryItem({ item, isEquipped, isLoading, onToggle, index }: InventoryItemProps) {
    const { t } = useTranslation();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative bg-white border-2 rounded-2xl p-4 flex items-center gap-4 transition-all group shadow-sm ${isEquipped ? 'border-yellow-400 shadow-md bg-yellow-50' : 'border-gray-100 hover:border-orange-200 hover:bg-orange-50'
                }`}
        >
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform ${isEquipped ? 'bg-yellow-100' : 'bg-gray-100'
                }`}>
                {item.itemId === 'item_hint' ? '🧩' :
                    item.itemId === 'item_shield' ? '🛡️' : '📦'}
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-gray-800 text-lg group-hover:text-[#FF6B6B] transition-colors">
                        {t(`shop.items.${item.itemId}.name`, { defaultValue: item.itemId })}
                    </h3>
                    <div className="flex gap-2">
                        <div className="bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg">
                            <span className="text-gray-600 font-mono font-bold text-sm">x{item.count}</span>
                        </div>
                    </div>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed mb-3">
                    {t(`shop.items.${item.itemId}.description`)}
                </p>

                <button
                    onClick={onToggle}
                    disabled={isLoading}
                    className={`btn-3d w-full py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-b-4 active:translate-y-1 active:border-b-0 ${isEquipped
                        ? 'bg-gray-200 text-gray-500 border-gray-300 hover:bg-gray-300'
                        : 'bg-[#FF6B6B] text-white border-red-700 hover:bg-[#ff5252]'
                        }`}
                >
                    {isLoading ? (
                        <span className="animate-spin">↻</span>
                    ) : isEquipped ? (
                        <><span>✕</span> {t('profile.unequip')}</>
                    ) : (
                        <><span>⚡</span> {t('profile.equip')}</>
                    )}
                </button>
            </div>

            {/* Equipped Indicator Badge */}
            {isEquipped && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-md border-2 border-white animate-bounce">
                    {t('profile.equipped')}
                </div>
            )}
        </motion.div>
    );
}
