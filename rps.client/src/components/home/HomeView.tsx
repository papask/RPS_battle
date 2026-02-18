'use client';

import { useAuth } from '../providers/AuthProvider';
import { useSocket } from '../providers/SocketProvider';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';

export default function HomeView() {
    const { t } = useTranslation();
    const { user: me, isLoading } = useAuth();
    const socket = useSocket();
    const router = useRouter();
    const [nickname, setNickname] = useState('');

    const handleSetNickname = () => {
        if (socket && nickname) {
            socket.emit('set_nickname', nickname);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!me || !me.nickname) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
                <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md">
                    <motion.h1
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-4xl font-black mb-8 text-center text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-pink-600 drop-shadow-lg"
                    >
                        {t('app_title')}
                    </motion.h1>

                    <label className="block text-gray-400 mb-2 font-bold uppercase tracking-wider text-sm">{t('login.enter_nickname')}</label>
                    <div className="space-y-4">
                        <input
                            className="w-full bg-gray-900 p-4 rounded-xl text-white border-2 border-transparent focus:border-purple-500 outline-none transition-all text-lg"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder={t('login.enter_nickname')}
                            onKeyDown={(e) => e.key === 'Enter' && handleSetNickname()}
                        />
                        <button
                            onClick={handleSetNickname}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold transition-all transform hover:scale-[1.02] shadow-lg shadow-purple-900/50"
                        >
                            {t('login.play')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] px-4 text-center space-y-8">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-2"
            >
                <h1 className="text-4xl font-black text-white">
                    {t('home.welcome', { name: me.nickname })}
                </h1>
                <p className="text-gray-400">{t('home.ready_message')}</p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
                    <div className="text-3xl font-black text-green-400">{me.stats?.rank?.wins || 0}</div>
                    <div className="text-xs uppercase tracking-widest text-gray-500">{t('home.ranked_wins')}</div>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
                    <div className="text-3xl font-black text-purple-400">{me.stats?.rank?.elo || 1000}</div>
                    <div className="text-xs uppercase tracking-widest text-gray-500">{t('home.current_elo')}</div>
                </div>
            </div>

            <button
                onClick={() => router.push('/battle')}
                className="w-full max-w-md py-6 rounded-2xl font-black text-2xl uppercase tracking-widest shadow-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white relative overflow-hidden group transform transition-all hover:scale-105 active:scale-95"
            >
                <span className="relative z-10">{t('home.battle_now')}</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
        </div>
    );
}
