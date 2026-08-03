import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILayoutSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface IFrameDocument extends Document {
  _id: any;
  name: string;
  description: string;
  category: string;
  resolution: {
    width: number;
    height: number;
  };
  aspectRatio: string;
  layoutMode: 'single' | 'two_photo' | 'three_photo' | 'four_grid' | 'film_strip' | 'polaroid' | 'vertical_strip' | 'horizontal_strip';
  slots: ILayoutSlot[];
  thumbnailUrl: string;
  previewUrl: string;
  frameUrl: string;
  r2Key: string;
  enabled: boolean;
  isPinned: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const FrameSchema = new Schema<IFrameDocument>(
  {
    _id: { type: Schema.Types.Mixed },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'General' },
    resolution: {
      width: { type: Number, default: 1200 },
      height: { type: Number, default: 1800 },
    },
    aspectRatio: { type: String, default: '4:6' },
    layoutMode: { 
      type: String, 
      enum: ['single', 'two_photo', 'three_photo', 'four_grid', 'film_strip', 'polaroid', 'vertical_strip', 'horizontal_strip'],
      default: 'single' 
    },
    slots: [
      {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true },
        rotation: { type: Number, default: 0 },
      },
    ],
    thumbnailUrl: { type: String, required: true },
    previewUrl: { type: String, required: true },
    frameUrl: { type: String, required: true },
    r2Key: { type: String, required: true },
    enabled: { type: Boolean, default: true, index: true },
    isPinned: { type: Boolean, default: false, index: true },
    displayOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

if (mongoose.models.Frame) {
  delete (mongoose.models as any).Frame;
}

export const Frame: Model<IFrameDocument> = mongoose.model<IFrameDocument>('Frame', FrameSchema);
