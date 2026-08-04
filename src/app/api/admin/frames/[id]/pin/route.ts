import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { authenticateAdminRequest, unauthorizedResponse } from '@/lib/auth';
import { Frame } from '@/models/Frame';
import { getMemoryDB, saveMemoryDB } from '@/lib/memoryDb';
import { findMemoryFrameIndex, findFrameInMongo } from '@/lib/frameLookup';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateAdminRequest(req);
    if (!payload) return unauthorizedResponse();

    const { id } = await params;
    const body = await req.json();
    const isPinned = body.isPinned === true;

    const { isConnected } = await connectToDatabase();

    // MemoryDB Sync
    const memDb = getMemoryDB();
    const frameIdx = findMemoryFrameIndex(memDb.frames, id);

    if (frameIdx !== -1) {
      memDb.frames[frameIdx].isPinned = isPinned;
      saveMemoryDB(memDb);
    }

    if (isConnected) {
      const frame = await findFrameInMongo(Frame, id);
      if (frame) {
        frame.isPinned = isPinned;
        await frame.save();
        return NextResponse.json({ success: true, isPinned: frame.isPinned });
      }
    }

    if (frameIdx !== -1) {
      return NextResponse.json({ success: true, isPinned });
    }

    return NextResponse.json({ success: false, error: 'Frame not found.' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to toggle pin status.' },
      { status: 500 }
    );
  }
}
