
import { IUser, GameMode } from '../types';
import { RoomManager } from './RoomManager';
import { Server } from 'socket.io';

export class MatchmakingManager {
    private queues: Record<GameMode, IUser[]> = {
        'normal': [],
        'rank': [],
        'hardcore': []
    };

    constructor(private roomManager: RoomManager, private io: Server) { }

    addPlayer(user: IUser, mode: GameMode) {
        // Remove from other queues first
        this.removePlayer(user.id);

        console.log(`[Matchmaking] Adding ${user.nickname} to ${mode} queue`);
        this.queues[mode].push(user);

        this.tryMatch(mode);
    }

    removePlayer(userId: string) {
        for (const mode of Object.keys(this.queues) as GameMode[]) {
            this.queues[mode] = this.queues[mode].filter(u => u.id !== userId);
        }
    }

    private tryMatch(mode: GameMode) {
        const queue = this.queues[mode];

        if (queue.length >= 2) {
            // Match found!
            const p1 = queue.shift()!;
            const p2 = queue.shift()!;

            console.log(`[Matchmaking] Matched ${p1.nickname} vs ${p2.nickname} in ${mode}`);

            // Create Room
            const roomId = Math.random().toString(36).substring(7);
            const room = this.roomManager.createRoom(roomId, mode);

            // Join players
            this.roomManager.joinRoom(roomId, p1);
            this.roomManager.joinRoom(roomId, p2);

            // Notify Clients
            this.io.to(p1.id).emit('match_found', { roomId, mode });
            this.io.to(p2.id).emit('match_found', { roomId, mode });

            // Make actual socket join
            const p1Socket = this.io.sockets.sockets.get(p1.id);
            const p2Socket = this.io.sockets.sockets.get(p2.id);

            if (p1Socket) p1Socket.join(roomId);
            if (p2Socket) p2Socket.join(roomId);

            this.io.to(roomId).emit('room_updated', room);
        }
    }
}
