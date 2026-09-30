'use client';

import { useAuth } from '../providers/AuthProvider';
import { useSocket } from '../providers/SocketProvider';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { useTranslation } from 'react-i18next';
import { LANG_STORAGE_KEY } from '@/i18n';
import { useCardArt, setCardArt } from '@/cardArt';

// embedded: rendered in normal flow (inside the game room's header drawer) instead of fixed to the viewport
// onSettingsOpenChange: lets the drawer stay open while the settings menu is in use
export default function TopBar({ embedded = false, onSettingsOpenChange }: { embedded?: boolean; onSettingsOpenChange?: (open: boolean) => void }) {
    const { user: me } = useAuth();
    const { t, i18n } = useTranslation();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [recoveryTimeLeft, setRecoveryTimeLeft] = useState<string>('');
    const socket = useSocket();
    const cardArt = useCardArt();

    useEffect(() => { onSettingsOpenChange?.(isSettingsOpen); }, [isSettingsOpen, onSettingsOpenChange]);

    const toggleLanguage = () => {
        const newLang = i18n.language === 'ko' ? 'en' : 'ko';
        i18n.changeLanguage(newLang);
        try { localStorage.setItem(LANG_STORAGE_KEY, newLang); } catch { }
        setIsSettingsOpen(false);
    };

    // Recovery Timer
    useEffect(() => {
        if (!me || !me.nextHeartAt || (me.hearts !== undefined && me.hearts >= 5)) {
            setRecoveryTimeLeft('');
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const diff = me.nextHeartAt! - now;

            if (diff <= 0) {
                setRecoveryTimeLeft('');
                clearInterval(interval);
                // Trigger server check
                socket?.emit('check_hearts');
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setRecoveryTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [me?.nextHeartAt, me?.hearts, socket]);

    if (!me) return null;

    return (
        <div className={`${embedded ? 'relative z-10' /* backdrop-blur makes a stacking context: lift it so the settings menu covers the room bar and tab */ : 'fixed top-0 left-0 z-50 md:left-1/2 md:-translate-x-1/2 md:max-w-md'} w-full min-h-[4rem] bg-white/90 backdrop-blur-md border-b border-orange-100 px-4 flex items-center justify-between shadow-sm safe-top md:border-x md:border-orange-100`}>
            {/* User Info */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FF6B6B] flex items-center justify-center text-white font-bold shadow-md border-2 border-white">
                    {me.nickname?.substring(0, 1).toUpperCase() || 'U'}
                </div>
                <div className="flex flex-col">
                    <span className="text-gray-700 font-bold text-sm leading-tight max-w-[100px] truncate">
                        {me.nickname}
                    </span>
                </div>
            </div>

            {/* Resources & Settings */}
            <div className="flex items-center gap-2">
                {/* Hearts */}
                <div className="relative group">
                    <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 shadow-sm">
                        <span className="text-sm">❤️</span>
                        <span className={`font-bold text-xs ${me.hearts && me.hearts > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                            {me.hearts ?? 5}/5
                        </span>
                        {recoveryTimeLeft && (
                            <span className="text-[10px] text-orange-400 font-mono ml-1">
                                {recoveryTimeLeft}
                            </span>
                        )}
                    </div>
                </div>

                {/* Tokens */}
                <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
                    <span className="text-sm">💎</span>
                    <span className="font-bold text-blue-600 text-xs">
                        {me.tokens?.toLocaleString() || 0}
                    </span>
                </div>

                {/* Settings Toggle */}
                <div className="relative">
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>

                    {isSettingsOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden text-sm animate-in fade-in zoom-in duration-200 z-50">
                            <div className="p-3 border-b border-gray-100">
                                <span className="text-xs text-gray-400 font-bold px-2 uppercase tracking-wider">{t('settings.title')}</span>
                            </div>
                            <button
                                onClick={toggleLanguage}
                                className="w-full text-left px-4 py-3 hover:bg-orange-50 flex items-center justify-between transition-colors group"
                            >
                                <span className="text-gray-600 group-hover:text-orange-600 font-medium">{t('settings.language')}</span>
                                <span className="font-bold text-white bg-[#4ECDC4] px-2 py-0.5 rounded-full text-xs shadow-sm">
                                    {i18n.language === 'ko' ? 'KR' : 'EN'}
                                </span>
                            </button>
                            <button
                                onClick={() => setCardArt(cardArt === 'glove' ? 'object' : 'glove')}
                                className="w-full text-left px-4 py-3 hover:bg-orange-50 flex items-center justify-between transition-colors group border-t border-gray-100"
                            >
                                <span className="text-gray-600 group-hover:text-orange-600 font-medium">{t('settings.card_art')}</span>
                                <span className="font-bold text-white bg-[#FF6B6B] px-2 py-0.5 rounded-full text-xs shadow-sm">
                                    {t(cardArt === 'glove' ? 'settings.card_art_glove' : 'settings.card_art_object')}
                                </span>
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.removeItem('rps_token');
                                    window.location.href = '/';
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-500 flex items-center gap-2 transition-colors border-t border-gray-100"
                            >
                                <span className="font-bold">{t('settings.logout')}</span>
                                <span className="text-xs">↪</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
