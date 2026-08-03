import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { authenticateAdminRequest, unauthorizedResponse } from '@/lib/auth';
import { Admin } from '@/models/Admin';
import { getMemoryDB } from '@/lib/memoryDb';

export async function GET(req: NextRequest) {
  try {
    const payload = await authenticateAdminRequest(req);
    if (!payload) return unauthorizedResponse();

    const { isConnected } = await connectToDatabase();

    if (isConnected) {
      const admin = await Admin.findById(payload.adminId).select('-passwordHash');
      if (admin) {
        return NextResponse.json({
          success: true,
          admin: {
            id: admin._id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            lastLogin: admin.lastLogin,
          },
        });
      }
    }

    // Standalone MemoryDB Fallback
    const memDb = getMemoryDB();
    const admin = memDb.admins.find((a) => a.email === payload.email || a._id === payload.adminId);

    if (!admin) {
      return unauthorizedResponse();
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
