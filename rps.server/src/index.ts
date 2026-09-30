
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { RoomManager } from './managers/RoomManager';
import { GameManager } from './managers/GameManager';
import { MatchmakingManager } from './managers/MatchmakingManager';
import { IUser, GameMode } from './types';

import { connectDB } from './db';
import { emitRoom, viewFor } from './roomView';
import User from './models/User';

dotenv.config();

// Connect to MongoDB
// Connect to MongoDB
connectDB().then(async () => {
    // Seed Items
    try {
        const Item = require('./models/Item').default;
        const count = await Item.countDocuments();
        if (count === 0) {
            console.log('Seeding initial items...');
            await Item.create([
                {
                    id: 'item_hint',
                    name: 'Hint Check',
                    description: 'Reveals opponent\'s last 10 moves.',
                    cost: 50,
                    effectType: 'hint'
                },
                {
                    id: 'item_shield',
                    name: 'Streak Shield',
                    description: 'Prevents streak reset on loss (Hardcore only). 1 use per day.',
                    cost: 100,
                    effectType: 'shield'
                }
            ]);
            console.log('Items seeded.');
        }
    } catch (e) {
        console.error('Error seeding items:', e);
    }
});

const app = express();
const port = process.env.PORT || 3701;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const roomManager = new RoomManager();
const gameManager = new GameManager(io, roomManager);
const matchmakingManager = new MatchmakingManager(roomManager, io);

// Middleware to expose managers to routes
app.use((req: any, res, next) => {
    req.io = io;
    req.roomManager = roomManager;
    next();
});

// Routes
import shopRoutes from './routes/shop';
import inventoryRoutes from './routes/inventory';

