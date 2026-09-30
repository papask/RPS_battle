'use client';

import { useSocket } from '@/components/providers/SocketProvider';
import GameBoard from '@/components/game/GameBoard';
import { IPlayerState, IRoom } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState, use, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/providers/AuthProvider';
import MessageModal from '@/components/ui/MessageModal';
import TopBar from '@/components/layout/TopBar';
import { motion } from 'framer-motion';

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = use(params);
    const { t } = useTranslation();

    const socket = useSocket();
    const { user, isLoading: isAuthLoading } = useAuth(); // Use Auth Context
    const router = useRouter();
    const [room, setRoom] = useState<IRoom | null>(null);
    const [me, setMe] = useState<IPlayerState | null>(null);

    const [gameOverReason, setGameOverReason] = useState<string | null>(null);
    const [eloChanges, setEloChanges] = useState<{ [key: string]: number } | null>(null);

    // Messages that end the visit: closing the popup goes back home
    const [exitMessage, setExitMessage] = useState<string | null>(null);
    const closeExitMessage = useCallback(() => {
        setExitMessage(null);
        router.push('/');
    }, [router]);
    const exitModal = <MessageModal message={exitMessage} onClose={closeExitMessage} />;

    // Header drawer (top bar + room info): slides away while a game is in progress, tab reopens it
    const inGame = room?.gameState === 'PLAYING' || room?.gameState === 'ROUND_RESULT';
    const [headerOpen, setHeaderOpen] = useState(true);
    useEffect(() => { setHeaderOpen(!inGame); }, [inGame]);
    // Reopened mid-game via the tab: slide away again after 3s (held while the settings menu is open)
    const [settingsOpen, setSettingsOpen] = useState(false);
    useEffect(() => {
        if (!inGame || !headerOpen || settingsOpen) return;
        const id = setTimeout(() => setHeaderOpen(false), 3000);
        return () => clearTimeout(id);
    }, [inGame, headerOpen, settingsOpen]);

    useEffect(() => {
        if (socket && !isAuthLoading) {
            // Only join when auth is done (isAuthLoading === false)
            // If user -> we are authenticated (or Reconnected)
            // If !user -> we are Guest (new socket)

            socket.emit('join_room', roomId);

            // New listener from the change
            socket.on('room_joined', (data: IRoom) => {
                setRoom(data);
                // setIsLoading(false); // setIsLoading is not defined in the original code
            });

            socket.on('room_updated', (updatedRoom: IRoom) => {
                console.log('Room updated:', updatedRoom);
                setRoom(updatedRoom);

                const myState = updatedRoom.players.find(p => p.id === socket.id);
                if (myState) setMe(myState);
            });

            socket.on('game_over', (data: { winnerId: string, reason?: string, eloChanges?: { [key: string]: number } }) => {
                if (data.reason) {
                    setGameOverReason(data.reason);
                }
                if (data.eloChanges) {
                    setEloChanges(data.eloChanges);
                }
            });

            socket.on('opponent_left', () => {
                setExitMessage(t('game.result.opponent_disconnected'));
            });

            socket.on('error', (message: string) => {
                console.error(message);
                // Added specific error handling from the change
                if (message === 'Room is full') {
                    setExitMessage(t('game.full'));
                }
            });
        }

        // Add beforeunload listener to warn on refresh/close
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = ''; // Chrome requires returnValue to be set
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (socket) {
                // We DO NOT emit 'leave_room' here automatically.
                // Doing so causes immediate forfeits in React Strict Mode (Mount -> Unmount -> Mount)
                // or when the user accidentally navigates back (we want to allow them to return).
                // 'leave_room' is now only emitted by the explicit Leave button.

                socket.off('room_joined');
                socket.off('room_updated');
                socket.off('game_over');
                socket.off('opponent_left');
                socket.off('error');
            }
        };
    }, [socket, roomId, t, isAuthLoading]); // Add isAuthLoading dependency

    const handleStartGame = () => {
        if (socket) {
            socket.emit('start_game', roomId);
        }
    };

    // Wait for Auth to Load AND Room to Load
    if (isAuthLoading || !room || !me) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-gray-400 font-bold animate-pulse">
                    {isAuthLoading ? 'Authenticating...' : `Loading Room ${roomId}...`}
                </div>
                {exitModal}
            </div>
        );
    }

    return (
        <main className="flex flex-col items-center font-sans w-full h-screen overflow-hidden relative">
            {/* Header Drawer - overlays the top of the board so opening it never reflows the game */}
            <motion.div
                className="absolute top-0 inset-x-0 z-40 bg-[#fff8e1] shadow-md"
                initial={false}
                animate={{ y: headerOpen ? 0 : '-100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            >
            {user && <TopBar embedded onSettingsOpenChange={setSettingsOpen} />}
            <div className="w-full max-w-md mx-auto px-4 py-2 flex justify-between items-center relative">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Room ID</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-gray-800 tracking-widest">{room.id}</span>
                        <button
                            onClick={() => navigator.clipboard.writeText(room.id)}
                            className="bg-gray-800 hover:bg-gray-700 p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${room.gameState === 'WAITING' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' :
                        room.gameState === 'PLAYING' ? 'bg-green-500/10 border-green-500/50 text-green-500' :
                            'bg-gray-800 border-gray-700 text-gray-400'
                        }`}>
                        {room.gameState}
                    </div>
                    <button
                        onClick={() => {
                            if (socket) socket.emit('leave_room', room.id);
                            router.push('/');
                        }}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 p-2 rounded-xl transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Tab hanging below the drawer (right side, clear of the centered opponent cards); stays visible when closed */}
            <button
                onClick={() => setHeaderOpen(o => !o)}
                aria-expanded={headerOpen}
                aria-label={t(headerOpen ? 'game.header_hide' : 'game.header_show')}
                className="absolute top-full right-4 w-14 h-6 flex items-center justify-center bg-[#1A1C2C] text-[#FFCD75] border-2 border-t-0 border-[#566C86] shadow-[3px_3px_0_#0D0E17]"
            >
                <svg viewBox="0 0 10 6" width="12" height="8" shapeRendering="crispEdges" aria-hidden="true"
                    className={`transition-transform duration-200 ${headerOpen ? '' : 'rotate-180'}`}>
                    <path d="M1 5L5 1L9 5" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
            </button>
            </motion.div>

            {/* Game Area */}
            <div className="flex flex-col items-center w-full flex-1 min-h-0">

                {/* Main Interaction Area */}
                <div className="w-full flex-1 min-h-[300px] flex flex-col items-center justify-center">
                    {room.gameState === 'WAITING' ? (
                        <div className="text-center w-full">
                            {room.players.length < 2 ? (
                                <div className="flex flex-col items-center animate-pulse">
                                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-3xl mb-4 border-2 border-gray-700 border-dashed">
                                        ?
                                    </div>
                                    <div className="text-xl font-bold text-gray-400">{t('game.waiting_opponent')}</div>
                                    <div className="text-xs text-gray-600 mt-2 uppercase tracking-wide">Waiting for player to join...</div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-6 w-full max-w-xs mx-auto">
                                    <div className="text-xl text-green-400 font-bold tracking-wider uppercase animate-pulse">Opponent Found!</div>
                                    <button
                                        onClick={handleStartGame}
                                        className="w-full py-4 rounded-xl font-black text-xl uppercase tracking-widest shadow-xl transition-all transform active:scale-95 relative overflow-hidden group bg-white"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-[length:200%_auto] animate-[gradient_3s_linear_infinite]" />
                                        <span className="relative z-10 text-white drop-shadow-md">
                                            {t('game.start_game')}
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Merge Auth User activeHint into GameBoard me prop
                        // This ensures that even if room.players doesn't have the hint (yet), the user_updated event (handled by AuthProvider) delivers it.
                        <GameBoard
                            room={room}
                            me={me ? { ...me, activeHint: user?.activeHint } : me}
                            gameOverReason={gameOverReason}
                            eloChanges={eloChanges}
                        />
                    )}
                </div>

            </div>
            {exitModal}
        </main>
    );
}
