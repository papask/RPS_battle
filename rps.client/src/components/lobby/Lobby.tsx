'use client';

import { useSocket } from '@/components/providers/SocketProvider';
import { IPlayerState } from '@/types';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../providers/AuthProvider';
import ShopModal from '../shop/ShopModal';
import TopBar from '../layout/TopBar';
import BottomNav from '../layout/BottomNav';
import InventoryModal from '../shop/InventoryModal'; // Keep for now
import InventoryItem from '../shop/InventoryItem';

export default function Lobby() {
    const { t } = useTranslation();
    const socket = useSocket();
    const router = useRouter();
    const { user: me, logout } = useAuth();
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [equipping, setEquipping] = useState<string | null>(null);

    const handleEquipToggle = (itemId: string, isEquipped: boolean) => {
        if (!me || !socket || equipping) return;

        setEquipping(itemId);

        if (isEquipped) {
            socket.emit('unequip_item', itemId);
        } else {
            socket.emit('equip_item', itemId);
        }

        setTimeout(() => setEquipping(null), 500);
    };

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
    const [isClient, setIsClient] = useState(false);

    // Initialize state from local storage on client mount only to avoid hydration mismatch
    useEffect(() => {
        setIsClient(true);
        const savedMode = localStorage.getItem('rps_last_mode');
        if (savedMode && ['normal', 'rank', 'hardcore'].includes(savedMode)) {
            setSelectedMode(savedMode as 'normal' | 'rank' | 'hardcore');
        }
    }, []);

    // Save mode on change
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

    // Listen for match found (handled by room_created in SocketProvider technically, but we might want UI feedback)
    useEffect(() => {
        if (!socket) return;
        const onMatchFound = (data: any) => {
            console.log('[Lobby] Match found event received:', data);

            // Try to extract ID from various possible structures
            const targetRoomId = data.roomId || data.id || (typeof data === 'string' ? data : null);
            console.log('[Lobby] Target Room ID:', targetRoomId);

            if (targetRoomId) {
                setIsFindingMatch(false);
                setFoundMatch(true);
                setTimeout(() => {
                    console.log(`[Lobby] Redirecting to /room/${targetRoomId}`);
                    router.push(`/room/${targetRoomId}`);
                }, 1000);
            } else {
                console.error('[Lobby] Invalid match data received:', data);
            }
        };
        socket.on('room_created', onMatchFound);
        socket.on('joined_room', onMatchFound);
        socket.on('match_found', onMatchFound); // Add missing event

        return () => {
            socket.off('room_created', onMatchFound);
            socket.off('joined_room', onMatchFound);
            socket.off('match_found', onMatchFound);
        };
    }, [socket, router]);


    const renderStats = () => {
        if (!me?.stats) return <p className="text-gray-500 italic">No stats available</p>;

        // Helper to get generic stats or specific mode stats
        // Structure: me.stats.normal, me.stats.rank, me.stats.hardcore

        let wins = 0;
        let losses = 0;

        if (selectedMode === 'normal') {
            wins = me.stats.normal?.wins || 0;
            losses = me.stats.normal?.losses || 0;
        } else if (selectedMode === 'rank') {
            wins = me.stats.rank?.wins || 0;
            losses = me.stats.rank?.losses || 0;
        } else if (selectedMode === 'hardcore') {
            wins = me.stats.hardcore?.wins || 0;
            losses = me.stats.hardcore?.losses || 0;
        }

        return (
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="flex flex-col">
                    <span className="text-green-400 font-bold text-xl">{wins}</span>
                    <span className="text-gray-500 text-sm">Wins</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-red-400 font-bold text-xl">{losses}</span>
                    <span className="text-gray-500 text-sm">Losses</span>
                </div>
                {selectedMode === 'rank' && (
                    <>
                        <div className="flex flex-col">
                            <span className="text-purple-400 font-bold">{me.stats.rank.elo}</span>
                            <span className="text-gray-500">ELO</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-yellow-400 font-bold">{me.stats.rank.tier} {me.stats.rank.division}</span>
                            <span className="text-gray-500">Rank</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-yellow-400 font-bold">{me.stats.rank?.currentStreak || 0}</span>
                            <span className="text-gray-500">Streak</span>
                        </div>
                    </>
                )}
                {selectedMode === 'hardcore' && (
                    <>
                        <div className="flex flex-col">
                            <span className="text-orange-500 font-bold">{me.stats.hardcore?.currentStreak || 0}</span>
                            <span className="text-gray-500">Streak</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-yellow-500 font-bold">{me.stats.hardcore?.bestStreak || 0}</span>
                            <span className="text-gray-500">Best</span>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // Removed unused imports

    return (
        <div className="text-white font-sans min-h-[calc(100vh-9rem)] flex flex-col justify-center py-20">
            <div className="px-4 space-y-4 w-full max-w-md mx-auto">
                {!me?.nickname ? (
                    <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 mt-12 mb-24">
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
                ) : (
                    <>
                        {/* Game Mode Selector */}
                        <section>
                            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 px-1">Game Mode</h2>
                            <div className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-800 backdrop-blur-sm">
                                {['normal', 'rank', 'hardcore'].map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setSelectedMode(mode as any)}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${selectedMode === mode
                                            ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg'
                                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                                            }`}
                                    >
                                        {t(`lobby.modes.${mode}`)}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Matchmaking Action */}
                        <section>
                            {foundMatch ? (
                                <div className="bg-green-500/20 p-6 rounded-2xl border border-green-500/50 flex flex-col items-center animate-bounce relative overflow-hidden">
                                    <div className="absolute inset-0 bg-green-500/10 animate-[pulse_0.5s_infinite]" />
                                    <div className="relative z-10 flex flex-col items-center">
                                        <div className="text-green-400 font-black text-2xl uppercase tracking-widest mb-1">{t('lobby.match_found')}</div>
                                        <div className="text-green-200/70 text-xs uppercase tracking-wider">Redirecting...</div>
                                    </div>
                                </div>
                            ) : isFindingMatch ? (
                                <div className="bg-gray-900/50 p-6 rounded-2xl border border-purple-500/30 flex flex-col items-center animate-pulse relative overflow-hidden">
                                    <div className="absolute inset-0 bg-purple-500/5 animate-[pulse_3s_infinite]" />
                                    <div className="relative z-10 flex flex-col items-center">
                                        <div className="text-purple-400 font-bold text-xl mb-1">{t('lobby.searching')}</div>
                                        <div className="text-gray-500 text-xs mb-4 uppercase tracking-wider">Mode: {t(`lobby.modes.${selectedMode}`)}</div>
                                        <button
                                            onClick={handleCancelMatch}
                                            className="px-6 py-1.5 rounded-full border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 text-xs font-bold transition-colors"
                                        >
                                            {t('lobby.cancel')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={handleQuickMatch}
                                    disabled={hearts <= 0}
                                    className={`w-full py-5 rounded-2xl font-black text-2xl uppercase tracking-widest shadow-xl transition-all transform active:scale-95 relative overflow-hidden group ${hearts > 0
                                        ? 'bg-white text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-200'
                                        : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                        }`}
                                >
                                    {hearts > 0 ? (
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-[length:200%_auto] animate-[gradient_3s_linear_infinite]" />
                                    ) : null}

                                    <span className={`relative z-10 ${hearts > 0 ? 'text-white drop-shadow-md' : ''}`}>
                                        {t('lobby.find_match')}
                                    </span>
                                </button>
                            )}
                        </section>

                        {/* Stats Summary Card */}
                        <section className="bg-gray-800/40 border border-gray-700/50 p-3 rounded-xl backdrop-blur-sm w-full">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    Season Stats
                                </h2>
                                <span className="text-[10px] bg-gray-700/50 text-gray-300 px-1.5 py-0.5 rounded-md uppercase">
                                    {selectedMode}
                                </span>
                            </div>
                            {renderStats()}
                        </section>

                        {/* Equipped Items Summary */}
                        {me?.equippedItems && me.equippedItems.length > 0 && (
                            <section className="bg-gray-800/40 border border-gray-700/50 p-3 rounded-xl backdrop-blur-sm w-full mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        Active Gear
                                    </h2>
                                </div>
                                <div className="flex gap-2">
                                    {me.equippedItems.map((itemId) => (
                                        <div key={itemId} className="flex items-center gap-2 bg-gray-900/60 rounded-lg pr-3 border border-gray-700/50">
                                            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-lg">
                                                {itemId === 'item_hint' ? '🧩' :
                                                    itemId === 'item_shield' ? '🛡️' : '📦'}
                                            </div>
                                            <span className="text-xs font-bold text-gray-300">
                                                {itemId === 'item_hint' ? 'Mind Read' :
                                                    itemId === 'item_shield' ? 'Shield' : itemId}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Inventory List */}
                        <section className="bg-gray-800/40 border border-gray-700/50 p-3 rounded-xl backdrop-blur-sm w-full mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    My Inventory
                                </h2>
                                <span className="text-[10px] bg-gray-700/50 text-gray-300 px-1.5 py-0.5 rounded-md uppercase">
                                    {me?.inventory?.length || 0} Items
                                </span>
                            </div>
                            <div className="flex flex-col gap-2">
                                {me?.inventory && me.inventory.length > 0 ? (
                                    me.inventory.map((item, idx) => {
                                        const isEquipped = me.equippedItems?.includes(item.itemId);
                                        const isLoading = equipping === item.itemId;

                                        return (
                                            <InventoryItem
                                                key={idx}
                                                item={item}
                                                isEquipped={!!isEquipped}
                                                isLoading={isLoading}
                                                onToggle={() => handleEquipToggle(item.itemId, !!isEquipped)}
                                                index={idx}
                                            />
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-4 text-gray-500">
                                        <p className="text-xs">No items found.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Room Code - Hidden by user request
                        <section className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    className="bg-gray-900 p-3 rounded-xl flex-1 text-white border border-gray-800 focus:border-purple-500 outline-none font-mono text-center tracking-[0.5em] uppercase text-sm placeholder:tracking-normal placeholder:text-gray-600 transition-colors"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                                    placeholder="ENTER CODE"
                                    maxLength={6}
                                />
                                <button
                                    onClick={handleJoinRoom}
                                    className="bg-gray-800 hover:bg-gray-700 text-white px-5 rounded-xl text-sm font-bold transition-colors border border-gray-700"
                                >
                                    JOIN
                                </button>
                            </div>
                            <button
                                onClick={handleCreateRoom}
                                className="w-full text-center text-[10px] text-gray-500 hover:text-gray-300 transition-colors py-1"
                            >
                                + Create Private Room
                            </button>
                        </section>
                        */}

                        {/* Spacer to maintain visual volume */}
                        <div className="h-24"></div>


                    </>
                )}
            </div>
        </div>
    );
}