app.use('/api/shop', shopRoutes);
app.use('/api/inventory', inventoryRoutes);

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Initialize user
    roomManager.addUser({
        id: socket.id,
        nickname: `User-${socket.id.substr(0, 4)}`, // Default nickname
        hearts: 5,
        tokens: 0,
        stats: {
            normal: { wins: 0, losses: 0 },
            rank: {
                elo: 1000,
                tier: 'Bronze',
                division: 4,
                wins: 0,
                losses: 0,
                currentStreak: 0
            },
            hardcore: {
                currentStreak: 0,
                bestStreak: 0,
                seasonBestStreak: 0,
                wins: 0,
                losses: 0
            }
        }
    });

    socket.on('set_nickname', async (nickname: string) => {
        try {
            const User = require('./models/User').default;
            const { v4: uuidv4 } = require('uuid');

            // Generate a fresh token for this new session
            const newToken = uuidv4();

            if (typeof nickname !== 'string' || !nickname.trim() || nickname.length > 20) {
                return socket.emit('error', 'Invalid nickname');
            }
            nickname = nickname.trim();

            // Existing accounts are only reachable via their token (login_with_token),
            // otherwise anyone typing a nickname would take over that account.
            if (await User.exists({ 'profile.nickname': nickname })) {
                return socket.emit('error', 'Nickname already taken');
            }

            const dbUser = await User.create({
                auth: {
                    provider: 'temp',
                    socialId: `temp_${socket.id}_${Date.now()}`,
                    privateToken: newToken
                },
                profile: {
                    nickname: nickname,
                },
            });


            // Sync with RoomManager Memory
            const user = roomManager.getUser(socket.id);
            if (user) {
                user.nickname = nickname;
                user._id = dbUser._id.toString();
                user.hearts = dbUser.assets.hearts;
                user.tokens = dbUser.assets.tokens;
                user.stats = {
                    normal: {
                        wins: dbUser.stats.normal.wins,
                        losses: dbUser.stats.normal.losses
                    },
                    rank: {
                        elo: dbUser.stats.rank.elo,
                        tier: dbUser.stats.rank.tier,
                        division: dbUser.stats.rank.division,
                        serverRank: dbUser.stats.rank.serverRank,
                        wins: dbUser.stats.rank.wins,
                        losses: dbUser.stats.rank.losses,
                        currentStreak: dbUser.stats.rank.currentStreak
                    },
                    hardcore: {
                        currentStreak: dbUser.stats.hardcore.currentStreak,
                        bestStreak: dbUser.stats.hardcore.bestStreak,
                        seasonBestStreak: dbUser.stats.hardcore.seasonBestStreak,
                        wins: dbUser.stats.hardcore.wins,
                        losses: dbUser.stats.hardcore.losses
                    }
                };
                user.behavior = dbUser.behavior;
                user.inventory = dbUser.inventory;

                if (user.hearts < 5) {
                    const lastUpdate = new Date(dbUser.assets.lastHeartUpdate).getTime();
                    user.nextHeartAt = lastUpdate + (10 * 60 * 1000);
                } else {
                    delete user.nextHeartAt;
                }

                // Send user data + token back to client
                socket.emit('user_updated', user);
                socket.emit('auth_token', newToken); // Send the secret token!
            }
        } catch (e) {
            console.error('DB Error:', e);
            socket.emit('error', 'Failed to create user');
        }
    });

    socket.on('login_with_token', async (token: string) => {
        try {
            // Reject objects like { $ne: null } that would match any user
            if (typeof token !== 'string' || !token) return socket.emit('auth_error', 'Invalid token');
            const User = require('./models/User').default;
            const dbUser = await User.findOne({ 'auth.privateToken': token });

            if (dbUser) {
                // Check if this user is a "disconnected" user in RoomManager
                let user = roomManager.findUserByDbId(dbUser._id.toString());

                if (user && user.isDisconnected) {
                    // Handle Reconnection
                    roomManager.reconnectUser(socket.id, user);
                    socket.join(user.roomId!);

                    // Notify client of successful reconnect
                    socket.emit('auth_success', { message: 'Reconnected to game' });
                    socket.emit('user_updated', user);

                    // Get Room State
                    const room = roomManager.getRooms().find(r => r.id === user!.roomId);
                    if (room) {
                        socket.emit('room_joined', viewFor(room, socket.id)); // Re-send room data
                        emitRoom(io, room);
                    }
                } else {
                    // Normal Login (New Session)
                    user = roomManager.getUser(socket.id);
                    if (user) {
                        user.nickname = dbUser.profile.nickname;
                        user._id = dbUser._id.toString();
                        user.hearts = dbUser.assets.hearts;
                        user.tokens = dbUser.assets.tokens;
                        user.stats = {
                            normal: {
                                wins: dbUser.stats.normal.wins,
                                losses: dbUser.stats.normal.losses
                            },
                            rank: {
                                elo: dbUser.stats.rank.elo,
                                tier: dbUser.stats.rank.tier,
                                division: dbUser.stats.rank.division,
                                serverRank: dbUser.stats.rank.serverRank,
                                wins: dbUser.stats.rank.wins,
                                losses: dbUser.stats.rank.losses,
                                currentStreak: dbUser.stats.rank.currentStreak
                            },
                            hardcore: {
                                currentStreak: dbUser.stats.hardcore.currentStreak,
                                bestStreak: dbUser.stats.hardcore.bestStreak,
                                seasonBestStreak: dbUser.stats.hardcore.seasonBestStreak,
                                wins: dbUser.stats.hardcore.wins,
                                losses: dbUser.stats.hardcore.losses
                            }
                        };
                        user.behavior = dbUser.behavior;
                        user.inventory = dbUser.inventory;

                        if (user.hearts < 5) {
                            const lastUpdate = new Date(dbUser.assets.lastHeartUpdate).getTime();
                            user.nextHeartAt = lastUpdate + (10 * 60 * 1000);
                        } else {
                            delete user.nextHeartAt;
                        }

                        socket.emit('user_updated', user);
                        socket.emit('auth_success', { message: 'Logged in via token' });
                    }
                }
            } else {
                socket.emit('auth_error', 'Invalid token');
            }
        } catch (e) {
            console.error('Token Login Error:', e);
            socket.emit('auth_error', 'Server error');
        }
    });

    socket.on('find_match', (mode: GameMode) => {
        const user = roomManager.getUser(socket.id);
        if (user) {
            matchmakingManager.addPlayer(user, mode);
            socket.emit('match_searching');
        }
    });

    socket.on('cancel_match', () => {
        matchmakingManager.removePlayer(socket.id);
        socket.emit('match_cancelled');
    });

    socket.on('leave_room', (roomId: string) => {
        // Handle Game Forfeit if playing
        const user = roomManager.getUser(socket.id);
        if (user && user.roomId === roomId) {
            // Explicit leave: Clear any pending disconnect timeout just in case
            if (user.disconnectTimeout) clearTimeout(user.disconnectTimeout);

            const room = roomManager.getRooms().find(r => r.id === roomId);
            if (room && room.players.length === 2) {
                // If 2 players are present, leaving counts as forfeit regardless of state (WAITING or PLAYING)
                // This prevents dodging queues or pre-game leaving to avoid stats
                gameManager.forfeitGame(room, socket.id);
            } else if (room && room.gameState === 'WAITING') {
                // If alone or other specific waiting cases (should be covered above if 2 players)
                socket.to(roomId).emit('opponent_left');
            }

            roomManager.leaveRoom(socket.id);
            socket.leave(roomId);
            emitRoom(io, room);
        }
    });

    socket.on('create_room', (roomId: string) => {
        try {
            const room = roomManager.createRoom(roomId);
            const user = roomManager.getUser(socket.id);
            if (user) {
                roomManager.joinRoom(roomId, user);
                socket.join(roomId);
                socket.emit('room_joined', viewFor(room, socket.id));
                emitRoom(io, room);
            }
        } catch (e: any) {
            socket.emit('error', e.message);
        }
    });

    socket.on('join_room', (roomId: string) => {
        try {
            const user = roomManager.getUser(socket.id);
            if (user) {
                const room = roomManager.joinRoom(roomId, user);
                socket.join(roomId);
                socket.emit('room_joined', viewFor(room, socket.id));
                emitRoom(io, room);
            }
        } catch (e: any) {
            socket.emit('error', e.message);
        }
    });

    // GAME EVENTS
    socket.on('start_game', async (roomId: string) => {
        try {
            const room = roomManager.getRooms().find(r => r.id === roomId);
            if (room && room.players.length === 2) {
                await gameManager.startGame(room);
                emitRoom(io, room);
            }
        } catch (e: any) {
            socket.emit('error', e.message);
        }
    });

    socket.on('make_move', async ({ roomId, move }: { roomId: string, move: any }) => {
        try {
            if (!['rock', 'paper', 'scissors'].includes(move)) return;
            const room = roomManager.getRooms().find(r => r.id === roomId);
            if (room) {
                await gameManager.submitMove(room, socket.id, move);
            }
        } catch (e: any) {
            socket.emit('error', e.message);
        }
    });

    socket.on('reset_game', async (roomId: string) => {
        const room = roomManager.getRooms().find(r => r.id === roomId);
        if (room) {
            await gameManager.startGame(room);
            emitRoom(io, room);
        }
    });

    socket.on('use_item', ({ roomId, itemId }: { roomId: string, itemId: string }) => {
        try {
            const room = roomManager.getRooms().find(r => r.id === roomId);
            if (room) {
                gameManager.useItem(room, socket.id, itemId);
            }
        } catch (e: any) {
            socket.emit('error', e.message);
        }
    });

    // Heart Recovery Check (Socket)
    socket.on('check_hearts', async () => {
        try {
            const user = roomManager.getUser(socket.id);
            if (!user || !user._id) return; // Need DB ID

            const User = require('./models/User').default;
            const dbUser = await User.findById(user._id);

            if (!dbUser) return;

            if (dbUser.assets.hearts < 5) {
                const now = new Date();
                const lastUpdate = new Date(dbUser.assets.lastHeartUpdate);
                const diffMs = now.getTime() - lastUpdate.getTime();
                const RECOVERY_TIME_MS = 10 * 60 * 1000; // 10 minutes
                const recovered = Math.floor(diffMs / RECOVERY_TIME_MS);

                if (recovered > 0) {
                    const newHearts = Math.min(5, dbUser.assets.hearts + recovered);

                    // Update DB
                    dbUser.assets.hearts = newHearts;
                    const recoveredTime = recovered * RECOVERY_TIME_MS;
                    dbUser.assets.lastHeartUpdate = new Date(lastUpdate.getTime() + recoveredTime);

                    if (newHearts === 5) {
                        dbUser.assets.lastHeartUpdate = new Date();
                    }
                    await dbUser.save();
                }
            }

            // Sync RoomManager & Emit
            user.hearts = dbUser.assets.hearts;
            if (user.hearts < 5) {
                const lastUpdate = new Date(dbUser.assets.lastHeartUpdate).getTime();
                user.nextHeartAt = lastUpdate + (10 * 60 * 1000);
            } else {
                delete user.nextHeartAt;
            }

            socket.emit('user_updated', user);

        } catch (e) {
            console.error('Check Hearts Error:', e);
        }
    });

    // Item Equipping
    socket.on('equip_item', async (itemId: string) => {
        try {
            const user = roomManager.getUser(socket.id);
            if (!user || (!user._id && !user.id)) return;
            // Need DB access
            const User = require('./models/User').default;
            // Use _id if available, but socket user might only have memory state?
            // RoomManager user has _id if logged in/created.
            const dbId = user._id;
            if (!dbId) return socket.emit('error', 'User not authenticated');

            const dbUser = await User.findById(dbId);
            if (!dbUser) return;

            // Check if owns item
            const hasItem = dbUser.inventory.some((i: any) => i.itemId === itemId && i.count > 0);
            if (!hasItem) {
                return socket.emit('error', 'You do not own this item');
            }

            // Init array if missing
            if (!dbUser.profile.equippedItems) dbUser.profile.equippedItems = [];

            // Check if already equipped
            if (dbUser.profile.equippedItems.includes(itemId)) {
                return; // Already equipped
            }

            // Logic: Limit 1 item of each "type"?
            // We only have 'item_hint' and 'item_shield'. They are different types.
            // Let's just allow equipping both. 
            // BUT prevent equipping multiple of SAME type if we had them (e.g. 2 different shields). 
            // Current items have unique IDs for types effectively. 
            // So just push.

            dbUser.profile.equippedItems.push(itemId);
            await dbUser.save();

            // Update memory
            user.equippedItems = dbUser.profile.equippedItems;

            // Notify
            socket.emit('user_updated', user);
            socket.emit('equip_success', { itemId, equipped: true });

        } catch (e: any) {
            console.error('Equip Error:', e);
            socket.emit('error', 'Failed to equip item');
        }
    });

    socket.on('unequip_item', async (itemId: string) => {
        try {
            const user = roomManager.getUser(socket.id);
            if (!user || !user._id) return;

            const User = require('./models/User').default;
            const dbUser = await User.findById(user._id);
            if (!dbUser) return;

            if (!dbUser.profile.equippedItems) return;

            dbUser.profile.equippedItems = dbUser.profile.equippedItems.filter((id: string) => id !== itemId);
            await dbUser.save();

            // Update memory
            user.equippedItems = dbUser.profile.equippedItems;

            // Notify
            socket.emit('user_updated', user);
            socket.emit('equip_success', { itemId, equipped: false });

        } catch (e: any) {
            console.error('Unequip Error:', e);
            socket.emit('error', 'Failed to unequip item');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        matchmakingManager.removePlayer(socket.id);

        // Handle Game Forfeit if playing
        const user = roomManager.getUser(socket.id);

        // Try to handle as a temporary disconnect first (Grace Period)
        const handled = roomManager.handleDisconnect(socket.id, () => {
            // Timeout Callback: Forfeit and Remove
            console.log(`[Index] User ${socket.id} timed out. Removing.`);

            // We need to re-fetch the room because state might have changed during timeout?
            // Actually, the user object reference in RoomManager is still valid with .roomId
            const timeoutUser = roomManager.getUser(socket.id); // might be undefined if we removed it? No, user is still in map.
            if (timeoutUser && timeoutUser.roomId) {
                const room = roomManager.getRooms().find(r => r.id === timeoutUser.roomId);
                if (room && room.players.length === 2) {
                    gameManager.forfeitGame(room, socket.id);
                }
                const leftRoom = roomManager.leaveRoom(socket.id);
                if (leftRoom) {
                    emitRoom(io, leftRoom);
                }
            }
            roomManager.removeUser(socket.id);
        });

        if (handled) {
            // Disconnect handling initiated (timeout set). 
            // We do NOT remove user from memory or room yet.
            // But we should notify the room that player is disconnected?
            if (user && user.roomId) {
                io.to(user.roomId).emit('opponent_disconnected_temp'); // Optional: Client UI update "Opponent Reconnecting..."
            }
        } else {
            // Standard removal (not in room or failed)
            const room = roomManager.leaveRoom(socket.id);
            if (room) {
                emitRoom(io, room);
            }
            roomManager.removeUser(socket.id);
        }
    });
});




