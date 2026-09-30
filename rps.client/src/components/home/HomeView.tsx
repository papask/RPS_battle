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
                <div className="bg-white/90 p-8 rounded-[2rem] shadow-xl border-4 border-white w-full max-w-md backdrop-blur-sm">
                    <motion.h1
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-4xl font-black mb-8 text-center text-[#FF6B6B] drop-shadow-sm"
                    >
                        {t('app_title')}
                    </motion.h1>

                    <label className="block text-gray-500 mb-2 font-bold uppercase tracking-wider text-sm pl-1">{t('login.enter_nickname')}</label>
                    <div className="space-y-4">
                        <input
                            className="w-full bg-orange-50/50 p-4 rounded-xl text-gray-800 border-2 border-orange-100 focus:border-[#FF6B6B] outline-none transition-all text-lg placeholder-gray-400 font-bold"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder={t('login.enter_nickname')}
                            onKeyDown={(e) => e.key === 'Enter' && handleSetNickname()}
                        />
                        <button
                            onClick={handleSetNickname}
                            className="btn-3d w-full bg-[#FF6B6B] hover:bg-[#ff5252] text-white py-4 rounded-xl font-black text-xl transition-all shadow-lg border-b-4 border-red-700 active:translate-y-1 active:border-b-0 active:shadow-none"
                        >
                            {t('login.play')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] px-4 text-center space-y-8 pt-36 pb-32">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-2"
            >
                <h1 className="text-4xl font-black text-gray-800 drop-shadow-sm">
                    {t('home.welcome', { name: me.nickname })}
                </h1>
                <p className="text-gray-500 font-medium">{t('home.ready_message')}</p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                <div className="bg-white p-4 rounded-2xl border-b-4 border-green-200 shadow-sm">
                    <div className="text-3xl font-black text-green-500">{me.stats?.rank?.wins || 0}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('home.ranked_wins')}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border-b-4 border-purple-200 shadow-sm">
                    <div className="text-3xl font-black text-purple-500">{me.stats?.rank?.elo || 1000}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('home.current_elo')}</div>
                </div>
            </div>

            <div className="flex flex-col gap-4 w-full max-w-md">
                <button
                    onClick={() => router.push('/battle')}
                    className="btn-3d w-full py-6 rounded-[2rem] font-black text-2xl uppercase tracking-widest shadow-xl bg-[#FF6B6B] text-white border-b-4 border-red-700 active:translate-y-1 active:border-b-0"
                >
                    <span className="relative z-10 drop-shadow-md">{t('home.battle_now')}</span>
                </button>
            </div>
        </div>
    );
}
