'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/providers/AuthProvider';

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

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3701';
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
        <div className="font-sans pb-32 pt-36">
            <div className="px-4 space-y-6 w-full max-w-md mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-1"
                >
                    <h1 className="text-3xl font-black text-[#FF6B6B] drop-shadow-sm uppercase tracking-wide">
                        {t('rank.title')}
                    </h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Global Rankings</p>
                </motion.div>

                <div className="bg-white rounded-[2rem] shadow-xl border-4 border-white overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-orange-50 text-gray-500 uppercase text-[10px] font-black tracking-wider border-b-2 border-orange-100">
                                <tr>
                                    <th className="px-4 py-3">#</th>
                                    <th className="px-4 py-3">{t('rank.player')}</th>
                                    <th className="px-4 py-3">{t('rank.tier')}</th>
                                    <th className="px-4 py-3 text-center">{t('rank.wl')}</th>
                                    <th className="px-4 py-3 text-center">{t('rank.streak')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 animate-pulse font-bold">
                                            {t('rank.loading')}
                                        </td>
                                    </tr>
                                ) : leaderboard.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold">
                                            {t('rank.no_data')}
                                        </td>
                                    </tr>
                                ) : (
                                    leaderboard.map((entry, index) => (
                                        <tr key={entry._id} className={`hover:bg-orange-50/50 transition-colors ${entry.profile.nickname === me?.nickname ? 'bg-yellow-50' : ''}`}>
                                            <td className="px-4 py-4 font-black text-gray-400 text-sm">
                                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                            </td>
                                            <td className={`px-4 py-4 font-bold text-sm ${entry.profile.nickname === me?.nickname ? 'text-[#FF6B6B]' : 'text-gray-700'}`}>
                                                {entry.profile.nickname}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className={`font-black text-xs ${entry.stats?.rank?.tier === 'Master' ? 'text-purple-500' :
                                                    entry.stats?.rank?.tier === 'Diamond' ? 'text-blue-500' :
                                                        entry.stats?.rank?.tier === 'Platinum' ? 'text-cyan-500' :
                                                            entry.stats?.rank?.tier === 'Gold' ? 'text-yellow-500' :
                                                                'text-gray-400'
                                                    }`}>
                                                    {entry.stats?.rank?.tier || 'Bronze'} {entry.stats?.rank?.division || 4}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-bold">{entry.stats?.rank?.elo || 1000} LP</div>
                                            </td>
                                            <td className="px-4 py-4 text-center text-xs">
                                                <span className="text-green-500 font-black">{entry.stats?.rank?.wins || 0}</span>
                                                <span className="text-gray-300 mx-1">/</span>
                                                <span className="text-red-400 font-black">{entry.stats?.rank?.losses || 0}</span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-orange-500 font-black text-sm">🔥 {entry.stats?.hardcore?.bestStreak || 0}</span>
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
