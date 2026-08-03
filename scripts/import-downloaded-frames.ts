import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/photobooth';
const DB_FILE = path.join(process.cwd(), 'data', 'local_db.json');

const FrameSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'General' },
  resolution: { width: Number, height: Number },
  aspectRatio: { type: String, default: '4:6' },
  layoutMode: { type: String, default: 'single' },
  slots: [Object],
  thumbnailUrl: { type: String, required: true },
  previewUrl: { type: String, required: true },
  frameUrl: { type: String, required: true },
  r2Key: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

const Frame = mongoose.models.Frame || mongoose.model('Frame', FrameSchema);

function getPngDimensions(filePath: string): { width: number; height: number } {
  try {
    const buf = fs.readFileSync(filePath);
    if (buf.length >= 24) {
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      return { width, height };
    }
  } catch (e) {
    // fallback
  }
  return { width: 1200, height: 1800 };
}

async function importDownloadedFrames() {
  const downloadDir = path.join(process.cwd(), 'downloads', 'freehihi-frames');
  if (!fs.existsSync(downloadDir)) {
    console.error(`❌ Download directory not found at: ${downloadDir}`);
    return;
  }

  const publicUploadDir = path.join(process.cwd(), 'public', 'uploads', 'frames');
  if (!fs.existsSync(publicUploadDir)) {
    fs.mkdirSync(publicUploadDir, { recursive: true });
  }

  const files = fs.readdirSync(downloadDir).filter((f) => f.endsWith('.png'));
  console.log(`📦 Found ${files.length} downloaded frames to process.`);

  let isMongo = false;
  try {
    const opts = { serverSelectionTimeoutMS: 2000 };
    await mongoose.connect(MONGODB_URI, opts);
    isMongo = true;
    console.log('✅ Connected to MongoDB Atlas.');
  } catch {
    console.log('ℹ️ MongoDB not available. Importing into Standalone local_db.json fallback...');
  }

  let localDb: any = { admins: [], frames: [], sessions: [], settings: {} };
  if (fs.existsSync(DB_FILE)) {
    try {
      localDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch {}
  }
  if (!Array.isArray(localDb.frames)) localDb.frames = [];

  let importedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const srcPath = path.join(downloadDir, fileName);
    const destPath = path.join(publicUploadDir, fileName);

    fs.copyFileSync(srcPath, destPath);

    const parts = fileName.replace('.png', '').split('_');
    const freehihiId = parts[0] || '';
    const frameName = parts[1] || `Frame ${freehihiId}`;

    const { width, height } = getPngDimensions(srcPath);

    let layoutMode = 'single';
    let aspectRatio = '4:6';

    if (height > width * 2.8) {
      layoutMode = 'vertical_strip';
      aspectRatio = '2:6';
    } else if (height > width * 2.2) {
      layoutMode = 'three_photo';
      aspectRatio = '2:6';
    } else if (height > width * 1.6) {
      layoutMode = 'two_photo';
      aspectRatio = '4:6';
    } else if (width === height) {
      layoutMode = 'single';
      aspectRatio = '1:1';
    } else if (height > width * 1.3) {
      layoutMode = 'four_grid';
      aspectRatio = '4:6';
    } else {
      layoutMode = 'single';
      aspectRatio = '4:6';
    }

    const publicUrl = `/uploads/frames/${fileName}`;
    const r2Key = `frames/${fileName}`;

    const frameObj = {
      _id: `frame_imported_${i + 1}`,
      name: frameName,
      description: `Imported frame (${aspectRatio})`,
      category: 'Imported',
      resolution: { width, height },
      aspectRatio,
      layoutMode,
      slots: [],
      thumbnailUrl: publicUrl,
      previewUrl: publicUrl,
      frameUrl: publicUrl,
      r2Key,
      enabled: true,
      displayOrder: i + 1,
    };

    if (isMongo) {
      const existing = await Frame.findOne({ name: frameName });
      if (!existing) {
        await Frame.create(frameObj);
      } else {
        await Frame.updateOne({ name: frameName }, frameObj);
      }
    }

    const existingIdx = localDb.frames.findIndex((f: any) => f.name === frameName);
    if (existingIdx === -1) {
      localDb.frames.push(frameObj);
    } else {
      localDb.frames[existingIdx] = frameObj;
    }
    importedCount++;
  }

  const dataDir = path.dirname(DB_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(localDb, null, 2), 'utf-8');

  console.log(`\n🎉 Successfully processed ${files.length} frames (${importedCount} synced)!`);
  if (isMongo) await mongoose.disconnect();
}

importDownloadedFrames().catch((err) => {
  console.error('❌ Import error:', err);
  process.exit(1);
});
