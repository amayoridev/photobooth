'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { IFrame, ISystemSettings } from '@/types';
import { composePhotoBoothImage } from '@/lib/canvas';
import { Sparkles, QrCode, Download, RefreshCcw, Loader2, CloudUpload, CheckCircle2 } from 'lucide-react';
import { QRCodeModal } from './QRCodeModal';

interface ImageCompositorProps {
  frame: IFrame;
  photos: string[];
  onRetake: () => void;
}

export function ImageCompositor({ frame, photos, onRetake }: ImageCompositorProps) {
  const [composedImageUrl, setComposedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [sessionResult, setSessionResult] = useState<{
    qrToken: string;
    downloadToken: string;
    finalImageUrl: string;
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

  // Upload final image to server & Cloudflare R2 asynchronously in the background
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
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSessionResult({
          qrToken: data.qrToken,
          downloadToken: data.downloadToken,
          finalImageUrl: data.finalImageUrl,
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

  // Render HTML5 Canvas composition instantly (< 50ms) & trigger background R2 upload
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

      // Display composed image instantly!
      setComposedImageUrl(finalDataUrl);
      setIsProcessing(false);

      // Trigger R2 upload in the background
      uploadSession(finalDataUrl);
    } catch (err) {
      console.error('Image composition failed:', err);
      setIsProcessing(false);
    }
  }, [frame, photos, adminSettings]);

  useEffect(() => {
    renderComposition();
  }, [renderComposition]);

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-6">
      {/* Status Header Badge */}
      <div className="text-center space-y-2">
        {isProcessing ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Rendering High-Res Frame...</span>
          </div>
        ) : isUploading ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold animate-pulse">
            <CloudUpload className="w-3.5 h-3.5" />
            <span>Photo Ready! Syncing to Cloudflare R2...</span>
          </div>
        ) : sessionResult ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>R2 Sync Complete • QR Code Ready</span>
          </div>
        ) : null}

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Your Photo Collage</h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Instant local canvas render with background Cloudflare R2 upload.
        </p>
      </div>

      {/* Composition Display Box */}
      <div className="relative w-full max-w-md aspect-[4/6] bg-slate-950 rounded-3xl border-2 border-slate-800 overflow-hidden shadow-2xl p-4 flex items-center justify-center">
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-sm font-semibold text-white">Merging frame & photos...</p>
          </div>
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
        {/* Retake Session */}
        <button
          onClick={onRetake}
          className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700"
        >
          <RefreshCcw className="w-4 h-4" />
          <span>Retake Session</span>
        </button>

        {/* QR Code Modal Trigger - Active only after R2 upload completes */}
        <button
          onClick={() => {
            if (sessionResult) setShowQRModal(true);
          }}
          disabled={!sessionResult || isUploading}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
            sessionResult
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/20'
              : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
          title={sessionResult ? 'Get Share & Download QR Code' : 'Uploading to Cloudflare R2...'}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              <span>Uploading to R2...</span>
            </>
          ) : (
            <>
              <QrCode className="w-4 h-4" />
              <span>Get QR Code</span>
            </>
          )}
        </button>

        {/* Direct Instant Local Download */}
        {composedImageUrl && (
          <a
            href={composedImageUrl}
            download={`photobooth_${Date.now()}.jpg`}
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 transition-all flex items-center justify-center"
            title="Download Instant Photo"
          >
            <Download className="w-4 h-4" />
          </a>
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
