'use client';

import { useSocket } from '@/components/providers/SocketProvider';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../providers/AuthProvider';

export default function BattleView() {
    const { t } = useTranslation();
    const socket = useSocket();
    const router = useRouter();
    const { user: me, isLoading } = useAuth();

    const [hearts, setHearts] = useState(5);
    const [recoveryTimeLeft, setRecoveryTimeLeft] = useState<string>('');
    const [isFindingMatch, setIsFindingMatch] = useState(false);
    const [foundMatch, setFoundMatch] = useState(false);
    const [selectedMode, setSelectedMode] = useState<'normal' | 'rank' | 'hardcore'>('normal');
    const [isClient, setIsClient] = useState(false);

    // Sync hearts
    useEffect(() => {
        if (me?.hearts !== undefined) {
            setHearts(me.hearts);
        }
    }, [me]);

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
                socket?.emit('check_hearts');
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setRecoveryTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [me?.nextHeartAt, me?.hearts, socket]);

    // Initialize state from local storage
    useEffect(() => {
        setIsClient(true);
        const savedMode = localStorage.getItem('rps_last_mode');
        if (savedMode && ['normal', 'rank', 'hardcore'].includes(savedMode)) {
            setSelectedMode(savedMode as 'normal' | 'rank' | 'hardcore');
        }
    }, []);

    // Redirect if no nickname
    useEffect(() => {
        if (me && !me.nickname) {
            router.push('/');
        }
    }, [me, router]);

    // Save mode
    useEffect(() => {
        if (isClient) {
            localStorage.setItem('rps_last_mode', selectedMode);
        }
    }, [selectedMode, isClient]);

    const handleQuickMatch = () => {
        if (!socket) return;
        if (hearts <= 0) {
            alert(t('lobby.not_enough_hearts'));
            return;
        }
        setIsFindingMatch(true);
        socket.emit('find_match', selectedMode);
    };

    const handleCancelMatch = () => {
        if (socket) {
            socket.emit('cancel_match');
            setIsFindingMatch(false);
        }
    };

    // Match found listener
    useEffect(() => {
        if (!socket) return;
        const onMatchFound = (data: any) => {
            console.log('[BattleView] Match found:', data);
            const targetRoomId = data.roomId || data.id || (typeof data === 'string' ? data : null);

            if (targetRoomId) {
                setIsFindingMatch(false);
                setFoundMatch(true);
                setTimeout(() => {
                    router.push(`/room/${targetRoomId}`);
                }, 1000);
            }
        };

        socket.on('room_created', onMatchFound);
        socket.on('joined_room', onMatchFound);
        socket.on('match_found', onMatchFound);

        return () => {
            socket.off('room_created', onMatchFound);
            socket.off('joined_room', onMatchFound);
            socket.off('match_found', onMatchFound);
        };
    }, [socket, router]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] px-4 w-full max-w-md mx-auto space-y-8">

            {/* Header / Hearts */}
            <div className="w-full flex justify-between items-center bg-gray-900/50 p-4 rounded-xl border border-gray-800 backdrop-blur-sm">
                <span className="text-gray-400 font-bold text-sm uppercase tracking-widest">{t('battle.energy')}</span>
                <div className="flex items-center gap-2">
                    <span className="text-red-500 text-xl">❤️</span>
                    <span className="text-white font-black text-xl">{hearts}/5</span>
                    {recoveryTimeLeft && (
                        <span className="text-xs text-gray-500 font-mono">({recoveryTimeLeft})</span>
                    )}
                </div>
            </div>

            {/* Game Mode Selector */}
            <div className="w-full space-y-2">
                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('battle.select_mode')}</h2>
                <div className="flex bg-gray-900/80 p-1.5 rounded-xl border border-gray-800 backdrop-blur-sm">
                    {['normal', 'rank', 'hardcore'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setSelectedMode(mode as any)}
                            className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${selectedMode === mode
                                ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                                }`}
                        >
                            {t(`lobby.modes.${mode}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Matchmaking Button */}
            <div className="w-full relative">
                {foundMatch ? (
                    <div className="bg-green-500/20 p-8 rounded-3xl border border-green-500/50 flex flex-col items-center animate-bounce relative overflow-hidden">
                        <div className="absolute inset-0 bg-green-500/10 animate-[pulse_0.5s_infinite]" />
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="text-green-400 font-black text-2xl uppercase tracking-widest mb-1">{t('lobby.match_found')}</div>
                            <div className="text-green-200/70 text-xs uppercase tracking-wider">{t('battle.redirecting')}</div>
                        </div>
                    </div>
                ) : isFindingMatch ? (
                    <div className="bg-gray-900/50 p-8 rounded-3xl border border-purple-500/30 flex flex-col items-center animate-pulse relative overflow-hidden">
                        <div className="absolute inset-0 bg-purple-500/5 animate-[pulse_3s_infinite]" />
                        <div className="relative z-10 flex flex-col items-center w-full">
                            <div className="text-purple-400 font-bold text-2xl mb-2">{t('lobby.searching')}</div>
                            <div className="text-gray-500 text-xs mb-8 uppercase tracking-wider">{t('battle.mode_label', { mode: t(`lobby.modes.${selectedMode}`) })}</div>
                            <button
                                onClick={handleCancelMatch}
                                className="px-8 py-2 rounded-full border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 text-sm font-bold transition-colors"
                            >
                                {t('lobby.cancel')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={handleQuickMatch}
                        disabled={hearts <= 0}
                        className={`w-full py-8 rounded-3xl font-black text-3xl uppercase tracking-widest shadow-2xl transition-all transform active:scale-95 relative overflow-hidden group ${hearts > 0
                            ? 'bg-white text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-200'
                            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                            }`}
                    >
                        {hearts > 0 && (
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-[length:200%_auto] animate-[gradient_3s_linear_infinite]" />
                        )}
                        <span className={`relative z-10 ${hearts > 0 ? 'text-white drop-shadow-md' : ''}`}>
                            {t('lobby.find_match')}
                        </span>
                    </button>
                )}
            </div>

            <p className="text-xs text-gray-500 text-center max-w-xs">
                Select your mode and click the button above to start searching for an opponent.
            </p>
        </div>
    );
}
