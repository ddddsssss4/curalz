import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: 'patient' | 'caregiver';
    linkedPatientIds: mongoose.Types.ObjectId[];
    comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['patient', 'caregiver'], required: true },
    linkedPatientIds: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
}, {
    timestamps: true,
});

// Hash password before saving
// Hash password before saving
UserSchema.pre('save', async function () {
    const user = this as any;
    if (!user.isModified('password')) return;

    try {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
    } catch (err: any) {
        throw err;
    }
});

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
