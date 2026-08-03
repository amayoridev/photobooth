import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { authenticateAdminRequest, unauthorizedResponse } from '@/lib/auth';
import { Frame } from '@/models/Frame';
import { generateToken } from '@/lib/utils';
import { AuditLog } from '@/models/AuditLog';
import { getMemoryDB, saveMemoryDB } from '@/lib/memoryDb';
import fs from 'fs';
import path from 'path';

function sanitizeFrameUrls(frames: any[]) {
  const localFramesDir = path.join(process.cwd(), 'public', 'uploads', 'frames');
  let existingFiles: Set<string>;
  try {
    existingFiles = new Set(fs.readdirSync(localFramesDir));
  } catch {
    existingFiles = new Set();
  }

  return frames.map((frame) => {
    const f = frame.toObject ? frame.toObject() : { ...frame };
    if (f.frameUrl) {
      const filename = path.basename(f.frameUrl);
      if (existingFiles.has(filename) || f.frameUrl.includes('/uploads/frames/')) {
        f.frameUrl = `/api/uploads/frames/${filename}`;
        f.previewUrl = `/api/uploads/frames/${filename}`;
        f.thumbnailUrl = `/api/uploads/frames/${filename}`;
      }
    }
    return f;
  });
}

export async function GET(req: NextRequest) {
  try {
    const payload = await authenticateAdminRequest(req);
    if (!payload) return unauthorizedResponse();

    const { isConnected } = await connectToDatabase();
    const memDb = getMemoryDB();
    const memFrames = memDb.frames || [];

    let combinedFrames: any[] = [];

    if (isConnected) {
      const dbFrames = await Frame.find().sort({ isPinned: -1, displayOrder: 1, createdAt: -1 });
      const dbNames = new Set(dbFrames.map((f) => f.name));
      const extraMemFrames = memFrames.filter((f) => !dbNames.has(f.name));
      combinedFrames = [...dbFrames, ...extraMemFrames];
    } else {
      combinedFrames = memFrames;
    }

    combinedFrames.sort((a, b) => {
      const pinA = a.isPinned ? 1 : 0;
      const pinB = b.isPinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });

    return NextResponse.json({ success: true, frames: sanitizeFrameUrls(combinedFrames) });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch frames.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await authenticateAdminRequest(req);
    if (!payload) return unauthorizedResponse();

    const { isConnected } = await connectToDatabase();
    const formData = await req.formData();

    const name = formData.get('name') as string;
    const description = (formData.get('description') as string) || '';
    const category = (formData.get('category') as string) || 'General';
    const aspectRatio = (formData.get('aspectRatio') as string) || '4:6';
    const layoutMode = (formData.get('layoutMode') as string) || 'single';
    const width = parseInt((formData.get('width') as string) || '1200', 10);
    const height = parseInt((formData.get('height') as string) || '1800', 10);
    const enabled = formData.get('enabled') === 'true';
    const isPinned = formData.get('isPinned') === 'true';
    const slotsJson = formData.get('slots') as string;
    const file = formData.get('frameFile') as File | null;

    if (!name || !file) {
      return NextResponse.json(
        { success: false, error: 'Name and frame PNG image file are required.' },
        { status: 400 }
      );
    }

    const slots = slotsJson ? JSON.parse(slotsJson) : [];

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileExt = file.name.split('.').pop() || 'png';
    const filename = `${Date.now()}_${generateToken(8)}.${fileExt}`;

    const localUploadDir = path.join(process.cwd(), 'public', 'uploads', 'frames');
    if (!fs.existsSync(localUploadDir)) {
      fs.mkdirSync(localUploadDir, { recursive: true });
    }

    const localFilePath = path.join(localUploadDir, filename);
    fs.writeFileSync(localFilePath, fileBuffer);

    const frameUrl = `/api/uploads/frames/${filename}`;
    const r2Key = `frames/${filename}`;

    const newFrameObj = {
      _id: `frame_${Date.now()}`,
      name,
      description,
      category,
      aspectRatio,
      layoutMode,
      resolution: { width, height },
      slots,
      thumbnailUrl: frameUrl,
      previewUrl: frameUrl,
      frameUrl,
      r2Key,
      enabled,
      isPinned,
      displayOrder: 1,
    };

    const memDb = getMemoryDB();
    memDb.frames.unshift(newFrameObj);
    saveMemoryDB(memDb);

    if (isConnected) {
      try {
        const count = await Frame.countDocuments();
        const mongoFrame = await Frame.create({
          ...newFrameObj,
          displayOrder: count + 1,
        });

        try {
          await AuditLog.create({
            adminId: payload.adminId,
            action: 'CREATE_FRAME',
            details: { frameId: mongoFrame._id, name: mongoFrame.name },
          });
        } catch {}

        return NextResponse.json({ success: true, frame: mongoFrame }, { status: 201 });
      } catch (err) {
        console.warn('Mongo frame insert failed, falling back to local DB:', err);
      }
    }

    return NextResponse.json({ success: true, frame: newFrameObj }, { status: 201 });
  } catch (error: any) {
    console.error('Frame creation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create frame.' },
      { status: 500 }
    );
  }
}
