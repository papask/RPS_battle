
export type GameStatus = 'WAITING' | 'PLAYING' | 'ROUND_RESULT' | 'GAME_OVER';
export type Move = 'rock' | 'paper' | 'scissors' | null;
export type GameMode = 'normal' | 'rank' | 'hardcore';

export interface IPlayerState {
    id: string; // Socket ID
    nickname: string;
    roomId?: string;
    score: number;
    move: Move;
    isReady: boolean;
    hearts?: number;
    tokens?: number;
    stats?: {
        wins: number;
        losses: number;
    };
    nextHeartAt?: number;
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
