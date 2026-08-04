import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Session } from '@/models/Session';
import { Photo } from '@/models/Photo';
import { Frame } from '@/models/Frame';
import { uploadToR2 } from '@/lib/r2';
import { generateToken } from '@/lib/utils';
import { getMemoryDB, saveMemoryDB } from '@/lib/memoryDb';

export async function POST(req: NextRequest) {
  try {
    const { isConnected } = await connectToDatabase();

    const { frameId, layout, photos, finalImage, btsVideo } = await req.json();

    if (!frameId || !finalImage) {
      return NextResponse.json(
        { success: false, error: 'frameId và dữ liệu finalImage là bắt buộc.' },
        { status: 400 }
      );
    }

    const qrToken = generateToken(12);
    const downloadToken = generateToken(16);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Upload final composed image to Cloudflare R2 / Local Storage
    const finalImageKey = `previews/session_${Date.now()}_${qrToken}.jpg`;
    const { url: finalImageUrl, key: r2Key } = await uploadToR2(
      finalImage,
      finalImageKey,
      'image/jpeg'
    );

    // Upload BTS Video if recorded
    let btsVideoUrl: string | undefined = undefined;
    let btsVideoR2Key: string | undefined = undefined;

    if (btsVideo && typeof btsVideo === 'string' && btsVideo.length > 50) {
      try {
        const videoKey = `sessions/bts_${Date.now()}_${qrToken}.webm`;
        const { url: vUrl, key: vKey } = await uploadToR2(
          btsVideo,
          videoKey,
          'video/webm'
        );
        btsVideoUrl = vUrl;
        btsVideoR2Key = vKey;
      } catch (err) {
        console.warn('⚠️ BTS Video upload warning:', err);
      }
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    if (isConnected) {
      let frame = null;
      if (mongoose.Types.ObjectId.isValid(frameId)) {
        frame = await Frame.findById(frameId).catch(() => null);
      }

      const session = await Session.create({
        frameId: frame ? frame._id : frameId,
        layout: layout || 'vertical_strip',
        photoUrls: [],
        finalImageUrl,
        r2Key,
        btsVideoUrl,
        btsVideoR2Key,
        qrToken,
        downloadToken,
        expiresAt,
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        success: true,
        sessionId: session._id,
        qrToken: session.qrToken,
        downloadToken: session.downloadToken,
        finalImageUrl: session.finalImageUrl,
        btsVideoUrl: session.btsVideoUrl,
        expiresAt: session.expiresAt,
      });
    }

    // Standalone MemoryDB Fallback
    const memDb = getMemoryDB();
    const sessionId = `session_${Date.now()}`;

    const sessionObj: any = {
      _id: sessionId,
      frameId,
      layout: layout || 'vertical_strip',
      photoUrls: [],
      finalImageUrl,
      r2Key,
      btsVideoUrl,
      btsVideoR2Key,
      qrToken,
      downloadToken,
      downloadCount: 0,
      scanCount: 0,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      ipAddress,
      userAgent,
    };

    memDb.sessions.push(sessionObj);
    saveMemoryDB(memDb);

    return NextResponse.json({
      success: true,
      sessionId,
      qrToken,
      downloadToken,
      finalImageUrl,
      btsVideoUrl: sessionObj.btsVideoUrl,
      expiresAt: sessionObj.expiresAt,
    });
  } catch (error: any) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi lưu phiên chụp ảnh.' },
      { status: 500 }
    );
  }
}