// Heart Recovery Endpoint (Optional - keeping for reference or admin)
app.get('/api/recover-hearts/:userId', async (req: any, res: any) => {
    try {
        const userId = req.params.userId;
        const User = require('./models/User').default;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.assets.hearts < 5) {
            const now = new Date();
            const lastUpdate = new Date(user.assets.lastHeartUpdate);
            const diffMs = now.getTime() - lastUpdate.getTime();
            const RECOVERY_TIME_MS = 10 * 60 * 1000; // 10 minutes
            const recovered = Math.floor(diffMs / RECOVERY_TIME_MS);

            if (recovered > 0) {
                const newHearts = Math.min(5, user.assets.hearts + recovered);

                // Only update if hearts actually changed
                if (newHearts > user.assets.hearts) {
                    user.assets.hearts = newHearts;
                    const recoveredTime = recovered * RECOVERY_TIME_MS;
                    user.assets.lastHeartUpdate = new Date(lastUpdate.getTime() + recoveredTime);

                    if (newHearts === 5) {
                        user.assets.lastHeartUpdate = new Date(); // Reset when full
                    }

                    await user.save();
                }
            }

            // Return next recovery time
            const nextUpdate = new Date(user.assets.lastHeartUpdate.getTime() + 10 * 60 * 1000);
            return res.json({
                hearts: user.assets.hearts,
                nextRecovery: nextUpdate,
                serverTime: now
            });
        }

        return res.json({ hearts: 5, message: 'Hearts are full' });

    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});


// Leaderboard Endpoint
app.get('/api/leaderboard', async (req: any, res: any) => {
    try {
        const User = require('./models/User').default;

        // Top 50 by ELO
        const leaderboard = await User.find({})
            .sort({ 'stats.rank.elo': -1 })
            .limit(50)
            .select('profile.nickname stats.rank.elo stats.rank.tier stats.rank.division stats.rank.wins stats.rank.losses stats.hardcore.bestStreak');

        res.json(leaderboard);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/', (req: any, res: any) => {
    res.send('RPS Battle Server is running!');
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
