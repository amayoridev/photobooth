import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { authenticateAdminRequest, unauthorizedResponse } from '@/lib/auth';
import { Frame } from '@/models/Frame';
import { generateToken } from '@/lib/utils';
import { AuditLog } from '@/models/AuditLog';
import { getMemoryDB, saveMemoryDB } from '@/lib/memoryDb';
import fs from 'fs';
import path from 'path';

async function findFrameById(id: string) {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const byId = await Frame.findById(id);
    if (byId) return byId;
  }
  return await Frame.findOne({ _id: id });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateAdminRequest(req);
    if (!payload) return unauthorizedResponse();

    const { id } = await params;
    const { isConnected } = await connectToDatabase();

    const formData = await req.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const aspectRatio = formData.get('aspectRatio') as string;
    const layoutMode = formData.get('layoutMode') as string;
    const width = formData.get('width') ? parseInt(formData.get('width') as string, 10) : undefined;
    const height = formData.get('height') ? parseInt(formData.get('height') as string, 10) : undefined;
    const enabledStr = formData.get('enabled');
    const slotsJson = formData.get('slots') as string;
    const file = formData.get('frameFile') as File | null;

    let frameUrl: string | null = null;
    let r2Key: string | null = null;

    if (file) {
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const fileExt = file.name.split('.').pop() || 'png';
      const filename = `${Date.now()}_${generateToken(8)}.${fileExt}`;

      const localUploadDir = path.join(process.cwd(), 'public', 'uploads', 'frames');
      if (!fs.existsSync(localUploadDir)) {
        fs.mkdirSync(localUploadDir, { recursive: true });
      }

      const localFilePath = path.join(localUploadDir, filename);
      fs.writeFileSync(localFilePath, fileBuffer);

      frameUrl = `/uploads/frames/${filename}`;
      r2Key = `frames/${filename}`;
    }

    // Always update local_db.json first
    const memDb = getMemoryDB();
    const frameIdx = memDb.frames.findIndex((f) => f._id === id || f.name === name);
    if (frameIdx !== -1) {
      const memFrame = memDb.frames[frameIdx];
      if (name) memFrame.name = name;
      if (description !== null) memFrame.description = description;
      if (category) memFrame.category = category;
      if (aspectRatio) memFrame.aspectRatio = aspectRatio;
      if (layoutMode) memFrame.layoutMode = layoutMode;
      if (width) memFrame.resolution.width = width;
      if (height) memFrame.resolution.height = height;
      if (enabledStr !== null) memFrame.enabled = enabledStr === 'true';
      if (slotsJson) memFrame.slots = JSON.parse(slotsJson);

      if (frameUrl) {
        memFrame.frameUrl = frameUrl;
        memFrame.previewUrl = frameUrl;
        memFrame.thumbnailUrl = frameUrl;
        memFrame.r2Key = r2Key!;
      }
      saveMemoryDB(memDb);
    }

    if (isConnected) {
      const frame = await findFrameById(id);
      if (frame) {
        if (name) frame.name = name;
        if (description !== null) frame.description = description;
        if (category) frame.category = category;
        if (aspectRatio) frame.aspectRatio = aspectRatio;
        if (layoutMode) frame.layoutMode = layoutMode as any;
        if (width) frame.resolution.width = width;
        if (height) frame.resolution.height = height;
        if (enabledStr !== null) frame.enabled = enabledStr === 'true';
        if (slotsJson) frame.slots = JSON.parse(slotsJson);

        if (frameUrl) {
          frame.frameUrl = frameUrl;
          frame.previewUrl = frameUrl;
          frame.thumbnailUrl = frameUrl;
          frame.r2Key = r2Key!;
        }

        await frame.save();

        try {
          await AuditLog.create({
            adminId: payload.adminId,
            action: 'UPDATE_FRAME',
            details: { frameId: frame._id, name: frame.name },
          });
        } catch {}

        return NextResponse.json({ success: true, frame });
      }
    }

    if (frameIdx !== -1) {
      return NextResponse.json({ success: true, frame: memDb.frames[frameIdx] });
    }

    return NextResponse.json({ success: false, error: 'Frame not found.' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update frame.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateAdminRequest(req);
    if (!payload) return unauthorizedResponse();

    const { id } = await params;
    const { isConnected } = await connectToDatabase();

    // MemoryDB Sync
    const memDb = getMemoryDB();
    const frameIdx = memDb.frames.findIndex((f) => f._id === id);
    if (frameIdx !== -1) {
      const frame = memDb.frames[frameIdx];
      if (frame.frameUrl && frame.frameUrl.startsWith('/uploads/')) {
        const localFilePath = path.join(process.cwd(), 'public', frame.frameUrl);
        if (fs.existsSync(localFilePath)) {
          try { fs.unlinkSync(localFilePath); } catch {}
        }
      }
      memDb.frames.splice(frameIdx, 1);
      saveMemoryDB(memDb);
    }

    if (isConnected) {
      const frame = await findFrameById(id);
      if (frame) {
        if (frame.frameUrl && frame.frameUrl.startsWith('/uploads/')) {
          const localFilePath = path.join(process.cwd(), 'public', frame.frameUrl);
          if (fs.existsSync(localFilePath)) {
            try { fs.unlinkSync(localFilePath); } catch {}
          }
        }
        await Frame.deleteOne({ _id: frame._id });

        try {
          await AuditLog.create({
            adminId: payload.adminId,
            action: 'DELETE_FRAME',
            details: { frameId: id, name: frame.name },
          });
        } catch {}
      }
    }

    return NextResponse.json({ success: true, message: 'Frame deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete frame.' },
      { status: 500 }
    );
  }
}
