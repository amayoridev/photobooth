import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { authenticateAdminRequest, unauthorizedResponse } from '@/lib/auth';
import { Setting } from '@/models/Setting';
import { getMemoryDB, saveMemoryDB } from '@/lib/memoryDb';
import { IBrandingSettings } from '@/types';
import fs from 'fs';
import path from 'path';

const DEFAULT_BRANDING: IBrandingSettings = {
  appName: 'Antigravity PhotoBooth',
  logoUrl: '',
  faviconUrl: '',
  loadingScreenText: 'Get ready for your moment...',
  primaryColor: '#6366f1', // Indigo
  secondaryColor: '#ec4899', // Pink
  accentColor: '#8b5cf6', // Purple
  footerText: 'Powered by Antigravity Digital PhotoBooth',
  copyrightText: '© 2026 Antigravity Inc. All Rights Reserved.',
};

export async function GET() {
  try {
    const { isConnected } = await connectToDatabase();
    if (isConnected) {
      const setting = await Setting.findOne({ key: 'branding' });
      if (setting && setting.value) {
        return NextResponse.json({ success: true, branding: { ...DEFAULT_BRANDING, ...setting.value } });
      }
    }

    const memDb = getMemoryDB();
    const branding = memDb.branding && Object.keys(memDb.branding).length > 0
      ? { ...DEFAULT_BRANDING, ...memDb.branding }
      : DEFAULT_BRANDING;

    return NextResponse.json({ success: true, branding });
  } catch (error: any) {
    return NextResponse.json(
      { success: true, branding: DEFAULT_BRANDING }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const payload = await authenticateAdminRequest(req);
    if (!payload) return unauthorizedResponse();

    let updatedBranding: any = {};
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const appName = formData.get('appName') as string;
      const loadingScreenText = formData.get('loadingScreenText') as string;
      const primaryColor = formData.get('primaryColor') as string;
      const secondaryColor = formData.get('secondaryColor') as string;
      const accentColor = formData.get('accentColor') as string;
      const footerText = formData.get('footerText') as string;
      const copyrightText = formData.get('copyrightText') as string;
      let logoUrl = (formData.get('logoUrl') as string) || '';

      const logoFile = formData.get('logoFile') as File | null;
      if (logoFile && logoFile.size > 0) {
        const buffer = Buffer.from(await logoFile.arrayBuffer());
        const ext = logoFile.name.split('.').pop() || 'png';
        const filename = `logo_${Date.now()}.${ext}`;

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'branding');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        fs.writeFileSync(path.join(uploadDir, filename), buffer);
        logoUrl = `/api/uploads/branding/${filename}`;
      }

      updatedBranding = {
        appName: appName || DEFAULT_BRANDING.appName,
        logoUrl,
        loadingScreenText: loadingScreenText || DEFAULT_BRANDING.loadingScreenText,
        primaryColor: primaryColor || DEFAULT_BRANDING.primaryColor,
        secondaryColor: secondaryColor || DEFAULT_BRANDING.secondaryColor,
        accentColor: accentColor || DEFAULT_BRANDING.accentColor,
        footerText: footerText || DEFAULT_BRANDING.footerText,
        copyrightText: copyrightText || DEFAULT_BRANDING.copyrightText,
      };
    } else {
      updatedBranding = await req.json();
    }

    const { isConnected } = await connectToDatabase();

    // 1. Save to MemoryDB
    const memDb = getMemoryDB();
    memDb.branding = { ...DEFAULT_BRANDING, ...memDb.branding, ...updatedBranding };
    saveMemoryDB(memDb);

    // 2. Save to Mongo if connected
    if (isConnected) {
      const settingDoc = await Setting.findOneAndUpdate(
        { key: 'branding' },
        { key: 'branding', value: memDb.branding },
        { upsert: true, new: true }
      );
      return NextResponse.json({ success: true, branding: settingDoc.value });
    }

    return NextResponse.json({ success: true, branding: memDb.branding });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update branding settings.' },
      { status: 500 }
    );
  }
}
