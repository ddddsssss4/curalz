import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
    userId: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    datetime: Date;
    importance: 'low' | 'medium' | 'high';
    reminderOffsets: number[]; // Array of minutes before event
    createdBy: mongoose.Types.ObjectId;
    reminderStatus: 'pending' | 'sent' | 'failed';
}

const EventSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    datetime: { type: Date, required: true },
    importance: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    reminderOffsets: [{ type: Number }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reminderStatus: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
}, {
    timestamps: true,
});

export default mongoose.model<IEvent>('Event', EventSchema);
