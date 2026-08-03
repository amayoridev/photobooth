import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { authenticateAdminRequest, unauthorizedResponse } from '@/lib/auth';
import { Setting } from '@/models/Setting';
import { ISystemSettings } from '@/types';
import { getMemoryDB, saveMemoryDB } from '@/lib/memoryDb';

const DEFAULT_SYSTEM_SETTINGS: ISystemSettings = {
  defaultCountdown: 3,
  defaultMirrorMode: true,
  jpegQuality: 0.92,
  pngQuality: 1.0,
  sessionExpirationDays: 7,
  qrExpirationDays: 7,
  maxUploadSizeBytes: 10485760, // 10MB
  maxPhotosPerSession: 6,
  defaultResolution: '1080p',
  showLogo: false,
  showTimestamp: true,
  showWatermark: true,
  watermarkText: 'Antigravity PhotoBooth',
  watermarkSize: 30,
  watermarkPosition: 'bottom_right',
  watermarkColor: '#ffffff',
};

export async function GET() {
  try {
    const { isConnected } = await connectToDatabase();

    if (isConnected) {
      const setting = await Setting.findOne({ key: 'system_settings' });
      if (setting && setting.value) {
        return NextResponse.json({ success: true, settings: { ...DEFAULT_SYSTEM_SETTINGS, ...setting.value } });
      }
    }

    const memDb = getMemoryDB();
    const settings = memDb.settings && Object.keys(memDb.settings).length > 0
      ? { ...DEFAULT_SYSTEM_SETTINGS, ...memDb.settings }
      : DEFAULT_SYSTEM_SETTINGS;

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch settings.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const payload = await authenticateAdminRequest(req);
    if (!payload) return unauthorizedResponse();

    const body = await req.json();
    const { isConnected } = await connectToDatabase();

    const updatedSettings = { ...DEFAULT_SYSTEM_SETTINGS, ...body };

    if (isConnected) {
      const updated = await Setting.findOneAndUpdate(
        { key: 'system_settings' },
        { key: 'system_settings', value: updatedSettings },
        { upsert: true, new: true }
      );
      return NextResponse.json({ success: true, settings: updated.value });
    }

    // Standalone MemoryDB Fallback
    const memDb = getMemoryDB();
    memDb.settings = updatedSettings;
    saveMemoryDB(memDb);

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update settings.' },
      { status: 500 }
    );
  }
}
