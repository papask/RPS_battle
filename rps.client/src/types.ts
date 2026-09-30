
export type GameStatus = 'WAITING' | 'PLAYING' | 'ROUND_RESULT' | 'GAME_OVER';
export type Move = 'rock' | 'paper' | 'scissors' | null;
export type GameMode = 'classic' | 'normal' | 'rank' | 'hardcore';

export interface IPlayerState {
    id: string; // Socket ID
    _id?: string; // DB ID
    nickname: string;
    roomId?: string;
    avatarUrl?: string;
    equippedItems?: string[];
    score: number;
    move: Move;
    hasMoved?: boolean; // set on opponents while their pick is hidden
    isReady: boolean;
    hearts?: number;
    tokens?: number;
    deck?: {
        rock: number;
        paper: number;
        scissors: number;
    };
    stats?: {
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
    nextHeartAt?: number;
    behavior?: {
        rockCount: number;
        paperCount: number;
        scissorsCount: number;
        recentMoves?: string[];
    };
    inventory?: {
        itemId: string;
        count: number;
    }[];
    cooldowns?: {
        shield?: string;
    };
    activeEffects?: string[];
    activeHint?: {
        message: string;
        type?: 'history' | 'count';
        moves?: string[];
        data?: any;
    } | null;
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
    roundDeadline?: number; // server epoch ms; unplayed moves are auto-picked after it
}

export interface GameOverPayload {
    winnerId: string;
    reason?: string;
    eloChanges?: { [userId: string]: number };
}

export interface Item {
    id: string;
    name: string;
    description: string;
    cost: number;
    effectType: 'hint' | 'shield';
}

export type User = IPlayerState;
