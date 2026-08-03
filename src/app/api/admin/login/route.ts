import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Admin } from '@/models/Admin';
import { comparePassword, signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, rememberMe } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Username/Email và Mật khẩu không được để trống.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanPassword = String(password).trim();

    // Direct Instant Auth Check for default Administrator credentials (admin:admin or admin@photobooth.com:admin123456)
    const isDefaultAdmin =
      (cleanEmail === 'admin' || cleanEmail === 'admin@photobooth.com') &&
      (cleanPassword === 'admin' || cleanPassword === 'admin123456');

    if (isDefaultAdmin) {
      const token = signToken(
        { adminId: 'admin_super_1', email: 'admin@photobooth.com', role: 'superadmin' },
        Boolean(rememberMe)
      );
      await setAuthCookie(token, Boolean(rememberMe));
      return NextResponse.json({
        success: true,
        admin: {
          id: 'admin_super_1',
          email: cleanEmail,
          name: 'Super Administrator',
          role: 'superadmin',
        },
      });
    }

    // Try DB connection for custom database admins
    const { isConnected } = await connectToDatabase();

    if (isConnected) {
      const admin = await Admin.findOne({
        $or: [{ email: cleanEmail }, { email: 'admin' }, { email: 'admin@photobooth.com' }],
      });

      if (!admin) {
        return NextResponse.json(
          { success: false, error: 'Email hoặc mật khẩu không chính xác.' },
          { status: 401 }
        );
      }

      const isMatch = await comparePassword(cleanPassword, admin.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, error: 'Email hoặc mật khẩu không chính xác.' },
          { status: 401 }
        );
      }

      admin.lastLogin = new Date();
      await admin.save();

      const token = signToken(
        { adminId: admin._id.toString(), email: admin.email, role: admin.role },
        Boolean(rememberMe)
      );

      await setAuthCookie(token, Boolean(rememberMe));

      return NextResponse.json({
        success: true,
        admin: { id: admin._id, email: admin.email, name: admin.name, role: admin.role },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Email hoặc mật khẩu không chính xác.' },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('Admin Login Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi hệ thống khi đăng nhập.' },
      { status: 500 }
    );
  }
}
