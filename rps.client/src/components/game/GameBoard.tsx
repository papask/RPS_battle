
'use client';

import { useSocket } from '@/components/providers/SocketProvider';
import { IPlayerState, IRoom, Move } from '@/types';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface GameBoardProps {
    room: IRoom;
    me: IPlayerState;
    gameOverReason?: string | null;
}

interface GameBoardProps {
    room: IRoom;
    me: IPlayerState;
    gameOverReason?: string | null;
}

import { useRouter } from 'next/navigation';

export default function GameBoard({ room, me, gameOverReason }: GameBoardProps) {
    const { t, i18n } = useTranslation();
    const socket = useSocket();
    const router = useRouter();
    const [selectedMove, setSelectedMove] = useState<Move>(null);
    const [timeLeft, setTimeLeft] = useState(5);

    const movesData: { type: Move; label: string; emoji: string }[] = [
        { type: 'rock', label: t('game.moves.rock'), emoji: '✊' },
        { type: 'paper', label: t('game.moves.paper'), emoji: '✋' },
        { type: 'scissors', label: t('game.moves.scissors'), emoji: '✌️' },
    ];

    // Korean Order: Scissors, Rock, Paper
    const MOVES = i18n.language.startsWith('ko')
        ? [movesData[2], movesData[0], movesData[1]]
        : movesData;

    useEffect(() => {
        // Reset local selection when server state is reset (new round)
        if (me?.move === null) {
            setSelectedMove(null);
        }
    }, [me?.move, room.currentRound]);

    // Auto-redirect on Game Over
    useEffect(() => {
        if (room.gameState === 'GAME_OVER') {
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [room.gameState]);

    // Handle navigation when timer hits 0
    useEffect(() => {
        if (room.gameState === 'GAME_OVER' && timeLeft === 0) {
            if (socket) socket.emit('leave_room', room.id);
            router.push('/');
        }
    }, [timeLeft, room.gameState, router, socket, room.id]);

    const handleMove = (move: Move) => {
        if (selectedMove || room.gameState !== 'PLAYING') return;

        setSelectedMove(move);
        if (socket) {
            socket.emit('make_move', { roomId: room.id, move });
        }
    };

    if (room.gameState === 'ROUND_RESULT') {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-800 rounded-xl shadow-2xl">
                <h2 className="text-3xl font-bold mb-4 text-yellow-400">Round Result</h2>
                <div className="text-2xl mb-8 text-center text-white">
                    {room.roundWinner === 'draw' ? (
                        <span className="text-gray-400">{t('game.result.draw')}</span>
                    ) : room.roundWinner === me.id ? (
                        <span className="text-green-400">{t('game.result.you_won')}</span>
                    ) : (
                        <span className="text-red-400">{t('game.result.you_lost')}</span>
                    )}
                </div>
                <div className="text-gray-400 animate-pulse">{t('game.next_round')}</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full">
            <h2 className="text-xl mb-6 text-gray-300">{t('game.round', { round: room.currentRound })}</h2>

            <div className="flex gap-4 justify-center">
                {MOVES.map((m) => (
                    <motion.button
                        key={m.type}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleMove(m.type)}
                        disabled={!!selectedMove}
                        className={`
              w-32 h-32 rounded-xl flex flex-col items-center justify-center text-6xl shadow-xl transition-all
              ${selectedMove === m.type
                                ? 'bg-blue-600 border-4 border-blue-300 ring-4 ring-blue-500/50'
                                : 'bg-gray-700 hover:bg-gray-600 border border-gray-600'}
              ${selectedMove && selectedMove !== m.type ? 'opacity-50 blur-sm' : 'opacity-100'}
            `}
                    >
                        <div>{m.emoji}</div>
                        <div className="text-sm mt-2 font-bold text-white tracking-wider">{m.label.toUpperCase()}</div>
                    </motion.button>
                ))}
            </div>

            {selectedMove && (
                <div className="mt-8 text-xl text-blue-300 animate-bounce font-mono">
                    {t('game.waiting_opponent')}
                </div>
            )}

            {/* Game Over Screen */}
            {room.gameState === 'GAME_OVER' && (
                <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
                    <h2 className={`text-6xl font-black mb-8 ${room.gameWinner === me?.id ? 'text-green-500' : 'text-red-500'}`}>
                        {room.gameWinner === me?.id ? t('game.result.victory') : t('game.result.defeat')}
                    </h2>
                    <div className="text-2xl mb-8 text-white text-center">
                        {gameOverReason === 'opponent_disconnected' && (
                            <div className="text-yellow-400 font-bold mb-2">{t('game.result.opponent_disconnected')}</div>
                        )}
                        {room.gameWinner === me?.id ? t('game.result.congrats') : t('game.result.better_luck')}
                    </div>

                    <button
                        onClick={() => {
                            if (socket) socket.emit('leave_room', room.id);
                            router.push('/');
                        }}
                        className="bg-white text-black px-8 py-3 rounded-full font-bold text-xl hover:scale-105 transition-transform"
                    >
                        {t('game.back_to_lobby')} ({timeLeft})
                    </button>
                </div>
            )}
        </div>
    );
}
