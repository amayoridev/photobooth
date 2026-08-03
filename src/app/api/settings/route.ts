import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Setting } from '@/models/Setting';
import { getMemoryDB } from '@/lib/memoryDb';
import { ISystemSettings } from '@/types';

const DEFAULT_SYSTEM_SETTINGS: ISystemSettings = {
  defaultCountdown: 3,
  defaultMirrorMode: true,
  jpegQuality: 0.92,
  pngQuality: 1.0,
  sessionExpirationDays: 7,
  qrExpirationDays: 7,
  maxUploadSizeBytes: 10485760,
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
  } catch {
    return NextResponse.json({ success: true, settings: DEFAULT_SYSTEM_SETTINGS });
  }
}
