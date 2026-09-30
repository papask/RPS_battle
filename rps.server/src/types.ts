
export type GameMode = 'classic' | 'normal' | 'rank' | 'hardcore';

export interface IUser {
    id: string; // Socket ID
    nickname: string;
    roomId?: string;
    isDisconnected?: boolean;
    isBot?: boolean;
    disconnectTimeout?: NodeJS.Timeout;

    // Database Fields (Synced)
    _id?: string; // MongoDB ID
    hearts: number;
    tokens: number;
    stats: {
        normal: {
            wins: number;
            losses: number;
        };
        rank: {
            elo: number;
            tier: string;
            division: number;
            serverRank?: number;
            wins?: number;
            losses?: number;
            currentStreak?: number;
        };
        hardcore: {
            currentStreak: number;
            bestStreak: number;
            seasonBestStreak: number;
            wins?: number;
            losses?: number;
        };
    };
    behavior?: {
        rockCount: number;
        paperCount: number;
        scissorsCount: number;
        recentMoves?: string[];
    };
    inventory?: { itemId: string; count: number }[];
    equippedItems?: string[];
    nextHeartAt?: number;
}

export type GameStatus = 'WAITING' | 'PLAYING' | 'ROUND_RESULT' | 'GAME_OVER';
export type Move = 'rock' | 'paper' | 'scissors' | null;

export interface IPlayerState extends IUser {
    score: number;
    move: Move;
    isReady?: boolean;
    sessionMoves?: string[];
    activeHint?: {
        message: string;
        type?: 'history' | 'count';
        moves?: string[];
        data?: any;
    } | null;
    deck?: {
        rock: number;
        paper: number;
        scissors: number;
    };
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
    isSuddenDeath?: boolean;
    roundDeadline?: number; // epoch ms when unplayed moves are auto-picked
}
