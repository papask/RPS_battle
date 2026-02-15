'use client';

import { useSocket } from '@/components/providers/SocketProvider';
import GameBoard from '@/components/game/GameBoard';
import { IPlayerState, IRoom } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/providers/AuthProvider';

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = use(params);
    const { t } = useTranslation();

    const socket = useSocket();
    const { user, isLoading: isAuthLoading } = useAuth(); // Use Auth Context
    const router = useRouter();
    const [room, setRoom] = useState<IRoom | null>(null);
    const [me, setMe] = useState<IPlayerState | null>(null);

    const [gameOverReason, setGameOverReason] = useState<string | null>(null);

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

            socket.on('game_over', (data: { winnerId: string, reason?: string }) => {
                if (data.reason) {
                    setGameOverReason(data.reason);
                }
            });

            socket.on('opponent_left', () => {
                alert(t('game.result.opponent_disconnected'));
                router.push('/');
            });

            socket.on('error', (message: string) => {
                console.error(message);
                // Added specific error handling from the change
                if (message === 'Room is full') {
                    alert(t('game.full'));
                    router.push('/');
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
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                {isAuthLoading ? 'Authenticating...' : `Loading Room ${roomId}...`}
            </div>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center p-8 bg-gray-900 text-white font-sans">
            {/* Header */}
            <div className="w-full max-w-5xl flex justify-between items-center mb-12 p-4 bg-gray-800 rounded-lg shadow-md">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-200">Room: <span className="text-white">{room.id}</span></h1>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(room.id);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs font-bold transition"
                    >
                        {t('game.copy')}
                    </button>
                </div>
                <div className="flex gap-4">
                    <div className="text-yellow-400 font-bold px-4 py-2 bg-gray-900 rounded border border-yellow-600">
                        {t('game.status')}: {room.gameState}
                    </div>
                    <button
                        onClick={() => {
                            if (socket) socket.emit('leave_room', room.id);
                            router.push('/');
                        }}
                        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white text-sm font-semibold transition"
                    >
                        {t('game.leave')}
                    </button>
                </div>
            </div>

            {/* Game Area */}
            <div className="flex flex-col items-center w-full max-w-5xl">

                {/* Score Board */}
                <div className="flex justify-between w-full mb-12 px-12 items-center">
                    {room.players.map((p, i) => (
                        <div key={p.id || i} className={`flex flex-col items-center ${p.id === me?.id ? 'order-1' : 'order-3'}`}>
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold mb-4 shadow-lg
                         ${p.id === me?.id ? 'bg-blue-600 border-4 border-blue-400' : 'bg-red-600 border-4 border-red-400'}`}>
                                {p.nickname.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-2xl font-bold">{p.nickname} {p.id === me?.id && t('game.you')}</div>
                            <div className="text-5xl font-black mt-2 text-gray-200">{p.score}</div>
                        </div>
                    ))}

                    {/* VS Divider */}
                    <div className="order-2 flex flex-col justify-center items-center">
                        <div className="text-6xl font-black text-gray-700 italic">{t('game.vs')}</div>
                    </div>
                </div>

                {/* Main Interaction Area */}
                <div className="w-full min-h-[400px] flex flex-col items-center justify-center bg-gray-800/50 rounded-2xl border-2 border-gray-700 p-8 backdrop-blur-sm">
                    {room.gameState === 'WAITING' ? (
                        <div className="text-center">
                            {room.players.length < 2 ? (
                                <div className="text-2xl text-gray-400 animate-pulse">{t('game.waiting_opponent')}</div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    <div className="text-2xl text-green-400 font-bold mb-4">{t('game.ready')}</div>
                                    <button
                                        onClick={handleStartGame}
                                        className="bg-yellow-500 hover:bg-yellow-600 text-black text-xl font-bold px-8 py-4 rounded-full shadow-lg hover:shadow-yellow-500/50 transition-all transform hover:scale-105"
                                    >
                                        {t('game.start_game')}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <GameBoard room={room} me={me} gameOverReason={gameOverReason} />
                    )}
                </div>

            </div>
        </main>
    );
}
