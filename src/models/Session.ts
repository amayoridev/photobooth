import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISessionDocument extends Document {
  frameId: any;
  layout: string;
  photoUrls: string[];
  finalImageUrl: string;
  r2Key: string;
  qrToken: string;
  downloadToken: string;
  downloadCount: number;
  scanCount: number;
  expiresAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISessionDocument>(
  {
    frameId: { type: Schema.Types.Mixed, required: true },
    layout: { type: String, required: true },
    photoUrls: [{ type: String }],
    finalImageUrl: { type: String, required: true },
    r2Key: { type: String, required: true },
    qrToken: { type: String, required: true, unique: true, index: true },
    downloadToken: { type: String, required: true, unique: true, index: true },
    downloadCount: { type: Number, default: 0 },
    scanCount: { type: Number, default: 0 },
    expiresAt: { type: Date, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

export const Session: Model<ISessionDocument> = 
  mongoose.models.Session || mongoose.model<ISessionDocument>('Session', SessionSchema);
