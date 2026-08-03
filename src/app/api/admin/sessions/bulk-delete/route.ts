import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { authenticateAdminRequest, unauthorizedResponse } from '@/lib/auth';
import { Session } from '@/models/Session';
import { Photo } from '@/models/Photo';
import { deleteFromR2 } from '@/lib/r2';

export async function POST(req: NextRequest) {
  try {
    const payload = await authenticateAdminRequest(req);
    if (!payload) return unauthorizedResponse();

    const { sessionIds } = await req.json();

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Array of sessionIds is required.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const sessions = await Session.find({ _id: { $in: sessionIds } });

    for (const session of sessions) {
      if (session.r2Key) {
        await deleteFromR2(session.r2Key);
      }
    }

    const photos = await Photo.find({ sessionId: { $in: sessionIds } });
    for (const photo of photos) {
      if (photo.r2Key) {
        await deleteFromR2(photo.r2Key);
      }
    }

    await Photo.deleteMany({ sessionId: { $in: sessionIds } });
    await Session.deleteMany({ _id: { $in: sessionIds } });

    return NextResponse.json({
      success: true,
      message: `${sessionIds.length} sessions deleted successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to bulk delete sessions.' },
      { status: 500 }
    );
  }
}
