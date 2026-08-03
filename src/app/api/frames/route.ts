import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Frame } from '@/models/Frame';
import { getMemoryDB } from '@/lib/memoryDb';
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

export async function GET() {
  try {
    const { isConnected } = await connectToDatabase();
    const memDb = getMemoryDB();
    const memFrames = (memDb.frames || []).filter((f) => f.enabled !== false);

    let combinedFrames: any[] = [];

    if (isConnected) {
      const dbFrames = await Frame.find({ enabled: true }).sort({ isPinned: -1, displayOrder: 1, createdAt: -1 });
      const dbNames = new Set(dbFrames.map((f) => f.name));
      const extraMemFrames = memFrames.filter((f) => !dbNames.has(f.name));
      combinedFrames = [...dbFrames, ...extraMemFrames];
    } else {
      combinedFrames = memFrames;
    }

    // Sort by isPinned first, then displayOrder
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
