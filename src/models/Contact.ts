import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  relationship: string;
  phoneNumber: string;
  createdAt: Date;
}

const ContactSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  relationship: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Enforce unique phone numbers per patient to prevent duplicate contacts
ContactSchema.index({ userId: 1, phoneNumber: 1 }, { unique: true });

export default mongoose.model<IContact>("Contact", ContactSchema);
