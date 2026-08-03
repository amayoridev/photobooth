import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { authenticateAdminRequest, unauthorizedResponse } from '@/lib/auth';
import { Session } from '@/models/Session';

export async function GET(req: NextRequest) {
  try {
    const payload = await authenticateAdminRequest(req);
    if (!payload) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const frameId = searchParams.get('frameId') || '';
    const layout = searchParams.get('layout') || '';

    await connectToDatabase();

    const query: any = {};

    if (search) {
      query.$or = [
        { qrToken: { $regex: search, $options: 'i' } },
        { downloadToken: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } },
      ];
    }

    if (frameId) query.frameId = frameId;
    if (layout) query.layout = layout;

    const total = await Session.countDocuments(query);
    const sessions = await Session.find(query)
      .populate('frameId', 'name frameUrl category')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      success: true,
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch sessions.' },
      { status: 500 }
    );
  }
}
