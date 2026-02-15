
import { IRoom, IPlayerState, Move } from '../types';

export class GameManager {
    constructor(private io: any, private roomManager: any) { }

    // Helper to determine round winner
    // Returns: 'p1', 'p2', or 'draw'
    private determineRoundWinner(m1: Move, m2: Move): 'p1' | 'p2' | 'draw' {
        if (m1 === m2) return 'draw';

        if (
            (m1 === 'rock' && m2 === 'scissors') ||
            (m1 === 'paper' && m2 === 'rock') ||
            (m1 === 'scissors' && m2 === 'paper')
        ) {
            return 'p1';
        }

        return 'p2';
    }

    startGame(room: IRoom) {
        room.gameState = 'PLAYING';
        room.currentRound = 1;
        room.gameWinner = null;
        room.roundWinner = null;

        // Reset players
        room.players.forEach(p => {
            p.score = 0;
            p.move = null;
        });

        console.log(`[GameManager] Room ${room.id} started!`);
    }

    handleMove(room: IRoom, playerId: string, move: Move): boolean {
        if (room.gameState !== 'PLAYING') return false;

        const player = room.players.find(p => p.id === playerId);
        if (!player) return false;

        player.move = move;

        // Check if all players moved
        const allMoved = room.players.every(p => p.move !== null);
        if (allMoved) {
            this.resolveRound(room);
            return true; // Round finished
        }

        return false; // Waiting for other player
    }

    private resolveRound(room: IRoom) {
        const [p1, p2] = room.players;

        if (!p1.move || !p2.move) return; // Should not happen

        const result = this.determineRoundWinner(p1.move, p2.move);

        if (result === 'p1') {
            p1.score += 1;
            room.roundWinner = p1.id;
        } else if (result === 'p2') {
            p2.score += 1;
            room.roundWinner = p2.id;
        } else {
            room.roundWinner = 'draw';
        }

        room.gameState = 'ROUND_RESULT';

        // Check Win Condition (Best of 3 -> First to 2)
        if (p1.score >= 2) {
            room.gameWinner = p1.id;
            room.gameState = 'GAME_OVER';
            this.handleGameEnd(room, p1, p2);
        } else if (p2.score >= 2) {
            room.gameWinner = p2.id;
            room.gameState = 'GAME_OVER';
            this.handleGameEnd(room, p2, p1);
        } else {
            // Prepare next round
        }
    }

    private async handleGameEnd(room: IRoom, winner: IPlayerState, loser: IPlayerState) {
        console.log(`[GameManager] Handling Game End. Winner: ${winner.nickname} (${winner._id}), Loser: ${loser.nickname} (${loser._id})`);

        // Dynamic import to avoid circular dependency issues if any
        const User = require('../models/User').default;

        // Update Winner
        if (winner && winner._id) {
            try {
                await User.findByIdAndUpdate(winner._id, {
                    $inc: { 'stats.wins': 1, 'assets.tokens': 10 }
                });

                // Update Room Player State
                if (winner.stats) winner.stats.wins += 1;
                winner.tokens = (winner.tokens || 0) + 10;

                // Sync with RoomManager (Global State) & Emit Update
                const globalWinner = this.roomManager.getUser(winner.id);
                if (globalWinner) {
                    globalWinner.stats = winner.stats;
                    globalWinner.tokens = winner.tokens;
                    this.io.to(winner.id).emit('user_updated', globalWinner);
                }

            } catch (e) { console.error('Error updating winner:', e); }
        }

        // Update Loser (Deduct Heart)
        if (loser && loser._id) {
            // Careful update: Only reset timer if we were at full hearts
            // If we were already recovering (< 5), we keep the old timestamp so the timer doesn't reset!
            const currentUser = await User.findById(loser._id);
            if (currentUser) {
                const updates: any = { $inc: { 'stats.losses': 1, 'assets.hearts': -1 } };

                if (currentUser.assets.hearts >= 5) {
                    updates.$set = { 'assets.lastHeartUpdate': new Date() };
                }

                await User.findByIdAndUpdate(loser._id, updates);

                // Fetch updated doc to get accurate heart count/timer if needed, or just calc manually
                // Manual calc for speed:
            }

            // Update Room Player State
            if (loser.stats) loser.stats.losses += 1;
            loser.hearts = (loser.hearts || 0) - 1;

            // Sync with RoomManager (Global State) & Emit Update
            const globalLoser = this.roomManager.getUser(loser.id);
            if (globalLoser) {
                globalLoser.stats = loser.stats;
                globalLoser.hearts = loser.hearts;

                // If hearts dropped < 5, ensure nextHeartAt is set (if not already)
                if (globalLoser.hearts < 5 && !globalLoser.nextHeartAt) {
                    // We need the timestamp. Ideally fetch from DB or use Now() approximation
                    // Using current time as approximation for the *start* of recovery if it was full
                    globalLoser.nextHeartAt = Date.now() + (10 * 60 * 1000);
                }

                this.io.to(loser.id).emit('user_updated', globalLoser);
            }
        }
    }

    resetRound(room: IRoom) {
        room.gameState = 'PLAYING';
        room.roundWinner = null;
        room.players.forEach(p => p.move = null);
        room.currentRound += 1;
    }

    async forfeitGame(room: IRoom, disconnectedIds: string) {
        // Allow forfeit in PLAYING, ROUND_RESULT, or WAITING (if 2 players involved)
        if (room.gameState === 'GAME_OVER') return;

        console.log(`[GameManager] Forfeit in Room ${room.id} by ${disconnectedIds} (State: ${room.gameState})`);

        const winner = room.players.find(p => p.id !== disconnectedIds);
        const loser = room.players.find(p => p.id === disconnectedIds);

        if (winner && loser) {
            room.gameWinner = winner.id;
            room.gameState = 'GAME_OVER';
            room.roundWinner = null;

            await this.handleGameEnd(room, winner, loser);

            // Notify clients of forfeit specifically
            this.io.to(room.id).emit('game_over', {
                winnerId: winner.id,
                reason: 'opponent_disconnected'
            });
            this.io.to(room.id).emit('room_updated', room);

            // Should we force room cleanup here? roomManager might do it on leaveRoom
        }
    }
}
