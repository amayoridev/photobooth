import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { authenticateAdminRequest, unauthorizedResponse } from '@/lib/auth';
import { Session } from '@/models/Session';
import { Photo } from '@/models/Photo';
import { deleteFromR2 } from '@/lib/r2';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateAdminRequest(req);
    if (!payload) return unauthorizedResponse();

    const { id } = await params;
    await connectToDatabase();

    const session = await Session.findById(id).populate('frameId');
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
    }

    const photos = await Photo.find({ sessionId: session._id });

    return NextResponse.json({ success: true, session, photos });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch session detail.' },
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
    await connectToDatabase();

    const session = await Session.findById(id);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
    }

    // Delete final image from R2
    if (session.r2Key) {
      await deleteFromR2(session.r2Key);
    }

    // Delete raw photos from R2 & DB
    const photos = await Photo.find({ sessionId: id });
    for (const photo of photos) {
      if (photo.r2Key) {
        await deleteFromR2(photo.r2Key);
      }
    }
    await Photo.deleteMany({ sessionId: id });

    // Delete session record
    await Session.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Session deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete session.' },
      { status: 500 }
    );
  }
}
