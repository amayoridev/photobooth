import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let imageUrl = searchParams.get('url') || '';

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing image url parameter.' }, { status: 400 });
    }

    // Decode iteratively if double-encoded
    while (imageUrl.includes('%')) {
      try {
        const decoded = decodeURIComponent(imageUrl);
        if (decoded === imageUrl) break;
        imageUrl = decoded;
      } catch {
        break;
      }
    }

    // Check if image exists locally in public/uploads/frames/ or public/
    const filename = path.basename(imageUrl);
    const localFramePath = path.join(process.cwd(), 'public', 'uploads', 'frames', filename);
    if (fs.existsSync(localFramePath)) {
      const fileBuffer = fs.readFileSync(localFramePath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Fetch external image on server side
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image.' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Image proxy error.' }, { status: 500 });
  }
}
