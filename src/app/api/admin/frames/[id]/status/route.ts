import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { authenticateAdminRequest, unauthorizedResponse } from '@/lib/auth';
import { Frame } from '@/models/Frame';
import { getMemoryDB, saveMemoryDB } from '@/lib/memoryDb';

async function findFrameById(id: string) {
  if (!id) return null;
  const decoded = decodeURIComponent(id);
  if (mongoose.Types.ObjectId.isValid(decoded)) {
    const byId = await Frame.findById(decoded);
    if (byId) return byId;
  }
  const byIdStr = await Frame.findOne({ _id: decoded });
  if (byIdStr) return byIdStr;
  return await Frame.findOne({ name: decoded });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateAdminRequest(req);
    if (!payload) return unauthorizedResponse();

    const { id } = await params;
    const decodedId = decodeURIComponent(id);
    const { enabled } = await req.json();

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Field "enabled" boolean is required.' },
        { status: 400 }
      );
    }

    const { isConnected } = await connectToDatabase();

    // MemoryDB Sync
    const memDb = getMemoryDB();
    const frameIdx = memDb.frames.findIndex(
      (f) =>
        String(f._id) === String(decodedId) ||
        String(f._id) === String(id) ||
        f.name.toLowerCase() === decodedId.toLowerCase()
    );

    if (frameIdx !== -1) {
      memDb.frames[frameIdx].enabled = enabled;
      saveMemoryDB(memDb);
    }

    if (isConnected) {
      const frame = await findFrameById(decodedId);
      if (frame) {
        frame.enabled = enabled;
        await frame.save();
        return NextResponse.json({ success: true, frame });
      }
    }

    if (frameIdx !== -1) {
      return NextResponse.json({ success: true, frame: memDb.frames[frameIdx] });
    }

    return NextResponse.json({ success: false, error: 'Frame not found.' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update frame status.' },
      { status: 500 }
    );
  }
}
