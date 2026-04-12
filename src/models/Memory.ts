import mongoose, { Schema, Document } from "mongoose";

export interface IMemory extends Document {
  userId: mongoose.Types.ObjectId;
  qdrantId: string;
  type: "photo" | "story" | "place" | "chat";
  title?: string;
  year?: number;
  createdBy: "caregiver" | "patient";
  tags?: string[];
  data?: {
    // PHOTO
    imageUrl?: string;
    caption?: string;
    // STORY
    description?: string;
    mood?: "Home" | "Love" | "Work" | "Travel" | "Celebrate" | "Nature" | "Learn" | "Achieve";
    // PLACE
    placeName?: string;
    address?: string;
    photoUrl?: string;
    location?: {
      lat: number;
      lng: number;
    };
    // Shared category
    category?: string; 
    
    // CHAT (legacy & specific)
    rawText?: string;
    entities?: {
      people: string[];
      activities: string[];
    };
  };
  isDeleted: boolean;
  timestamp: Date;
}

const MemorySchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    qdrantId: { type: String, required: true },
    type: { 
      type: String, 
      enum: ["photo", "story", "place", "chat"], 
      required: true 
    },
    title: { type: String },
    year: { type: Number },
    createdBy: { type: String, enum: ["caregiver", "patient"] },
    tags: [{ type: String }],
    data: {
      imageUrl: { type: String },
      caption: { type: String },
      description: { type: String },
      mood: { 
        type: String, 
        enum: ["Home", "Love", "Work", "Travel", "Celebrate", "Nature", "Learn", "Achieve"] 
      },
      placeName: { type: String },
      address: { type: String },
      photoUrl: { type: String },
      location: {
        lat: { type: Number },
        lng: { type: Number }
      },
      category: { type: String }, // "Family" | "Travel" | "Achievement" | "Festival" | "Childhood" and others
      rawText: { type: String },
      entities: {
        people: [{ type: String }],
        activities: [{ type: String }],
      }
    },
    isDeleted: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
MemorySchema.index({ userId: 1, type: 1, timestamp: -1 });
MemorySchema.index({ "data.entities.people": 1 });
MemorySchema.index({ "data.entities.activities": 1 });
MemorySchema.index({ title: "text" }); // Optional text indexing for non-vector quick searches

export default mongoose.model<IMemory>("Memory", MemorySchema);
