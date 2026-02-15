'use client';

import { useSocket } from '@/components/providers/SocketProvider';
import { IPlayerState } from '@/types';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../providers/AuthProvider';

export default function Lobby() {
    const { t } = useTranslation();
    const socket = useSocket();
    const router = useRouter();
    const { user: me, logout } = useAuth();

    const [nickname, setNickname] = useState('');
    const [roomId, setRoomId] = useState('');
    const [hearts, setHearts] = useState(5);
    const [recoveryTimeLeft, setRecoveryTimeLeft] = useState<string>('');

    const [isFindingMatch, setIsFindingMatch] = useState(false);
    const [foundMatch, setFoundMatch] = useState(false); // UI state for "Match Found!" effect

    // Sync hearts from server state
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
                // Trigger server check
                socket?.emit('check_hearts');
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setRecoveryTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [me?.nextHeartAt, me?.hearts]);

    const handleSetNickname = () => {
        if (socket && nickname) {
            socket.emit('set_nickname', nickname);
        }
    };

    const handleCreateRoom = () => {
        if (!socket) return;
        if (hearts <= 0) {
            alert(t('lobby.not_enough_hearts'));
            return;
        }
        const newRoomId = Math.random().toString(36).substring(7);
        socket.emit('create_room', newRoomId);
    };

    const handleJoinRoom = () => {
        if (socket && roomId) {
            if (hearts <= 0) {
                alert(t('lobby.not_enough_hearts'));
                return;
            }
            socket.emit('join_room', roomId);
        }
    };

    const [selectedMode, setSelectedMode] = useState<'normal' | 'rank' | 'hardcore'>('normal');
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!socket) return;

        socket.on('match_searching', () => setIsSearching(true));
        socket.on('match_cancelled', () => setIsSearching(false));
        socket.on('match_found', ({ roomId, mode }) => {
            setIsSearching(false);
            router.push(`/room/${roomId}`);
        });

        return () => {
            socket.off('match_searching');
            socket.off('match_cancelled');
            socket.off('match_found');
        };
    }, [socket, router]);

    const handleFindMatch = () => {
        if (socket && hearts > 0) {
            socket.emit('find_match', selectedMode);
        } else if (hearts <= 0) {
            alert(t('lobby.not_enough_hearts'));
        }
    };

    const handleCancelMatch = () => {
        if (socket) {
            socket.emit('cancel_match');
        }
    };

    return (
        <div className="w-full max-w-4xl flex flex-col items-center relative">
            {me && (
                <button
                    onClick={logout}
                    className="absolute top-0 right-0 text-gray-500 hover:text-white text-sm font-bold uppercase tracking-wider transition-colors"
                >
                    Logout ↪
                </button>
            )}
            <h1 className="text-6xl font-black mb-12 text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-pink-600 drop-shadow-lg">
                {t('app_title')}
            </h1>

            {/* Heart Display */}
            <div className="flex items-center gap-2 mb-8 bg-gray-800 px-6 py-3 rounded-full border border-gray-700 shadow-xl">
                <span className="text-3xl">❤️</span>
                <span className={`text-2xl font-bold ${hearts > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                    {me ? me.hearts : 5} / 5
                </span>
                {hearts < 5 && (
                    <span className="text-xs text-yellow-400 ml-2 font-mono">
                        {recoveryTimeLeft ? `Recovering... ${recoveryTimeLeft}` : 'Recovering...'}
                    </span>
                )}
            </div>

            {!me?.nickname ? (
                <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md">
                    <label className="block text-gray-400 mb-2 font-bold uppercase tracking-wider text-sm">{t('login.enter_nickname')}</label>
                    <div className="flex gap-2">
                        <input
                            className="bg-gray-900 p-4 rounded-xl flex-1 text-white border-2 border-transparent focus:border-purple-500 outline-none transition-all text-lg"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder={t('login.enter_nickname')}
                            onKeyDown={(e) => e.key === 'Enter' && handleSetNickname()}
                        />
                        <button
                            onClick={handleSetNickname}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 rounded-xl font-bold transition-all transform hover:scale-105"
                        >
                            {t('login.play')}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="w-full max-w-md flex flex-col gap-6 animate-fade-in-up">
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg text-center">
                        <div className="text-gray-400 text-sm uppercase tracking-widest mb-1">{t('login.welcome')}</div>
                        <div className="text-3xl font-bold text-white mb-4">{me.nickname}</div>
                        <div className="flex justify-center gap-8 text-sm">
                            <div className="flex flex-col">
                                <span className="text-green-400 font-bold">{me.stats?.wins || 0}</span>
                                <span className="text-gray-500">{t('lobby.wins')}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-red-400 font-bold">{me.stats?.losses || 0}</span>
                                <span className="text-gray-500">{t('lobby.losses')}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-yellow-400 font-bold">{me.tokens || 0}</span>
                                <span className="text-gray-500">{t('lobby.tokens')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Mode Selection */}
                    <div className="bg-gray-800 p-2 rounded-xl flex gap-1 border border-gray-700">
                        {['normal', 'rank', 'hardcore'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setSelectedMode(mode as any)}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${selectedMode === mode
                                    ? 'bg-purple-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                                    }`}
                            >
                                {t(`lobby.modes.${mode}`)}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {isSearching ? (
                            <div className="bg-gray-800 p-8 rounded-2xl border border-purple-500/30 flex flex-col items-center animate-pulse">
                                <div className="text-purple-400 font-bold text-xl mb-2">{t('lobby.searching')}</div>
                                <div className="text-gray-500 text-sm mb-6">Mode: {t(`lobby.modes.${selectedMode}`)}</div>
                                <button
                                    onClick={handleCancelMatch}
                                    className="text-gray-400 hover:text-white text-sm font-bold underline"
                                >
                                    {t('lobby.cancel')}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleFindMatch}
                                disabled={hearts <= 0}
                                className="group relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-2xl shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative flex items-center justify-between">
                                    <div className="text-left">
                                        <div className="text-xl font-bold text-white">{t('lobby.find_match')}</div>
                                        <div className="text-purple-100 text-sm">Auto-matchmaking</div>
                                    </div>
                                    <span className="text-3xl">⚔️</span>
                                </div>
                            </button>
                        )}

                        {/* Legacy Manual Room Controls (Hidden from DOM but kept for reference) */}
                        {false && (
                            <>
                                <div className="text-center text-gray-500 text-xs mt-4">
                                    ---------------- OR ----------------
                                </div>

                                <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                                    <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">{t('lobby.create_room')} / {t('lobby.join_room')}</div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCreateRoom}
                                            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex-1"
                                        >
                                            {t('lobby.create_room')}
                                        </button>
                                        <div className="flex flex-[2] gap-1">
                                            <input
                                                className="bg-gray-800 px-3 rounded-lg flex-1 text-white border border-gray-700 outline-none text-sm"
                                                value={roomId}
                                                onChange={(e) => setRoomId(e.target.value)}
                                                placeholder={t('lobby.room_id_placeholder')}
                                            />
                                            <button
                                                onClick={handleJoinRoom}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg text-sm font-bold"
                                            >
                                                {t('lobby.join_room')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
}
