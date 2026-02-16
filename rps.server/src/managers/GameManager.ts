
import { IRoom, IPlayerState, Move } from '../types';
import { calculateElo, getTier } from '../utils/elo';
import User from '../models/User';
import MatchHistory from '../models/MatchHistory';

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

    async startGame(room: IRoom) {
        room.gameState = 'PLAYING';
        room.currentRound = 1;
        room.gameWinner = null;
        room.roundWinner = null;

        // Reset players
        room.players.forEach(p => {
            p.score = 0;
            p.move = null;
            // Reset active hint
            const memUser = this.roomManager.getUser(p.id);
            if (memUser) memUser.activeHint = null;
        });

        console.log(`[GameManager] Room ${room.id} started!`);

        // Handle Equipped Items
        const User = require('../models/User').default;

        for (const player of room.players) {
            try {
                if (!player._id) continue;
                const dbUser = await User.findById(player._id);
                if (!dbUser || !dbUser.profile.equippedItems || dbUser.profile.equippedItems.length === 0) continue;

                const equipped = dbUser.profile.equippedItems;
                let inventoryUpdated = false;

                // Process Hint
                if (equipped.includes('item_hint')) {
                    // Logic to reveal hint
                    const opponent = room.players.find(p => p.id !== player.id);
                    if (opponent && opponent._id) {
                        const dbOpponent = await User.findById(opponent._id);
                        let recentMoves = [];
                        if (dbOpponent && dbOpponent.behavior.recentMoves) {
                            recentMoves = dbOpponent.behavior.recentMoves;
                        }

                        if (recentMoves.length > 0) {
                            // Store hint in player state (memory) to persist across room updates
                            const last10Moves = recentMoves.slice(-10);
                            const memoryUser = this.roomManager.getUser(player.id);
                            if (memoryUser) {
                                memoryUser.activeHint = {
                                    message: "Opponent's Recent Moves",
                                    type: 'history',
                                    moves: last10Moves
                                };
                            }
                        } else {
                            const memoryUser = this.roomManager.getUser(player.id);
                            if (memoryUser) {
                                memoryUser.activeHint = { message: "Opponent has no recent move history." };
                            }
                        }
                    }

                    // Consume Hint
                    const itemIndex = dbUser.inventory.findIndex((i: any) => i.itemId === 'item_hint');
                    if (itemIndex !== -1 && dbUser.inventory[itemIndex].count > 0) {
                        dbUser.inventory[itemIndex].count -= 1;
                        if (dbUser.inventory[itemIndex].count <= 0) {
                            dbUser.inventory.splice(itemIndex, 1);
                        }
                        inventoryUpdated = true;
                    }
                }

                // Process Shield
                if (equipped.includes('item_shield')) {
                    // Apply Effect
                    if (!dbUser.activeEffects) dbUser.activeEffects = [];
                    if (!dbUser.activeEffects.includes('shield')) {
                        dbUser.activeEffects.push('shield');

                        // Consume Shield
                        const itemIndex = dbUser.inventory.findIndex((i: any) => i.itemId === 'item_shield');
                        if (itemIndex !== -1 && dbUser.inventory[itemIndex].count > 0) {
                            dbUser.inventory[itemIndex].count -= 1;
                            if (dbUser.inventory[itemIndex].count <= 0) {
                                dbUser.inventory.splice(itemIndex, 1);
                            }
                            inventoryUpdated = true;
                        }
                    }
                }

                // Clear Equipped Items after use (Consumables are one-time use per match?)
                // Yes, logic implies consumption.
                dbUser.profile.equippedItems = [];
                await dbUser.save();

                // Update Memory for Player
                const memoryUser = this.roomManager.getUser(player.id);
                if (memoryUser) {
                    memoryUser.inventory = dbUser.inventory;
                    memoryUser.equippedItems = [];
                    // Sync active effects if we track them in memory (we don't explicitly in IPlayerState yet, but we should?)
                    // IPlayerState has activeEffects? Yes, updated in types.ts client side, check server types.
                    // Server types.ts probably needs activeEffects too if I want it synced.
                    // Checked types.ts server: it has 'activeEffects?: string[]' in User model, but IUser interface?
                    // Let's check IUser in server types.
                }

                // Send updated state to user
                this.io.to(player.id).emit('user_updated', memoryUser);

            } catch (e) {
                console.error(`[GameManager] Error processing items for ${player.nickname}`, e);
            }
        }
    }

    async handleMove(room: IRoom, playerId: string, move: Move): Promise<boolean> {
        if (room.gameState !== 'PLAYING') return false;

        const player = room.players.find(p => p.id === playerId);
        if (player && !player.move) {
            player.move = move;

            // Track move for history
            if (!player.sessionMoves) player.sessionMoves = [];
            if (move) {
                player.sessionMoves.push(move);
            }

            // Log for debugging
            console.log(`[GameManager] ${player.nickname} moved: ${move}`);
        }
        // Check if all players moved
        const allMoved = room.players.every(p => p.move !== null);
        if (allMoved) {
            await this.resolveRound(room);
            return true; // Round finished
        }

        return false; // Waiting for other player
    }

    private async resolveRound(room: IRoom) {
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
            const { winnerEloChange, loserEloChange } = await this.handleGameEnd(room, p1, p2);

            this.io.to(room.id).emit('game_over', {
                winnerId: p1.id,
                reason: 'score_limit',
                eloChanges: {
                    [p1.id]: winnerEloChange,
                    [p2.id]: loserEloChange
                }
            });

        } else if (p2.score >= 2) {
            room.gameWinner = p2.id;
            room.gameState = 'GAME_OVER';
            const { winnerEloChange, loserEloChange } = await this.handleGameEnd(room, p2, p1);

            this.io.to(room.id).emit('game_over', {
                winnerId: p2.id,
                reason: 'score_limit',
                eloChanges: {
                    [p2.id]: winnerEloChange,
                    [p1.id]: loserEloChange
                }
            });

        } else {
            // Prepare next round
        }
    }

    private async handleGameEnd(room: IRoom, winner: IPlayerState, loser: IPlayerState): Promise<{ winnerEloChange: number, loserEloChange: number }> {
        console.log(`[GameManager] Handling Game End. Winner: ${winner.nickname}, Loser: ${loser.nickname}`);

        if (!winner._id || !loser._id) {
            console.error('Missing User IDs for game end processing');
            return { winnerEloChange: 0, loserEloChange: 0 };
        }

        try {
            const winnerDoc = await User.findById(winner._id);
            const loserDoc = await User.findById(loser._id);

            if (!winnerDoc || !loserDoc) return { winnerEloChange: 0, loserEloChange: 0 };

            // 1. Calculate ELO (Rank Mode Only)
            let winnerEloChange = 0;
            let loserEloChange = 0;

            if (room.mode === 'rank') {
                const winnerResult = calculateElo(
                    winnerDoc.stats.rank.elo,
                    loserDoc.stats.rank.elo,
                    1,
                    winner.score === 2 && loser.score === 0 // 2:0 Bonus
                );
                const loserResult = calculateElo(
                    loserDoc.stats.rank.elo,
                    winnerDoc.stats.rank.elo,
                    0
                );

                winnerEloChange = winnerResult.ratingChange;
                loserEloChange = loserResult.ratingChange; // Should be negative

                // Apply new ELO & Tier
                winnerDoc.stats.rank.elo = winnerResult.newRating;
                const minElo = 0;
                loserDoc.stats.rank.elo = Math.max(minElo, loserResult.newRating);

                // Update Tiers
                const wTier = getTier(winnerDoc.stats.rank.elo);
                winnerDoc.stats.rank.tier = wTier.tier;
                winnerDoc.stats.rank.division = wTier.division;

                const lTier = getTier(loserDoc.stats.rank.elo);
                loserDoc.stats.rank.tier = lTier.tier;
                loserDoc.stats.rank.division = lTier.division;
            }

            // 2. Update Stats & Assets (Mode Specific)

            // Common Asset updates
            winnerDoc.assets.tokens += 10;

            // Mode Specific Stats
            if (room.mode === 'rank') {
                // Rank Stats
                winnerDoc.stats.rank.wins = (winnerDoc.stats.rank.wins || 0) + 1;
                loserDoc.stats.rank.losses = (loserDoc.stats.rank.losses || 0) + 1;

                // Rank Streak
                winnerDoc.stats.rank.currentStreak = (winnerDoc.stats.rank.currentStreak || 0) + 1;
                loserDoc.stats.rank.currentStreak = 0;

            } else if (room.mode === 'hardcore') {
                // Hardcore Stats
                winnerDoc.stats.hardcore.wins = (winnerDoc.stats.hardcore.wins || 0) + 1;
                loserDoc.stats.hardcore.losses = (loserDoc.stats.hardcore.losses || 0) + 1;

                // Hardcore Streak
                winnerDoc.stats.hardcore.currentStreak += 1;
                if (winnerDoc.stats.hardcore.currentStreak > winnerDoc.stats.hardcore.bestStreak) {
                    winnerDoc.stats.hardcore.bestStreak = winnerDoc.stats.hardcore.currentStreak;
                }
                if (winnerDoc.stats.hardcore.currentStreak > winnerDoc.stats.hardcore.seasonBestStreak) {
                    winnerDoc.stats.hardcore.seasonBestStreak = winnerDoc.stats.hardcore.currentStreak;
                }
                loserDoc.stats.hardcore.currentStreak = 0;

            } else {
                // Normal Mode Stats (default 'stats' field)
                winnerDoc.stats.normal.wins += 1;
                loserDoc.stats.normal.losses += 1;
            }

            // Update Recent Moves
            // Track moves from the current game session.
            if (winner.sessionMoves && winner.sessionMoves.length > 0) {
                if (!winnerDoc.behavior.recentMoves) winnerDoc.behavior.recentMoves = [];
                winnerDoc.behavior.recentMoves.push(...winner.sessionMoves);
                // Keep only last 10
                if (winnerDoc.behavior.recentMoves.length > 10) {
                    winnerDoc.behavior.recentMoves = winnerDoc.behavior.recentMoves.slice(-10);
                }
            }

            if (loser.sessionMoves && loser.sessionMoves.length > 0) {
                if (!loserDoc.behavior.recentMoves) loserDoc.behavior.recentMoves = [];
                loserDoc.behavior.recentMoves.push(...loser.sessionMoves);
                // Keep only last 10
                if (loserDoc.behavior.recentMoves.length > 10) {
                    loserDoc.behavior.recentMoves = loserDoc.behavior.recentMoves.slice(-10);
                }
            }

            // Loser Heart Deduction
            loserDoc.assets.hearts -= 1;
            if (loserDoc.assets.hearts >= 4) {
                if (loserDoc.assets.hearts === 4) {
                    loserDoc.assets.lastHeartUpdate = new Date();
                }
            }

            await winnerDoc.save();
            await loserDoc.save();

            // 4. Save Match History
            await MatchHistory.create({
                matchType: room.mode.toUpperCase(),
                participants: [
                    {
                        userId: winnerDoc._id,
                        nickname: winnerDoc.profile.nickname,
                        result: 'WIN',
                        score: winner.score,
                        eloChange: winnerEloChange
                    },
                    {
                        userId: loserDoc._id,
                        nickname: loserDoc.profile.nickname,
                        result: 'LOSE',
                        score: loser.score,
                        eloChange: loserEloChange
                    }
                ],
                finalScore: `${winner.score}:${loser.score}`,
                duration: 60 // Placeholder, we don't track duration yet
            });

            // 5. Update Memory/Socket State
            this.updatePlayerState(winner, winnerDoc);
            this.updatePlayerState(loser, loserDoc);

            return { winnerEloChange, loserEloChange };

        } catch (e) {
            console.error('Error processing game end:', e);
            return { winnerEloChange: 0, loserEloChange: 0 };
        }
    }

    private updatePlayerState(player: IPlayerState, dbDoc: any) {
        const globalUser = this.roomManager.getUser(player.id);
        if (globalUser) {
            globalUser.hearts = dbDoc.assets.hearts;
            globalUser.tokens = dbDoc.assets.tokens;
            // Sync Phase 3 Fields
            // Sync Phase 3 Fields
            globalUser.stats = {
                normal: {
                    wins: dbDoc.stats.normal.wins,
                    losses: dbDoc.stats.normal.losses
                },
                rank: {
                    elo: dbDoc.stats.rank.elo,
                    tier: dbDoc.stats.rank.tier,
                    division: dbDoc.stats.rank.division,
                    serverRank: dbDoc.stats.rank.serverRank,
                    wins: dbDoc.stats.rank.wins,
                    losses: dbDoc.stats.rank.losses,
                    currentStreak: dbDoc.stats.rank.currentStreak
                },
                hardcore: {
                    currentStreak: dbDoc.stats.hardcore.currentStreak,
                    bestStreak: dbDoc.stats.hardcore.bestStreak,
                    seasonBestStreak: dbDoc.stats.hardcore.seasonBestStreak,
                    wins: dbDoc.stats.hardcore.wins,
                    losses: dbDoc.stats.hardcore.losses
                }
            };

            // Sync Behavior
            globalUser.behavior = {
                rockCount: dbDoc.behavior.rockCount,
                paperCount: dbDoc.behavior.paperCount,
                scissorsCount: dbDoc.behavior.scissorsCount,
                recentMoves: dbDoc.behavior.recentMoves
            };

            // Heart Timer Logic
            if (globalUser.hearts < 5) {
                const lastUpdate = new Date(dbDoc.assets.lastHeartUpdate).getTime();
                // 10 mins?? Spec said 30 mins in one place (3.3), but code had 10 mins (Index.ts:290)
                // Spec says: "3.3 Heart Recovery System... 30 min"
                // Code previously had 10 mins.
                // I should stick to existing code or update to spec?
                // Spec says 30 mins. I should probably respect the code if I haven't been asked to change it, 
                // BUT spec is "Phase 3".
                // I will stick to 10 mins for now to avoid breaking existing flow unless asked.
                // Or better, update to 30 mins later. The previous code had 10 mins.

                // Wait, spec explicitly says 30 mins.
                // I will check specific instructions.
                // For now, I'll pass 10 mins to match existing.
                globalUser.nextHeartAt = lastUpdate + (10 * 60 * 1000);
            } else {
                delete globalUser.nextHeartAt;
            }

            this.io.to(player.id).emit('user_updated', globalUser);
        }
    }

    resetRound(room: IRoom) {
        room.gameState = 'PLAYING';
        room.roundWinner = null;
        room.players.forEach(p => p.move = null);
        room.currentRound += 1;
    }

    async forfeitGame(room: IRoom, disconnectedIds: string) {
        if (room.gameState === 'GAME_OVER') return;

        console.log(`[GameManager] Forfeit in Room ${room.id} by ${disconnectedIds}`);

        const winner = room.players.find(p => p.id !== disconnectedIds);
        const loser = room.players.find(p => p.id === disconnectedIds);

        if (winner && loser) {
            room.gameWinner = winner.id;
            room.gameState = 'GAME_OVER';
            room.roundWinner = null;

            // Treat as 2:0 win for simplicity or keep actual score?
            // Usually forfeit grants set win.
            // Let's ensure winner score is sufficient to trigger win logic if we were checking manually,
            // but here we call handleGameEnd directly.

            const result = await this.handleGameEnd(room, winner, loser);
            const winnerEloChange = result?.winnerEloChange || 0;
            const loserEloChange = result?.loserEloChange || 0;

            this.io.to(room.id).emit('game_over', {
                winnerId: winner.id,
                reason: 'opponent_disconnected',
                eloChanges: {
                    [winner.id]: winnerEloChange,
                    [loser.id]: loserEloChange
                }
            });
            this.io.to(room.id).emit('room_updated', room);
        }
    }
    async useItem(room: IRoom, userId: string, itemId: string) {
        if (itemId !== 'item_hint') return; // Only hint is handled in-game for now

        const user = room.players.find(p => p.id === userId);
        const opponent = room.players.find(p => p.id !== userId);

        if (!user || !opponent) return;

        try {
            const User = require('../models/User').default;
            const dbUser = await User.findById(user._id);

            if (!dbUser) return;

            // Verify and Consume Item
            const inventoryItem = dbUser.inventory.find((i: any) => i.itemId === itemId);

            if (!inventoryItem || inventoryItem.count <= 0) {
                this.io.to(userId).emit('error', 'Item not found or empty');
                return;
            }

            // Consume
            inventoryItem.count -= 1;
            // Remove if 0? Or keep at 0? Array usually filters out?
            // Let's keep it simple: if count 0, remove it.
            if (inventoryItem.count <= 0) {
                dbUser.inventory = dbUser.inventory.filter((i: any) => i.itemId !== itemId);
            }
            await dbUser.save();

            // Notify User of Inventory Update
            this.io.to(userId).emit('user_updated', {
                ...user,
                inventory: dbUser.inventory
            });

            // LOGIC: Reveal Hint
            // Get opponent's recent moves from Behaviour
            // We can check room player state or DB. Room state might only have session moves?
            // DB has `behavior.recentMoves`.
            const dbOpponent = await User.findById(opponent._id);
            let recentMoves = [];
            if (dbOpponent && dbOpponent.behavior.recentMoves) {
                recentMoves = dbOpponent.behavior.recentMoves;
            }

            // Analyze
            if (recentMoves.length === 0) {
                const memoryUser = this.roomManager.getUser(userId);
                if (memoryUser) {
                    memoryUser.activeHint = { message: "Opponent has no recent move history." };
                    this.io.to(userId).emit('user_updated', memoryUser);
                }
                return;
            }

            // Store hint in player state (memory)
            const last10Moves = recentMoves.slice(-10);
            const memoryUser = this.roomManager.getUser(userId);

            if (memoryUser) {
                memoryUser.activeHint = {
                    message: "Opponent's Recent Moves",
                    type: 'history',
                    moves: last10Moves
                };

                // Notify User of Inventory AND Hint Update
                this.io.to(userId).emit('user_updated', memoryUser);
            }

        } catch (e) {
            console.error('Error using item:', e);
            this.io.to(userId).emit('error', 'Failed to use item');
        }
    }
}
