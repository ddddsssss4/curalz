import mongoose, { Schema, Document } from 'mongoose';

export interface IThought extends Document {
    userId: mongoose.Types.ObjectId;
    rawText: string;
    entities: {
        people: string[];
        activities: string[];
    };
    qdrantId: string; // Reference to vector in Qdrant
    timestamp: Date;
}

const ThoughtSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rawText: { type: String, required: true },
    entities: {
        people: [{ type: String }],
        activities: [{ type: String }]
    },
    qdrantId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Index for efficient querying
ThoughtSchema.index({ userId: 1, timestamp: -1 });
ThoughtSchema.index({ 'entities.people': 1 });
ThoughtSchema.index({ 'entities.activities': 1 });

export default mongoose.model<IThought>('Thought', ThoughtSchema);
