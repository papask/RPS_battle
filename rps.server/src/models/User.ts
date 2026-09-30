import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDocument extends Document {
    auth: {
        provider: 'temp' | 'google' | 'kakao';
        socialId: string;
        email?: string;
        tokenHash?: string;
        privateToken?: string; // legacy plaintext token, migrated to tokenHash on first use
    };
    profile: {
        nickname: string;
        avatarUrl?: string;
        equippedSkin?: string;
        equippedItems?: string[];
    };
    assets: {
        hearts: number;
        lastHeartUpdate: Date;
        tokens: number;
    };
    stats: {
        normal: {
            wins: number;
            losses: number;
        };
        rank: {
            elo: number;
            tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master';
            division: number;
            serverRank?: number;
            wins: number;
            losses: number;
            currentStreak: number;
        };
        hardcore: {
            currentStreak: number;
            bestStreak: number;
            seasonBestStreak: number;
            wins: number;
            losses: number;
        };
    };
    behavior: {
        rockCount: number;
        paperCount: number;
        scissorsCount: number;
        recentMoves: string[];
    };
    inventory: {
        itemId: string;
        count: number;
    }[];
    cooldowns?: {
        shield?: Date;
    };
    activeEffects?: string[];
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema({
    auth: {
        provider: { type: String, required: true, enum: ['temp', 'google', 'kakao'], default: 'temp' },
        socialId: { type: String, required: true, unique: true },
        email: { type: String },
        tokenHash: { type: String, unique: true, sparse: true }, // sha256 of the session token; the token itself is never stored
        privateToken: { type: String, unique: true, sparse: true },
    },
    profile: {
        nickname: { type: String, required: true },
        avatarUrl: { type: String },
        equippedSkin: { type: String },
        equippedItems: { type: [String], default: [] },
    },
    assets: {
        hearts: { type: Number, default: 5, max: 5 },
        lastHeartUpdate: { type: Date, default: Date.now },
        tokens: { type: Number, default: 0 },
    },
    stats: {
        normal: {
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 }
        },
        rank: {
            elo: { type: Number, default: 1000 },
            tier: { type: String, default: 'Bronze', enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master'] },
            division: { type: Number, default: 4 },
            serverRank: { type: Number },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
        },
        hardcore: {
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            seasonBestStreak: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
        }
    },
    behavior: {
        rockCount: { type: Number, default: 0 },
        paperCount: { type: Number, default: 0 },
        scissorsCount: { type: Number, default: 0 },
        recentMoves: { type: [String], default: [] }
    },
    inventory: [{
        itemId: { type: String, required: true },
        count: { type: Number, default: 1 }
    }],
    cooldowns: {
        shield: { type: Date }
    },
    activeEffects: [{ type: String }] // e.g., ['shield']
}, { timestamps: true });

// Nicknames are unique ignoring case ("Bot" and "BOT" collide). Queries must pass the same collation.
export const NICKNAME_COLLATION = { locale: 'en', strength: 2 };
UserSchema.index({ 'profile.nickname': 1 }, { unique: true, collation: NICKNAME_COLLATION });

export default mongoose.model<IUserDocument>('User', UserSchema);
