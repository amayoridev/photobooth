import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Frame } from '@/models/Frame';
import { getMemoryDB, saveMemoryDB } from '@/lib/memoryDb';
import { getDefaultSlotsForLayout } from '@/lib/canvas';
import fs from 'fs';
import path from 'path';

function sanitizeAndEnsureSlots(frames: any[], memDb: any, isConnected: boolean) {
  const localFramesDir = path.join(process.cwd(), 'public', 'uploads', 'frames');
  let existingFiles: Set<string>;
  try {
    existingFiles = new Set(fs.readdirSync(localFramesDir));
  } catch {
    existingFiles = new Set();
  }

  let memoryDbModified = false;
  const mongoUpdates: Promise<any>[] = [];

  const processed = frames.map((frame) => {
    const f = frame.toObject ? frame.toObject() : { ...frame };

    // 1. Sanitize URLs
    if (f.frameUrl) {
      const filename = path.basename(f.frameUrl);
      if (existingFiles.has(filename) || f.frameUrl.includes('/uploads/frames/')) {
        f.frameUrl = `/api/uploads/frames/${filename}`;
        f.previewUrl = `/api/uploads/frames/${filename}`;
        f.thumbnailUrl = `/api/uploads/frames/${filename}`;
      } else if (f.frameUrl.startsWith('http://') || f.frameUrl.startsWith('https://')) {
        const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(f.frameUrl)}`;
        f.frameUrl = proxiedUrl;
        f.previewUrl = proxiedUrl;
        f.thumbnailUrl = proxiedUrl;
      }
    }

    // 2. Ensure cutout slots are permanently populated in DB
    if (!Array.isArray(f.slots) || f.slots.length === 0) {
      const w = f.resolution?.width || 1200;
      const h = f.resolution?.height || 1800;
      const autoSlots = getDefaultSlotsForLayout(f.layoutMode || 'single', w, h);

      if (autoSlots && autoSlots.length > 0) {
        f.slots = autoSlots;

        // Sync back to memoryDB
        const memIdx = (memDb.frames || []).findIndex((m: any) => String(m._id) === String(f._id) || m.name === f.name);
        if (memIdx !== -1) {
          memDb.frames[memIdx].slots = autoSlots;
          memoryDbModified = true;
        }

        // Sync back to MongoDB
        if (isConnected && f._id) {
          mongoUpdates.push(
            Frame.updateOne({ _id: f._id }, { $set: { slots: autoSlots } }).catch(() => null)
          );
        }
      }
    }

    return f;
  });

  if (memoryDbModified) {
    try { saveMemoryDB(memDb); } catch {}
  }

  if (mongoUpdates.length > 0) {
    Promise.all(mongoUpdates).catch(() => {});
  }

  return processed;
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

    const finalizedFrames = sanitizeAndEnsureSlots(combinedFrames, memDb, isConnected);

    return NextResponse.json({ success: true, frames: finalizedFrames });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch frames.' },
      { status: 500 }
    );
  }
}
