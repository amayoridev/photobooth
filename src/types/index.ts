export type LayoutMode = 
  | 'single'
  | 'two_photo'
  | 'three_photo'
  | 'four_grid'
  | 'film_strip'
  | 'polaroid'
  | 'vertical_strip'
  | 'horizontal_strip';

export interface LayoutSlot {
  x: number; // Percentage 0-100 or pixel coordinate
  y: number;
  width: number;
  height: number;
  rotation?: number; // In degrees
  aspectRatio?: number;
}

export interface IFrame {
  _id: string;
  name: string;
  description: string;
  category: string;
  resolution: {
    width: number;
    height: number;
  };
  aspectRatio: string; // e.g. "4:6", "2:6", "1:1"
  layoutMode: LayoutMode;
  slots: LayoutSlot[];
  thumbnailUrl: string;
  previewUrl: string;
  frameUrl: string;
  r2Key: string;
  enabled: boolean;
  isPinned?: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ISession {
  _id: string;
  frameId: string | IFrame;
  layout: LayoutMode;
  photoUrls: string[];
  finalImageUrl: string;
  r2Key: string;
  qrToken: string;
  downloadToken: string;
  downloadCount: number;
  scanCount: number;
  expiresAt: string;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface IAdmin {
  _id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin';
  createdAt: string;
  lastLogin?: string;
}

export interface IBrandingSettings {
  appName: string;
  logoUrl: string;
  faviconUrl: string;
  loadingScreenText: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  footerText: string;
  copyrightText: string;
}

export interface ISystemSettings {
  defaultCountdown: 3 | 5 | 10;
  defaultMirrorMode: boolean;
  jpegQuality: number; // 0.1 to 1.0
  pngQuality: number;
  sessionExpirationDays: number;
  qrExpirationDays: number;
  maxUploadSizeBytes: number;
  maxPhotosPerSession: number;
  defaultResolution: '1080p' | '4k' | 'custom';
  showLogo: boolean;
  showTimestamp: boolean;
  showWatermark: boolean;
  watermarkText: string;
  watermarkSize?: number;
  watermarkPosition?: 'bottom_right' | 'bottom_center' | 'bottom_left' | 'top_right' | 'top_left';
  watermarkColor?: string;
}

export interface IAnalyticsSummary {
  totalSessions: number;
  todaySessions: number;
  activeFrames: number;
  totalDownloads: number;
  totalScans: number;
  estimatedStorageMB: number;
  popularFrames: { frameId: string; frameName: string; count: number }[];
  dailySessions: { date: string; count: number }[];
  weeklySessions: { week: string; count: number }[];
  downloadsTrend: { date: string; downloads: number; scans: number }[];
}
