import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMatchHistoryDocument extends Document {
    matchType: 'NORMAL' | 'RANK' | 'HARDCORE';
    participants: {
        userId: Types.ObjectId;
        nickname: string;
        result: 'WIN' | 'LOSE' | 'DRAW'; // Final result for the user
        score: number; // Rounds won
        eloChange?: number;
    }[];
    finalScore: string; // e.g. "2:1"
    duration: number; // Seconds
    createdAt: Date;
}

const MatchHistorySchema: Schema = new Schema({
    matchType: { type: String, required: true, enum: ['NORMAL', 'RANK', 'HARDCORE'] },
    participants: [{
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        nickname: { type: String, required: true }, // Snapshot of nickname at time of match
        result: { type: String, required: true, enum: ['WIN', 'LOSE', 'DRAW'] },
        score: { type: Number, required: true },
        eloChange: { type: Number }, // How much ELO changed
    }],
    finalScore: { type: String, required: true },
    duration: { type: Number, default: 0 },
}, { timestamps: { createdAt: true, updatedAt: false } }); // Only createdAt needed

export default mongoose.model<IMatchHistoryDocument>('MatchHistory', MatchHistorySchema);
