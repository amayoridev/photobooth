import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdminDocument extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: 'superadmin' | 'admin';
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<IAdminDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, default: 'Admin' },
    role: { type: String, enum: ['superadmin', 'admin'], default: 'admin' },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

export const Admin: Model<IAdminDocument> = 
  mongoose.models.Admin || mongoose.model<IAdminDocument>('Admin', AdminSchema);
