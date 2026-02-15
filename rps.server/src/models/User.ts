
import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDocument extends Document {
    auth: {
        provider: 'temp' | 'google' | 'kakao';
        socialId: string;
        email?: string;
    };
    profile: {
        nickname: string;
        avatarUrl?: string;
        equippedSkin?: string;
    };
    assets: {
        hearts: number;
        lastHeartUpdate: Date;
        tokens: number;
    };
    stats: {
        wins: number;
        losses: number;
    };
    rank: {
        elo: number;
        tier: string;
        division: number;
    };
    createdAt: Date;
}

const UserSchema: Schema = new Schema({
    auth: {
        provider: { type: String, required: true, enum: ['temp', 'google', 'kakao'], default: 'temp' },
        socialId: { type: String, required: true, unique: true },
        email: { type: String },
        privateToken: { type: String, unique: true, sparse: true }, // For persistent session
    },
    profile: {
        nickname: { type: String, required: true },
        avatarUrl: { type: String },
        equippedSkin: { type: String },
    },
    assets: {
        hearts: { type: Number, default: 5, max: 5 },
        lastHeartUpdate: { type: Date, default: Date.now },
        tokens: { type: Number, default: 0 },
    },
    stats: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
    },
    rank: {
        elo: { type: Number, default: 1000 },
        tier: { type: String, default: 'Bronze' },
        division: { type: Number, default: 4 },
    },
}, { timestamps: true });

export default mongoose.model<IUserDocument>('User', UserSchema);
