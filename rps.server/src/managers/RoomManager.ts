
import { IRoom, IUser, GameMode } from '../types';

export class RoomManager {
    private rooms: Map<string, IRoom> = new Map();
    private users: Map<string, IUser> = new Map();

    createRoom(roomId: string, mode: GameMode = 'normal'): IRoom {
        if (this.rooms.has(roomId)) {
            throw new Error('Room already exists');
        }
        const room: IRoom = {
            id: roomId,
            mode: mode,
            players: [],
            maxPlayers: 2,
            gameState: 'WAITING',
            currentRound: 0,
            roundWinner: null,
            gameWinner: null,
        };
        this.rooms.set(roomId, room);
        return room;
    }

    joinRoom(roomId: string, user: IUser): IRoom {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error('Room not found');
        }

        // If user is already in this room, check if they are in players list
        const existingPlayer = room.players.find(p => p.id === user.id);
        if (existingPlayer) {
            return room;
        }

        if (room.players.length >= room.maxPlayers) {
            throw new Error('Room is full');
        }

        // Remove user from previous room if any
        if (user.roomId && user.roomId !== roomId) {
            this.leaveRoom(user.id);
        }

        user.roomId = roomId;

        // Initialize Player State
        const playerState = {
            ...user,
            score: 0,
            move: null,
            isReady: false
        };

        room.players.push(playerState);
        this.users.set(user.id, user);

        return room;
    }

    leaveRoom(userId: string): IRoom | null {
        const user = this.users.get(userId);
        if (!user || !user.roomId) return null;

        const roomId = user.roomId;
        const room = this.rooms.get(roomId);

        if (room) {
            room.players = room.players.filter(p => p.id !== userId);
            user.roomId = undefined;

            if (room.players.length === 0) {
                this.rooms.delete(roomId);
            }
            return room;
        }
        return null;
    }

    getUser(userId: string): IUser | undefined {
        return this.users.get(userId);
    }

    addUser(user: IUser) {
        // Initialize defaults if not present
        if (user.hearts === undefined) user.hearts = 5;
        if (user.tokens === undefined) user.tokens = 0;
        if (!user.stats) user.stats = { wins: 0, losses: 0 };
        this.users.set(user.id, user);
    }

    removeUser(userId: string) {
        this.leaveRoom(userId);
        this.users.delete(userId);
    }

    getRooms(): IRoom[] {
        return Array.from(this.rooms.values());
    }

    // New: Handle Disconnect with Grace Period
    handleDisconnect(socketId: string, onTimeout: () => void): boolean {
        const user = this.users.get(socketId);
        if (!user) return false;

        // If user is in a room, mark as disconnected and set timeout
        if (user.roomId) {
            user.isDisconnected = true;
            console.log(`[RoomManager] User ${user.nickname} (${socketId}) disconnected. Waiting for reconnect...`);

            // Clear existing timeout if any (shouldn't happen usually)
            if (user.disconnectTimeout) clearTimeout(user.disconnectTimeout);

            user.disconnectTimeout = setTimeout(() => {
                console.log(`[RoomManager] User ${user.nickname} (${socketId}) timed out.`);
                onTimeout(); // Callback to forfeit/leave
            }, 10000); // 10 seconds grace period

            return true; // We handled it (delayed removal)
        }

        return false; // Not in room, safe to remove immediately
    }

    handleReconnect(oldSocketId: string, newSocketId: string): IUser | null {
        // This is tricky because `users` is keyed by socketId.
        // We can't find by oldSocketId easily if we don't know it, BUT the client should send token.
        // Index.ts will find DB user by token -> get DB ID -> We need to find user by DB ID in memory.
        return null;
    }

    // Find user by DB ID (for reconnection)
    findUserByDbId(dbId: string): IUser | undefined {
        for (const user of this.users.values()) {
            if (user._id === dbId) return user;
        }
        return undefined;
    }

    reconnectUser(newSocketId: string, user: IUser) {
        // Clear timeout
        if (user.disconnectTimeout) {
            clearTimeout(user.disconnectTimeout);
            user.disconnectTimeout = undefined;
        }
        user.isDisconnected = false;

        // Update Key in Map: Remove old socket ID, Add new socket ID
        this.users.delete(user.id); // Remove old key
        user.id = newSocketId;      // Update ID
        this.users.set(newSocketId, user); // Add new key

        // Update Room Player List (reference update)
        if (user.roomId) {
            const room = this.rooms.get(user.roomId);
            if (room) {
                const player = room.players.find(p => p.nickname === user.nickname); // or match by other stable field
                // Actually, the player object in 'room.players' IS the same reference as 'user'.
                // So updating 'user.id' above automatically updates it in 'room.players' IF it's the same object.
                // RoomManager.joinRoom pushes 'playerState' which is {...user, score...}. A COPY.
                // So we MUST update the player in the room explicitly.
                if (player) {
                    player.id = newSocketId;
                    player.isDisconnected = false;
                }
            }
        }

        console.log(`[RoomManager] User ${user.nickname} reconnected with new socket ${newSocketId}`);
    }
}
