import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
    userId: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    datetime: Date;
    importance: 'low' | 'medium' | 'high';
    createdBy: mongoose.Types.ObjectId;
}

const EventSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    datetime: { type: Date, required: true },
    importance: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, {
    timestamps: true,
});

export default mongoose.model<IEvent>('Event', EventSchema);
