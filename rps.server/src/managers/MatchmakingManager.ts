
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

        if (mode === 'rank') {
            // ELO-based matching
            const ELO_THRESHOLD = 300; // Allow +/- 300 difference

            let i = 0;
            while (i < queue.length) {
                const p1 = queue[i];
                let matchIndex = -1;

                for (let j = i + 1; j < queue.length; j++) {
                    const p2 = queue[j];
                    const p1Elo = p1.stats?.rank?.elo || 1000;
                    const p2Elo = p2.stats?.rank?.elo || 1000;

                    if (Math.abs(p1Elo - p2Elo) <= ELO_THRESHOLD) {
                        matchIndex = j;
                        break;
                    }
                }

                if (matchIndex !== -1) {
                    // Match found
                    // Remove p2 first (higher index) to avoid shifting issues for p1
                    const p2 = queue.splice(matchIndex, 1)[0];
                    // Remove p1
                    const p1Ref = queue.splice(i, 1)[0]; // Should be same as p1

                    this.createMatch(p1Ref, p2, mode);
                    // Do not increment i, because the array has shifted left. 
                    // We check the new user at 'i' in next iteration.
                } else {
                    // No match for this user, move to next
                    i++;
                }
            }

        } else {
            // Normal / Hardcore: FIFO
            while (queue.length >= 2) {
                const p1 = queue.shift()!;
                const p2 = queue.shift()!;
                this.createMatch(p1, p2, mode);
            }
        }
    }

    private createMatch(p1: IUser, p2: IUser, mode: GameMode) {
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
