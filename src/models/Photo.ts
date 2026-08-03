import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPhotoDocument extends Document {
  sessionId: mongoose.Types.ObjectId;
  r2Key: string;
  url: string;
  width: number;
  height: number;
  size: number;
  createdAt: Date;
}

const PhotoSchema = new Schema<IPhotoDocument>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    r2Key: { type: String, required: true },
    url: { type: String, required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    size: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Photo: Model<IPhotoDocument> = 
  mongoose.models.Photo || mongoose.model<IPhotoDocument>('Photo', PhotoSchema);
