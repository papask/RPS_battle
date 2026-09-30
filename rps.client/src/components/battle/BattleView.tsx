'use client';

import { useSocket } from '@/components/providers/SocketProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../providers/AuthProvider';
import MessageModal from '../ui/MessageModal';

export default function BattleView() {
    const { t } = useTranslation();
    const socket = useSocket();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user: me, isLoading } = useAuth();
    const queryMode = searchParams.get('mode');

    const [hearts, setHearts] = useState(5);
    const [recoveryTimeLeft, setRecoveryTimeLeft] = useState<string>('');
    const [isFindingMatch, setIsFindingMatch] = useState(false);
    const [foundMatch, setFoundMatch] = useState(false);
    const [selectedMode, setSelectedMode] = useState<'classic' | 'normal' | 'rank' | 'hardcore'>('normal');
    const [isClient, setIsClient] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const closeNotice = useCallback(() => setNotice(null), []);

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

    // Initialize state from local storage or query param
    useEffect(() => {
        setIsClient(true);
        if (queryMode && ['classic', 'normal', 'rank', 'hardcore'].includes(queryMode)) {
            setSelectedMode(queryMode as any);
        } else {
            const savedMode = localStorage.getItem('rps_last_mode');
            if (savedMode && ['classic', 'normal', 'rank', 'hardcore'].includes(savedMode)) {
                setSelectedMode(savedMode as any);
            }
        }
    }, [queryMode]);

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
            setNotice(t('lobby.not_enough_hearts'));
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
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] px-4 w-full max-w-md mx-auto space-y-8 pt-36 pb-32">

            {/* Game Mode Selector */}
            <div className="w-full space-y-2">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2">{t('battle.select_mode')}</h2>
                <div className="flex flex-col gap-2">
                    {['classic', 'normal', 'rank', 'hardcore'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setSelectedMode(mode as any)}
                            className={`w-full py-4 px-6 rounded-2xl border-2 transition-all flex items-center justify-between group ${selectedMode === mode
                                ? 'bg-white border-[#FF6B6B] shadow-lg scale-[1.02]'
                                : 'bg-white/50 border-transparent hover:bg-white hover:border-[#FF6B6B]/30'
                                }`}
                        >
                            <span className={`text-lg font-bold uppercase tracking-wide ${selectedMode === mode ? 'text-[#FF6B6B]' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                {t(`lobby.modes.${mode}`)}
                            </span>

                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedMode === mode
                                ? 'border-[#FF6B6B] bg-[#FF6B6B]'
                                : 'border-gray-200 bg-transparent'
                                }`}>
                                {selectedMode === mode && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Matchmaking Button */}
            <div className="w-full relative">
                {foundMatch ? (
                    <div className="bg-green-100 p-8 rounded-[2rem] border-4 border-green-200 flex flex-col items-center animate-bounce-soft relative overflow-hidden shadow-xl">
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="text-green-600 font-black text-2xl uppercase tracking-widest mb-1">{t('lobby.match_found')}</div>
                            <div className="text-green-500 text-xs uppercase tracking-wider font-bold">{t('battle.redirecting')}</div>
                        </div>
                    </div>
                ) : isFindingMatch ? (
                    <div className="bg-white p-8 rounded-[2rem] border-4 border-[#4ECDC4] flex flex-col items-center relative overflow-hidden shadow-xl">
                        <div className="absolute inset-0 bg-[#4ECDC4]/10 animate-pulse" />
                        <div className="relative z-10 flex flex-col items-center w-full">
                            <div className="text-[#4ECDC4] font-black text-2xl mb-2">{t('lobby.searching')}</div>
                            <div className="text-gray-400 text-xs mb-8 uppercase tracking-wider font-bold">{t('battle.mode_label', { mode: t(`lobby.modes.${selectedMode}`) })}</div>
                            <button
                                onClick={handleCancelMatch}
                                className="px-8 py-3 rounded-xl border-2 border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 text-sm font-bold transition-colors bg-white hover:shadow-sm"
                            >
                                {t('lobby.cancel')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={handleQuickMatch}
                        disabled={hearts <= 0}
                        className={`btn-3d w-full py-6 rounded-[2rem] font-black text-3xl uppercase tracking-widest shadow-xl transition-transform active:translate-y-1 relative overflow-hidden group ${hearts > 0
                            ? 'bg-[#FF6B6B] text-white border-b-4 border-red-700'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed border-b-4 border-gray-300'
                            }`}
                    >
                        <span className={`relative z-10 flex items-center justify-center gap-3 ${hearts > 0 ? 'drop-shadow-sm' : ''}`}>
                            {t('lobby.find_match')}
                        </span>
                    </button>
                )}
            </div>

            <div className="bg-white/60 p-4 rounded-xl text-center backdrop-blur-sm">
                <p className="text-xs text-gray-500 font-medium">
                    {t('battle.instruction')}
                </p>
            </div>

            <MessageModal message={notice} onClose={closeNotice} />
        </div>
    );
}
