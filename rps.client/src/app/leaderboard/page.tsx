'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/providers/AuthProvider';
import TopBar from '@/components/layout/TopBar';
import BottomNav from '@/components/layout/BottomNav';
import ShopModal from '@/components/shop/ShopModal';
import InventoryModal from '@/components/shop/InventoryModal';

interface LeaderboardEntry {
    _id: string;
    profile: {
        nickname: string;
    };
    stats: {
        normal: {
            wins: number;
            losses: number;
        };
        rank: {
            elo: number;
            tier: string;
            division: number;
            serverRank?: number;
            wins?: number;
            losses?: number;
            currentStreak?: number;
        };
        hardcore: {
            currentStreak: number;
            bestStreak: number;
            seasonBestStreak: number;
            wins?: number;
            losses?: number;
        };
    };
}

export default function LeaderboardPage() {
    const { t } = useTranslation();
    const { user: me } = useAuth();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                // Determine API URL based on environment or default
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                const res = await fetch(`${apiUrl}/api/leaderboard`);
                if (res.ok) {
                    const data = await res.json();
                    setLeaderboard(data);
                } else {
                    console.error('Failed to fetch leaderboard');
                }
            } catch (error) {
                console.error('Error fetching leaderboard:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    return (
        <div className="text-white font-sans pb-24 pt-20">
            <div className="px-4 space-y-6 w-full max-w-md mx-auto">
                <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-black text-center text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-orange-600 drop-shadow-lg uppercase tracking-wide"
                >
                    {t('rank.title')}
                </motion.h1>

                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-gray-800 text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">#</th>
                                    <th className="px-4 py-3">{t('rank.player')}</th>
                                    <th className="px-4 py-3">{t('rank.tier')}</th>
                                    <th className="px-4 py-3 text-center">{t('rank.wl')}</th>
                                    <th className="px-4 py-3 text-center">{t('rank.streak')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 animate-pulse">
                                            {t('rank.loading')}
                                        </td>
                                    </tr>
                                ) : leaderboard.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            {t('rank.no_data')}
                                        </td>
                                    </tr>
                                ) : (
                                    leaderboard.map((entry, index) => (
                                        <tr key={entry._id} className={`hover:bg-gray-700/30 transition-colors ${entry.profile.nickname === me?.nickname ? 'bg-purple-900/20' : ''}`}>
                                            <td className="px-4 py-4 font-bold text-gray-400 text-sm">
                                                {index + 1}
                                            </td>
                                            <td className="px-4 py-4 font-bold text-white text-sm">
                                                {entry.profile.nickname}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className={`font-bold text-xs ${entry.stats?.rank?.tier === 'Master' ? 'text-purple-400' :
                                                    entry.stats?.rank?.tier === 'Diamond' ? 'text-blue-400' :
                                                        entry.stats?.rank?.tier === 'Platinum' ? 'text-cyan-400' :
                                                            entry.stats?.rank?.tier === 'Gold' ? 'text-yellow-400' :
                                                                'text-gray-400'
                                                    }`}>
                                                    {entry.stats?.rank?.tier || 'Bronze'} {entry.stats?.rank?.division || 4}
                                                </div>
                                                <div className="text-[10px] text-gray-500">{entry.stats?.rank?.elo || 1000} LP</div>
                                            </td>
                                            <td className="px-4 py-4 text-center text-xs">
                                                <span className="text-green-400 font-bold">{entry.stats?.rank?.wins || 0}</span>
                                                <span className="text-gray-600 mx-1">/</span>
                                                <span className="text-red-400 font-bold">{entry.stats?.rank?.losses || 0}</span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-orange-500 font-bold text-sm">🔥 {entry.stats?.hardcore?.bestStreak || 0}</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
