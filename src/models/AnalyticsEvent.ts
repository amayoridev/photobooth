import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnalyticsEventDocument extends Document {
  type: 'session_created' | 'photo_downloaded' | 'qr_scanned' | 'frame_viewed';
  sessionId?: mongoose.Types.ObjectId;
  frameId?: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  timestamp: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEventDocument>(
  {
    type: { type: String, required: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session' },
    frameId: { type: Schema.Types.ObjectId, ref: 'Frame' },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const AnalyticsEvent: Model<IAnalyticsEventDocument> = 
  mongoose.models.AnalyticsEvent || mongoose.model<IAnalyticsEventDocument>('AnalyticsEvent', AnalyticsEventSchema);
