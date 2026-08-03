import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    let relativePath = pathSegments.join('/');

    try {
      relativePath = decodeURIComponent(relativePath);
    } catch {}

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    let filePath = path.join(uploadsDir, relativePath);

    // If exact path not found, search target folder case-insensitively or by decoded filename
    if (!fs.existsSync(filePath)) {
      const filename = path.basename(relativePath);
      const subfolder = path.dirname(relativePath);
      const targetDir = path.join(uploadsDir, subfolder);

      if (fs.existsSync(targetDir)) {
        const files = fs.readdirSync(targetDir);
        const matched = files.find(
          (f) =>
            f.toLowerCase() === filename.toLowerCase() ||
            decodeURIComponent(f).toLowerCase() === filename.toLowerCase()
        );
        if (matched) {
          filePath = path.join(targetDir, matched);
        }
      }
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    let contentType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    if (ext === '.webp') contentType = 'image/webp';
    if (ext === '.svg') contentType = 'image/svg+xml';

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to serve uploaded file.' }, { status: 500 });
  }
}
