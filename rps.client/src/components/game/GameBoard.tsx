'use client';

import { useSocket } from '@/components/providers/SocketProvider';
import { IPlayerState, IRoom, Move } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Card from './Card';

interface GameBoardProps {
    room: IRoom;
    me: IPlayerState;
    gameOverReason?: string | null;
    eloChanges?: { [key: string]: number } | null;
}

export default function GameBoard({ room, me, gameOverReason, eloChanges }: GameBoardProps) {
    const { t, i18n } = useTranslation();
    const socket = useSocket();
    const router = useRouter();
    const [selectedMove, setSelectedMove] = useState<Move>(null);
    const [timeLeft, setTimeLeft] = useState(3);

    // Identify Opponent
    const opponent = room.players.find(p => p.id !== me.id);
    // Server hides the opponent's pick until the round resolves; hasMoved says whether they picked
    const opponentMoved = !!opponent?.move || !!opponent?.hasMoved;

    const movesData: { type: Exclude<Move, null>; label: string; }[] = [
        { type: 'rock', label: t('game.moves.rock') },
        { type: 'paper', label: t('game.moves.paper') },
        { type: 'scissors', label: t('game.moves.scissors') },
    ];

    // Korean Order: Scissors, Rock, Paper
    const MOVES = i18n.language.startsWith('ko')
        ? [movesData[2], movesData[0], movesData[1]]
        : movesData;

    // --- Effects ---

    useEffect(() => {
        // Follow server state: reset on new round, or show the card auto-picked on timeout
        setSelectedMove(me?.move ?? null);
    }, [me?.move, room.currentRound]);

    // Round countdown
    // ponytail: trusts client clock vs server's deadline; send remaining ms instead if clock skew shows up
    const [roundSecondsLeft, setRoundSecondsLeft] = useState<number | null>(null);
    useEffect(() => {
        if (room.gameState !== 'PLAYING' || !room.roundDeadline) {
            setRoundSecondsLeft(null);
            return;
        }
        const tick = () => setRoundSecondsLeft(Math.max(0, Math.ceil((room.roundDeadline! - Date.now()) / 1000)));
        tick();
        const id = setInterval(tick, 250);
        return () => clearInterval(id);
    }, [room.gameState, room.roundDeadline]);

    // Auto-redirect on Game Over
    useEffect(() => {
        if (room.gameState === 'GAME_OVER') {
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) return 0;
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

    // Hint Logic
    const [hintData, setHintData] = useState<{ message: string, data?: any, type?: string, moves?: string[] } | null>(null);
    useEffect(() => {
        if (me?.activeHint) {
            setHintData(me.activeHint);
        }
    }, [me?.activeHint]);

    // --- Handlers ---

    const handleMove = (move: Move) => {
        if (selectedMove || room.gameState !== 'PLAYING') return;

        setSelectedMove(move);
        if (socket) {
            socket.emit('make_move', { roomId: room.id, move });
        }
    };

    const handleUseHint = () => {
        if (socket && room) {
            socket.emit('use_item', { roomId: room.id, itemId: 'item_hint' });
        }
    };

    const hasHintItem = me?.inventory?.some(i => i.itemId === 'item_hint' && i.count > 0);


    // --- Render Helpers ---

    const renderScore = (score: number) => (
        <span className="font-pixel text-[10px] bg-[#FFCD75] text-[#1A1C2C] border-2 border-[#1A1C2C] px-1.5 py-0.5" aria-label={`score ${score}`}>
            {score}
        </span>
    );

    const renderOpponentHand = () => {
        // Visual flair: Opponent's hand
        return (
            <div className="absolute -top-4 w-full flex justify-center items-start h-20 overflow-visible z-0 pointer-events-none opacity-80">
                {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="px-card-back w-10 h-14 border-2 border-[#1A1C2C] -ml-3 first:ml-0 relative"
                        style={{
                            transform: `rotate(${(i - 2) * 8}deg) translateY(${Math.abs(i - 2) * 4}px)`,
                            zIndex: i
                        }}
                    />
                ))}
            </div>
        );
    };

    const renderRoundResult = () => {
        if (room.gameState !== 'ROUND_RESULT') return null;

        const myMove = me.move;
        const opponentMove = opponent?.move;

        // Determine result from perspective of me
        let resultText = '';
        let resultColor = '';

        if (room.roundWinner === 'draw') {
            resultText = t('game.result.draw');
            resultColor = 'text-[#F4F4F4]';
        } else if (room.roundWinner === me.id) {
            resultText = t('game.result.you_won');
            resultColor = 'text-[#A7F070]';
        } else {
            resultText = t('game.result.you_lost');
            resultColor = 'text-[#EF7D57]';
        }

        return (
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center z-20 pointer-events-none"
            >
                <h2 className={`font-pixel text-3xl short:text-xl ${resultColor} drop-shadow-[4px_4px_0_#0D0E17] uppercase whitespace-nowrap`}>
                    {resultText}
                </h2>
            </motion.div>
        );
    };

    // --- Main Render ---

    // Unroll deck into individual cards for Player Hand
    const getPlayerHand = () => {
        if (room.mode === 'classic' || room.isSuddenDeath) {
            // In Classic/Sudden Death, requested to show 6 cards (2 of each) visually
            // Sort by type (Rock, Paper, Scissors) or custom order
            const hand: { type: Exclude<Move, null>, uniqueId: string }[] = [];
            // 2 of each
            for (let i = 0; i < 2; i++) {
                hand.push({ type: 'rock', uniqueId: `rock-${i}` });
                hand.push({ type: 'paper', uniqueId: `paper-${i}` });
                hand.push({ type: 'scissors', uniqueId: `scissors-${i}` });
            }
            // Sort for display logic (optional, but grouping looks nice)
            return hand.sort((a, b) => {
                const order = { scissors: 1, rock: 2, paper: 3 };
                return order[a.type] - order[b.type];
            });
        }

        // For other modes, unroll the deck counts
        if (!me.deck) return [];

        const hand: { type: Exclude<Move, null>, uniqueId: string }[] = [];

        // Korean Order: Scissors, Rock, Paper
        if (i18n.language.startsWith('ko')) {
            for (let i = 0; i < (me.deck.scissors || 0); i++) hand.push({ type: 'scissors', uniqueId: `scissors-${i}` });
            for (let i = 0; i < (me.deck.rock || 0); i++) hand.push({ type: 'rock', uniqueId: `rock-${i}` });
            for (let i = 0; i < (me.deck.paper || 0); i++) hand.push({ type: 'paper', uniqueId: `paper-${i}` });
        } else {
            for (let i = 0; i < (me.deck.rock || 0); i++) hand.push({ type: 'rock', uniqueId: `rock-${i}` });
            for (let i = 0; i < (me.deck.paper || 0); i++) hand.push({ type: 'paper', uniqueId: `paper-${i}` });
            for (let i = 0; i < (me.deck.scissors || 0); i++) hand.push({ type: 'scissors', uniqueId: `scissors-${i}` });
        }
        return hand;
    };

    const playerHand = getPlayerHand();

    // --- Main Render ---

    return (
        <div className="px-scene flex flex-col flex-1 min-h-0 w-full max-w-md mx-auto relative overflow-hidden">

            {/* Center Line */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-[#333C57] z-0 pointer-events-none" />

            {/* --- TOP HALF (Opponent) --- */}
            <div className="flex-1 basis-0 min-h-0 flex flex-col relative w-full">
                {/* Content Container - Pinned to Top */}
                <div className="w-full pt-4 flex flex-col items-center gap-2 z-10">
                    {renderOpponentHand()}

                    <div className="flex flex-col items-center gap-1">
                        <div className="w-14 h-14 short:w-10 short:h-10 bg-[#B13E53] border-4 border-[#1A1C2C] shadow-[4px_4px_0_#0D0E17] flex items-center justify-center font-pixel text-lg text-[#F4F4F4] relative">
                            {opponent?.nickname?.substring(0, 1).toUpperCase() || '?'}
                            {/* Opponent Status Indicator */}
                            {opponentMoved && room.gameState === 'PLAYING' && (
                                <div className="absolute -bottom-2 -right-2 w-5 h-5 bg-[#A7F070] border-2 border-[#1A1C2C]" aria-label="ready" />
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="font-pixel text-[8px] bg-[#1A1C2C] text-[#F4F4F4] px-2 py-1">
                                {opponent?.nickname || t('game.opponent')}
                            </span>
                            {renderScore(opponent?.score ?? 0)}
                        </div>
                    </div>
                </div>

                {/* Opponent Played Card - fills the rest of the top half; pb reserves room for the center round info */}
                <div className="flex-1 min-h-0 flex items-center justify-center pb-8 short:pb-5 z-20 pointer-events-none">
                    <div className="w-24 h-36 short:w-16 short:h-24 flex items-center justify-center">
                    <AnimatePresence>
                        {opponentMoved && (
                            <motion.div
                                initial={{ y: -50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ type: 'spring', bounce: 0.5 }}
                            >
                                <Card
                                    type={room.gameState === 'ROUND_RESULT' ? (opponent.move as any) : 'unknown'}
                                    isOpponent={true}
                                    revealed={room.gameState === 'ROUND_RESULT'}
                                    isWinner={room.roundWinner === opponent?.id}
                                    isLoser={room.roundWinner === me.id}
                                    cardBackUrl={undefined}
                                />
                            </motion.div>
                        )}
                        {!opponentMoved && room.gameState === 'PLAYING' && (
                            <div className="w-20 h-28 short:w-16 short:h-24 border-4 border-dashed border-[#566C86] flex items-center justify-center">
                                <span className="px-blink font-pixel text-[8px] text-[#94B0C2]">...</span>
                            </div>
                        )}
                    </AnimatePresence>
                    </div>
                </div>
            </div>


            {/* --- ROUND INFO (Absolute Center) --- */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center justify-center">
                {/* One row so it barely eats into either half: the result replaces the badge */}
                {room.gameState === 'ROUND_RESULT' ? renderRoundResult() : (
                    <div className="px-panel px-4 py-2 flex items-center gap-3">
                        <span className={`font-pixel text-[10px] whitespace-nowrap ${room.isSuddenDeath ? 'text-[#EF7D57]' : 'text-[#FFCD75]'}`}>
                            {room.isSuddenDeath ? "SUDDEN DEATH" : `ROUND ${room.currentRound}`}
                        </span>
                        {/* Round Timer */}
                        {roundSecondsLeft !== null && !selectedMove && (
                            <span className={`font-pixel text-sm leading-none ${roundSecondsLeft <= 3 ? 'text-[#EF7D57] px-blink' : 'text-[#F4F4F4]'}`}>
                                {roundSecondsLeft}
                            </span>
                        )}
                    </div>
                )}
            </div>


            {/* --- BOTTOM HALF (Player) --- */}
            <div className="flex-1 basis-0 min-h-0 flex flex-col relative w-full">

                {/* Player Played Card - fills the space above my info row; pt reserves room for the center round info */}
                <div className="flex-1 min-h-0 flex items-center justify-center pt-8 short:pt-5 z-20 pointer-events-none">
                    <div className="w-24 h-36 short:w-16 short:h-24 flex items-center justify-center">
                    <AnimatePresence>
                        {selectedMove && (
                            <motion.div
                                initial={{ y: 200, opacity: 0, scale: 0.5 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                layoutId="player-played-card"
                            >
                                <Card
                                    type={selectedMove}
                                    isWinner={room.roundWinner === me.id}
                                    isLoser={room.roundWinner === opponent?.id}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    </div>
                </div>

                {/* Hints Control (Absolute) */}
                <div className="absolute top-4 right-4 z-40 pointer-events-auto">
                    {hasHintItem && !hintData && room.gameState === 'PLAYING' && (
                        <button
                            onClick={handleUseHint}
                            className="px-panel font-pixel text-[8px] text-[#FFCD75] px-3 py-2 active:translate-x-0.5 active:translate-y-0.5"
                        >
                            HINT
                        </button>
                    )}
                    {/* Hint Bubble */}
                    {hintData && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-[#5D275D] text-[#F4F4F4] text-[10px] font-bold px-3 py-1.5 border-2 border-[#1A1C2C] shadow-[3px_3px_0_#0D0E17] whitespace-nowrap"
                        >
                            {hintData.message}
                        </motion.div>
                    )}
                </div>


                {/* Player Avatar + Score (above the hand) */}
                <div className="flex items-center gap-2 px-4 pb-3 z-10 pointer-events-none">
                    <div className="w-10 h-10 short:w-8 short:h-8 shrink-0 bg-[#3B5DC9] border-4 border-[#1A1C2C] shadow-[3px_3px_0_#0D0E17] flex items-center justify-center font-pixel text-xs text-[#F4F4F4]">
                        {me.nickname?.substring(0, 1).toUpperCase()}
                    </div>
                    <span className="font-pixel text-[8px] bg-[#1A1C2C] text-[#F4F4F4] px-2 py-1 min-w-0 truncate">
                        {me.nickname}
                    </span>
                    {renderScore(me.score ?? 0)}
                </div>

                {/* Player Hand - Fixed at Bottom */}
                <div className="flex items-end justify-center perspective-500 w-full z-20 px-2 pb-0">
                    <div className="flex justify-center -space-x-8 short:-space-x-4 pb-[calc(env(safe-area-inset-bottom)+16px)] short:pb-[calc(env(safe-area-inset-bottom)+8px)]">
                        {playerHand.map((card, index) => {
                            const isExhausted = false; // Individual cards are just present or not. If deck logic is used, handle validation elsewhere or hide used.
                            // Actually, if we unroll, we just show what's available. If `me.deck` decrements, the list shrinks.

                            const isDisabled = !!selectedMove || room.gameState !== 'PLAYING';

                            return (
                                <motion.div
                                    key={card.uniqueId}
                                    className={`relative transition-transform hover:-translate-y-6 hover:z-10 ${selectedMove ? 'opacity-50 grayscale' : ''}`}
                                    initial={{ y: 100, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    style={{ zIndex: index }}
                                >
                                    <div className="transform scale-90 sm:scale-100 origin-bottom">
                                        <Card
                                            type={card.type as any}
                                            onClick={() => handleMove(card.type as any)}
                                            disabled={isDisabled}
                                        />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* Game Over Overlay */}
            {room.gameState === 'GAME_OVER' && (
                <div className="absolute inset-0 bg-[#1A1C2C]/90 z-50 flex flex-col items-center justify-center p-8">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3, ease: (t: number) => Math.floor(t * 3) / 3 }}
                        className="px-panel p-8 w-full max-w-sm text-center"
                    >
                        <h2 className={`font-pixel text-2xl mb-4 uppercase drop-shadow-[3px_3px_0_#0D0E17] ${room.gameWinner === me?.id ? 'text-[#A7F070]' : room.gameWinner === 'draw' ? 'text-[#F4F4F4]' : 'text-[#EF7D57]'}`}>
                            {room.gameWinner === me?.id ? t('game.result.victory') : room.gameWinner === 'draw' ? t('game.result.draw_title') : t('game.result.defeat')}
                        </h2>

                        <p className="text-[#94B0C2] font-bold mb-8">
                            {room.gameWinner === me?.id ? t('game.result.congrats') : room.gameWinner === 'draw' ? t('game.result.good_game') : t('game.result.better_luck')}
                        </p>

                        {room.mode === 'rank' && eloChanges && me?.id && eloChanges[me.id] !== undefined && (
                            <div className={`mb-8 font-pixel text-3xl flex items-center justify-center gap-2 ${eloChanges[me.id] >= 0 ? 'text-[#A7F070]' : 'text-[#EF7D57]'}`}>
                                <span>{eloChanges[me.id] >= 0 ? '+' : ''}{eloChanges[me.id]}</span>
                                <span className="text-sm font-bold opacity-50 uppercase tracking-widest mt-4">LP</span>
                            </div>
                        )}

                        <button
                            onClick={() => {
                                if (socket) socket.emit('leave_room', room.id);
                                router.push('/');
                            }}
                            className="w-full py-4 bg-[#B13E53] text-[#F4F4F4] font-bold text-lg border-4 border-[#1A1C2C] shadow-[4px_4px_0_#0D0E17,inset_0_-6px_0_#5D275D] active:translate-x-1 active:translate-y-1 active:shadow-none"
                        >
                            {t('game.back_to_lobby')} ({timeLeft})
                        </button>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
