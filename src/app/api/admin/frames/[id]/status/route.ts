import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { authenticateAdminRequest, unauthorizedResponse } from '@/lib/auth';
import { Frame } from '@/models/Frame';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateAdminRequest(req);
    if (!payload) return unauthorizedResponse();

    const { id } = await params;
    const { enabled } = await req.json();

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Field "enabled" boolean is required.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const frame = await Frame.findByIdAndUpdate(id, { enabled }, { new: true });

    if (!frame) {
      return NextResponse.json({ success: false, error: 'Frame not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, frame });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update frame status.' },
      { status: 500 }
    );
  }
}
