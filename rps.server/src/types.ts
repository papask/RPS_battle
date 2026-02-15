

export type GameMode = 'normal' | 'rank' | 'hardcore';

export interface IUser {
    id: string; // Socket ID
    nickname: string;
    roomId?: string;
    isDisconnected?: boolean;
    disconnectTimeout?: NodeJS.Timeout;
    // Database Fields (Synced)
    _id?: string; // MongoDB ID
    hearts: number;
    tokens: number;
    stats: {
        wins: number;
        losses: number;
    };
    nextHeartAt?: number; // Timestamp for next heart recovery
}

export type GameStatus = 'WAITING' | 'PLAYING' | 'ROUND_RESULT' | 'GAME_OVER';
export type Move = 'rock' | 'paper' | 'scissors' | null;

export interface IPlayerState extends IUser {
    score: number;
    move: Move;
    isReady: boolean;
}

export interface IRoom {
    id: string;
    mode: GameMode;
    players: IPlayerState[];
    maxPlayers: number;
    gameState: GameStatus;
    currentRound: number;
    roundWinner: string | 'draw' | null;
    gameWinner: string | null;
}
