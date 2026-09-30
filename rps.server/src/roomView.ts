import { IRoom } from './types';

// What `viewerId` may see of a room. Opponents' move history and inventory never leave
// the server, and while a round is open their pick is hidden (only whether they picked).
export const viewFor = (room: IRoom, viewerId: string) => ({
    ...room,
    players: room.players.map(p => {
        if (p.id === viewerId) return p;
        const { behavior, inventory, ...visible } = p;
        return room.gameState === 'PLAYING' ? { ...visible, move: null, hasMoved: !!p.move } : visible;
    }),
});

// Room updates always go per player; never broadcast the raw room to the socket.io room.
export const emitRoom = (io: any, room: IRoom | null | undefined, event = 'room_updated') => {
    if (!room) return;
    room.players.forEach(p => io.to(p.id).emit(event, viewFor(room, p.id)));
};
