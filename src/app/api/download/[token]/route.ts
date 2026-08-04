import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Session } from '@/models/Session';
import { getMemoryDB, saveMemoryDB } from '@/lib/memoryDb';
import path from 'path';
import fs from 'fs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { isConnected } = await connectToDatabase();

    let imageUrl = '';
    let qrToken = 'photo';

    if (isConnected) {
      const session = await Session.findOne({ downloadToken: token });
      if (session) {
        session.downloadCount += 1;
        await session.save();
        imageUrl = session.finalImageUrl;
        qrToken = session.qrToken;
      }
    }

    if (!imageUrl) {
      const memDb = getMemoryDB();
      const session = memDb.sessions.find((s) => s.downloadToken === token);
      if (session) {
        session.downloadCount = (session.downloadCount || 0) + 1;
        saveMemoryDB(memDb);
        imageUrl = session.finalImageUrl;
        qrToken = session.qrToken;
      }
    }

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'Photo not found.' }, { status: 404 });
    }

    // Serve local attachment file directly with Content-Disposition
    if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('/api/uploads/')) {
      const cleanPath = imageUrl.replace(/^\/(api\/)?uploads\//, '');
      const filePath = path.join(process.cwd(), 'public', 'uploads', cleanPath);
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Content-Disposition': `attachment; filename="photobooth_${qrToken}.jpg"`,
          },
        });
      }
    }

    return NextResponse.redirect(imageUrl);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to download photo.' },
      { status: 500 }
    );
  }
}
