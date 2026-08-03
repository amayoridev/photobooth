import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { authenticateAdminRequest, unauthorizedResponse } from '@/lib/auth';
import { Frame } from '@/models/Frame';

export async function POST(req: NextRequest) {
  try {
    const payload = await authenticateAdminRequest(req);
    if (!payload) return unauthorizedResponse();

    const { frameOrders } = await req.json(); // Array of { id: string, displayOrder: number }

    if (!Array.isArray(frameOrders)) {
      return NextResponse.json(
        { success: false, error: 'frameOrders array is required.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const bulkOps = frameOrders.map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { displayOrder: item.displayOrder } },
      },
    }));

    await Frame.bulkWrite(bulkOps);

    return NextResponse.json({ success: true, message: 'Frame order updated successfully.' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reorder frames.' },
      { status: 500 }
    );
  }
}
