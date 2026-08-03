import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { connectToDatabase } from '@/lib/db';
import { Session } from '@/models/Session';
import { getMemoryDB } from '@/lib/memoryDb';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'png';
    const isDirect = searchParams.get('direct') === 'true';

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
    
    let targetUrl = `${protocol}://${host}/share/${token}`;

    if (isDirect) {
      // Find session to get direct R2 / image URL
      const { isConnected } = await connectToDatabase();
      let sessionObj: any = null;

      if (isConnected) {
        sessionObj = await Session.findOne({
          $or: [{ qrToken: token }, { downloadToken: token }],
        });
      }

      if (!sessionObj) {
        const memDb = getMemoryDB();
        sessionObj = memDb.sessions.find(
          (s) => s.qrToken === token || s.downloadToken === token
        );
      }

      if (sessionObj && sessionObj.finalImageUrl) {
        if (sessionObj.finalImageUrl.startsWith('http://') || sessionObj.finalImageUrl.startsWith('https://')) {
          targetUrl = sessionObj.finalImageUrl; // Direct R2 Cloudflare URL
        } else {
          targetUrl = `${protocol}://${host}${sessionObj.finalImageUrl}`;
        }
      }
    }

    if (format === 'svg') {
      const svgString = await QRCode.toString(targetUrl, {
        type: 'svg',
        margin: 2,
        color: {
          dark: '#1e1b4b',
          light: '#ffffff',
        },
      });

      return new NextResponse(svgString, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Default PNG buffer
    const pngBuffer = await QRCode.toBuffer(targetUrl, {
      type: 'png',
      width: 512,
      margin: 2,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
    });

    return new NextResponse(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate QR code.' },
      { status: 500 }
    );
  }
}
