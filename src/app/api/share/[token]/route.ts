import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Session } from '@/models/Session';
import { getMemoryDB, saveMemoryDB } from '@/lib/memoryDb';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { isConnected } = await connectToDatabase();

    if (isConnected) {
      const session = await Session.findOne({ qrToken: token }).populate('frameId', 'name category');

      if (session) {
        if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
          return NextResponse.json({ success: false, error: 'Liên kết tải ảnh này đã hết hạn.' }, { status: 410 });
        }

        session.scanCount += 1;
        await session.save();

        return NextResponse.json({
          success: true,
          session: {
            id: session._id,
            frameName: (session.frameId as any)?.name || 'Custom Frame',
            finalImageUrl: session.finalImageUrl,
            btsVideoUrl: session.btsVideoUrl,
            downloadToken: session.downloadToken,
            downloadCount: session.downloadCount,
            scanCount: session.scanCount,
            expiresAt: session.expiresAt,
            createdAt: session.createdAt,
          },
          branding: { appName: 'Antigravity PhotoBooth' },
        });
      }
    }

    // Standalone MemoryDB Fallback
    const memDb = getMemoryDB();
    const session = memDb.sessions.find((s) => s.qrToken === token);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy phiên chụp ảnh.' }, { status: 404 });
    }

    session.scanCount = (session.scanCount || 0) + 1;
    saveMemoryDB(memDb);

    return NextResponse.json({
      success: true,
      session: {
        id: session._id,
        frameName: 'Custom Frame',
        finalImageUrl: session.finalImageUrl,
        btsVideoUrl: session.btsVideoUrl,
        downloadToken: session.downloadToken,
        downloadCount: session.downloadCount,
        scanCount: session.scanCount,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
      branding: { appName: 'Antigravity PhotoBooth' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch share details.' },
      { status: 500 }
    );
  }
}
