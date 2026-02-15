
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
import User from './models/User';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const port = process.env.PORT || 3001;

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

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Initialize user
    roomManager.addUser({
        id: socket.id,
        nickname: `User-${socket.id.substr(0, 4)}`, // Default nickname
        hearts: 5,
        tokens: 0,
        stats: { wins: 0, losses: 0 }
    });

    socket.on('set_nickname', async (nickname: string) => {
        try {
            const User = require('./models/User').default;
            const { v4: uuidv4 } = require('uuid');

            // Check if nickname is taken (simple check, though duplicate nicknames are allowed in current logic)
            // For now, let's create a new user or update existing if we can find by nickname (but nickname isn't unique index)
            // Sticking to "Create New" flow, but with token persistence for future logins

            // Generate a fresh token for this new session
            const newToken = uuidv4();

            let dbUser = await User.findOne({ 'profile.nickname': nickname });

            if (dbUser) {
                // User exists: Update token for this new session
                dbUser.auth.privateToken = newToken;
                dbUser.auth.socialId = `temp_${socket.id}_${Date.now()}`;
                await dbUser.save();
            } else {
                // Create New User
                dbUser = await User.create({
                    auth: {
                        provider: 'temp',
                        socialId: `temp_${socket.id}_${Date.now()}`,
                        privateToken: newToken
                    },
                    profile: {
                        nickname: nickname,
                    },
                });
            }


            // Sync with RoomManager Memory
            const user = roomManager.getUser(socket.id);
            if (user) {
                user.nickname = nickname;
                user._id = dbUser._id.toString();
                user.hearts = dbUser.assets.hearts;
                user.tokens = dbUser.assets.tokens;
                user.stats = dbUser.stats;

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
                        socket.emit('room_joined', room); // Re-send room data
                        io.to(room.id).emit('room_updated', room);
                    }
                } else {
                    // Normal Login (New Session)
                    user = roomManager.getUser(socket.id);
                    if (user) {
                        user.nickname = dbUser.profile.nickname;
                        user._id = dbUser._id.toString();
                        user.hearts = dbUser.assets.hearts;
                        user.tokens = dbUser.assets.tokens;
                        user.stats = dbUser.stats;

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
            io.to(roomId).emit('room_updated', room);
        }
    });

    socket.on('create_room', (roomId: string) => {
        try {
            const room = roomManager.createRoom(roomId);
            const user = roomManager.getUser(socket.id);
            if (user) {
                roomManager.joinRoom(roomId, user);
                socket.join(roomId);
                socket.emit('room_joined', room);
                io.to(roomId).emit('room_updated', room);
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
                socket.emit('room_joined', room);
                io.to(roomId).emit('room_updated', room);
            }
        } catch (e: any) {
            socket.emit('error', e.message);
        }
    });

    // GAME EVENTS
    socket.on('start_game', (roomId: string) => {
        try {
            const room = roomManager.getRooms().find(r => r.id === roomId);
            if (room && room.players.length === 2) {
                gameManager.startGame(room);
                io.to(roomId).emit('room_updated', room);
            }
        } catch (e: any) {
            socket.emit('error', e.message);
        }
    });

    socket.on('make_move', ({ roomId, move }: { roomId: string, move: any }) => {
        try {
            const room = roomManager.getRooms().find(r => r.id === roomId);
            if (room) {
                const roundFinished = gameManager.handleMove(room, socket.id, move);
                io.to(roomId).emit('room_updated', room);

                if (roundFinished) {
                    // Determine if game is over or next round
                    if (room.gameState === 'GAME_OVER') {
                        // Game Over
                    } else {
                        // Auto-start next round after delay
                        setTimeout(() => {
                            gameManager.resetRound(room);
                            io.to(roomId).emit('room_updated', room);
                        }, 3000); // 3 seconds delay for round result
                    }
                }
            }
        } catch (e: any) {
            socket.emit('error', e.message);
        }
    });

    socket.on('reset_game', (roomId: string) => {
        const room = roomManager.getRooms().find(r => r.id === roomId);
        if (room) {
            gameManager.startGame(room);
            io.to(roomId).emit('room_updated', room);
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
                    io.to(leftRoom.id).emit('room_updated', leftRoom);
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
                io.to(room.id).emit('room_updated', room);
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

app.get('/', (req: any, res: any) => {
    res.send('RPS Battle Server is running!');
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
