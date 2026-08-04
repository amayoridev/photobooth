'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { IFrame, ISystemSettings } from '@/types';
import { composePhotoBoothImage } from '@/lib/canvas';
import { Sparkles, QrCode, Download, RefreshCcw, Loader2, Video, Image as ImageIcon } from 'lucide-react';
import { QRCodeModal } from './QRCodeModal';

interface ImageCompositorProps {
  frame: IFrame;
  photos: string[];
  btsVideo?: string;
  onRetake: () => void;
}

export function ImageCompositor({ frame, photos, btsVideo, onRetake }: ImageCompositorProps) {
  const [composedImageUrl, setComposedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'photo' | 'video'>('photo');
  const [sessionResult, setSessionResult] = useState<{
    qrToken: string;
    downloadToken: string;
    finalImageUrl: string;
    btsVideoUrl?: string;
    expiresAt?: string;
  } | null>(null);

  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [adminSettings, setAdminSettings] = useState<ISystemSettings | null>(null);
  const uploadingRef = useRef<boolean>(false);

  // Fetch admin configured watermark settings on mount
  useEffect(() => {
    async function loadPublicSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings) {
          setAdminSettings(data.settings);
        }
      } catch (err) {
        console.warn('Failed to fetch public settings:', err);
      }
    }
    loadPublicSettings();
  }, []);

  // Render HTML5 Canvas composition using Admin's Watermark configuration
  const renderComposition = useCallback(async () => {
    setIsProcessing(true);
    try {
      const finalDataUrl = await composePhotoBoothImage({
        frameUrl: frame.frameUrl,
        photos,
        layoutMode: frame.layoutMode,
        slots: frame.slots,
        targetWidth: frame.resolution?.width || 1200,
        targetHeight: frame.resolution?.height || 1800,
        showTimestamp: adminSettings ? adminSettings.showTimestamp !== false : true,
        showWatermark: adminSettings ? adminSettings.showWatermark !== false : true,
        watermarkText: adminSettings?.watermarkText || 'Antigravity PhotoBooth',
        watermarkSize: adminSettings?.watermarkSize || 30,
        watermarkPosition: adminSettings?.watermarkPosition || 'bottom_right',
        watermarkColor: adminSettings?.watermarkColor || '#ffffff',
        outputFormat: 'image/jpeg',
        quality: adminSettings?.jpegQuality || 0.92,
      });

      setComposedImageUrl(finalDataUrl);

      // Auto upload session to R2
      await uploadSession(finalDataUrl);
    } catch (err) {
      console.error('Image composition failed:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [frame, photos, adminSettings]);

  const uploadSession = async (imageDataUrl: string) => {
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    setIsUploading(true);
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameId: frame._id,
          layout: frame.layoutMode,
          photos,
          finalImage: imageDataUrl,
          btsVideo,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSessionResult({
          qrToken: data.qrToken,
          downloadToken: data.downloadToken,
          finalImageUrl: data.finalImageUrl,
          btsVideoUrl: data.btsVideoUrl,
          expiresAt: data.expiresAt,
        });
      }
    } catch (err) {
      console.error('Session upload error:', err);
      uploadingRef.current = false;
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    renderComposition();
  }, [renderComposition]);

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-6">
      {/* Header Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Composition & BTS Video Ready</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Your PhotoBooth Moment</h2>
        <p className="text-xs sm:text-sm text-slate-400">
          High-resolution photo collage & live behind-the-scenes video motion capture.
        </p>
      </div>

      {/* Photo vs Video Switcher Tabs (If BTS Video exists) */}
      {btsVideo && (
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1.5 rounded-2xl gap-2 shadow-lg">
          <button
            onClick={() => setActiveTab('photo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'photo'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>📸 Photo Collage</span>
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'video'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-pink-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-4 h-4 text-pink-400" />
            <span>🎬 Behind-The-Scenes Video</span>
          </button>
        </div>
      )}

      {/* Composition / BTS Video Display Box */}
      <div className="relative w-full max-w-md aspect-[4/6] bg-slate-950 rounded-3xl border-2 border-slate-800 overflow-hidden shadow-2xl p-4 flex items-center justify-center">
        {isProcessing || isUploading ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-sm font-semibold text-white">
              {isProcessing ? 'Merging frame & photos...' : 'Uploading photo & BTS video to Cloudflare R2...'}
            </p>
            <p className="text-xs text-slate-400">Creating instant high-res QR download link...</p>
          </div>
        ) : activeTab === 'video' && btsVideo ? (
          <video
            src={btsVideo}
            controls
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-contain rounded-2xl drop-shadow-2xl bg-black"
          />
        ) : composedImageUrl ? (
          <img
            src={composedImageUrl}
            alt="Final PhotoBooth Result"
            className="w-full h-full object-contain rounded-2xl drop-shadow-2xl"
          />
        ) : null}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 w-full max-w-md">
        <button
          onClick={onRetake}
          disabled={isUploading}
          className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700"
        >
          <RefreshCcw className="w-4 h-4" />
          <span>Retake Session</span>
        </button>

        {sessionResult && (
          <>
            <button
              onClick={() => setShowQRModal(true)}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>Get QR Code</span>
            </button>

            <a
              href={`/api/download/${sessionResult.downloadToken}`}
              download
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 transition-all flex items-center justify-center"
              title="Download High-Res JPG"
            >
              <Download className="w-4 h-4" />
            </a>
          </>
        )}
      </div>

      {/* QR Code Sharing Modal */}
      {showQRModal && sessionResult && (
        <QRCodeModal
          qrToken={sessionResult.qrToken}
          downloadToken={sessionResult.downloadToken}
          finalImageUrl={sessionResult.finalImageUrl}
          expiresAt={sessionResult.expiresAt}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
}
