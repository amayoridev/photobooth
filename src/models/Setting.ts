import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettingDocument extends Document {
  key: string;
  value: any;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISettingDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const Setting: Model<ISettingDocument> = 
  mongoose.models.Setting || mongoose.model<ISettingDocument>('Setting', SettingSchema);
