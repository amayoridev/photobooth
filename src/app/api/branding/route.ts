import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Setting } from '@/models/Setting';
import { getMemoryDB } from '@/lib/memoryDb';
import { IBrandingSettings } from '@/types';

const DEFAULT_BRANDING: IBrandingSettings = {
  appName: 'Antigravity PhotoBooth',
  logoUrl: '',
  faviconUrl: '',
  loadingScreenText: 'Get ready for your moment...',
  primaryColor: '#6366f1',
  secondaryColor: '#ec4899',
  accentColor: '#8b5cf6',
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
  } catch {
    return NextResponse.json({ success: true, branding: DEFAULT_BRANDING });
  }
}
