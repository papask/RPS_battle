import mongoose, { Schema, Document } from 'mongoose';

export interface IItem extends Document {
    id: string; // unique string id (e.g. 'item_hint')
    name: string;
    description: string;
    cost: number;
    effectType: 'hint' | 'shield';
    duration?: number; // length in ms or rounds if applicable
}

const ItemSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    cost: { type: Number, required: true },
    effectType: { type: String, required: true, enum: ['hint', 'shield'] },
    duration: { type: Number }
});

export default mongoose.model<IItem>('Item', ItemSchema);
