import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { authenticateAdminRequest, unauthorizedResponse } from '@/lib/auth';
import { Frame } from '@/models/Frame';
import { getMemoryDB, saveMemoryDB } from '@/lib/memoryDb';
import { AuditLog } from '@/models/AuditLog';

interface FrameUpdateItem {
  id: string;
  layoutMode: string;
  slots: any[];
}

export async function POST(req: NextRequest) {
  try {
    const payload = await authenticateAdminRequest(req);
    if (!payload) return unauthorizedResponse();

    const body = await req.json();
    const updates: FrameUpdateItem[] = body.updates || [];

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No frame updates provided.' },
        { status: 400 }
      );
    }

    const { isConnected } = await connectToDatabase();
    const memDb = getMemoryDB();
    let updatedCount = 0;

    // 1. Update MemoryDB (data/local_db.json)
    updates.forEach((item) => {
      const idx = memDb.frames.findIndex((f) => f._id === item.id);
      if (idx !== -1) {
        if (item.layoutMode) memDb.frames[idx].layoutMode = item.layoutMode as any;
        if (Array.isArray(item.slots) && item.slots.length > 0) {
          memDb.frames[idx].slots = item.slots;
        }
        updatedCount++;
      }
    });
    saveMemoryDB(memDb);

    // 2. Update MongoDB if connected
    if (isConnected) {
      for (const item of updates) {
        try {
          const query = mongoose.Types.ObjectId.isValid(item.id)
            ? { $or: [{ _id: item.id }, { name: item.id }] }
            : { _id: item.id };

          const updateFields: any = {};
          if (item.layoutMode) updateFields.layoutMode = item.layoutMode;
          if (Array.isArray(item.slots) && item.slots.length > 0) {
            updateFields.slots = item.slots;
          }

          await Frame.updateOne(query, { $set: updateFields });
        } catch (err) {
          console.warn(`Failed to update mongo frame ${item.id}:`, err);
        }
      }

      try {
        await AuditLog.create({
          adminId: payload.adminId,
          action: 'BATCH_AUTO_DETECT_SLOTS',
          details: { updatedFramesCount: updates.length },
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: `Successfully batch updated photo slots for ${updates.length} frames.`,
      updatedCount: updates.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to batch update frame slots.' },
      { status: 500 }
    );
  }
}
