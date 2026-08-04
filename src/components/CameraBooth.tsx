'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { IFrame } from '@/types';
import { analyzeFrame } from '@/lib/canvas';
import {
  Camera,
  Timer,
  FlipHorizontal,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Upload,
  Check,
  Image as ImageIcon,
} from 'lucide-react';

interface CameraBoothProps {
  frame: IFrame;
  onPhotosCaptured: (photos: string[]) => void;
}

export function CameraBooth({ frame, onPhotosCaptured }: CameraBoothProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirror, setIsMirror] = useState<boolean>(true);
  const [countdownDuration, setCountdownDuration] = useState<3 | 5 | 10>(3);
  const [currentCountdown, setCurrentCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [requiredPhotoCount, setRequiredPhotoCount] = useState<number>(() => {
    if (frame.layoutMode === 'two_photo') return 2;
    if (frame.layoutMode === 'three_photo') return 3;
    if (frame.layoutMode === 'vertical_strip' || frame.layoutMode === 'four_grid') return 4;
    return frame.slots?.length || 1;
  });

  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);

  // Auto analyze frame overlay to count transparent cutouts
  useEffect(() => {
    async function inspectFrameCutouts() {
      if (!frame.frameUrl) return;
      try {
        const info = await analyzeFrame(frame.frameUrl);
        if (info.photoCount && info.photoCount > 0) {
          setRequiredPhotoCount(info.photoCount);
        }
      } catch {
        // fallback
      }
    }
    inspectFrameCutouts();
  }, [frame]);

  // Initialize browser MediaDevices camera stream
  const initCamera = useCallback(async () => {
    setCameraError(null);

    // Check if browser supports MediaDevices (restricted by browsers on unsecure HTTP public IPs)
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Camera API is restricted by browsers on unsecure HTTP connections. Access via HTTPS or Localhost for live camera, or upload photos directly below!'
      );
      return;
    }

    // Stop current stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera Access Error:', err);
      setCameraError('Unable to access camera. Please allow camera permissions in your browser or upload photos directly!');
    }
  }, [facingMode]);

  useEffect(() => {
    initCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [initCamera]);

  // Capture a single frame snapshot from video element
  const takeSinglePhotoSnapshot = useCallback((): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (isMirror && facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.95);
  }, [isMirror, facingMode]);

  // Trigger full photo sequence capture session
  const startCaptureSequence = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    const newPhotos: string[] = [];

    for (let i = 0; i < requiredPhotoCount; i++) {
      setActivePhotoIndex(i);

      // Countdown loop
      for (let sec = countdownDuration; sec > 0; sec--) {
        setCurrentCountdown(sec);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setCurrentCountdown(null);

      // Flash & capture
      const photoData = takeSinglePhotoSnapshot();
      if (photoData) {
        newPhotos.push(photoData);
        setCapturedPhotos([...newPhotos]);
      }

      // Small pause between shots
      if (i < requiredPhotoCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    setIsCapturing(false);

    // Auto trigger complete if all photos captured
    if (newPhotos.length >= requiredPhotoCount) {
      setTimeout(() => {
        onPhotosCaptured(newPhotos);
      }, 500);
    }
  };

  // Direct device file upload fallback for non-HTTPS or mobile gallery selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const fileUrls: string[] = [];
    let processed = 0;

    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          fileUrls.push(event.target.result as string);
        }
        processed++;
        if (processed === selectedFiles.length) {
          setCapturedPhotos(fileUrls);
          if (fileUrls.length > 0) {
            onPhotosCaptured(fileUrls);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRetakeAll = () => {
    setCapturedPhotos([]);
    setActivePhotoIndex(0);
    setIsCapturing(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6">
      {/* Top Session Progress Bar */}
      <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shadow-xl backdrop-blur-md">
        <div className="text-center sm:text-left">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center justify-center sm:justify-start gap-2">
            <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
            <span>{frame.name}</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Layout: <span className="capitalize text-indigo-300 font-semibold">{frame.layoutMode.replace('_', ' ')}</span> • {capturedPhotos.length} / {requiredPhotoCount} Photos
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
          {/* Mirror Toggle */}
          <button
            onClick={() => setIsMirror(!isMirror)}
            className={`p-2 sm:p-2.5 rounded-xl border text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-all ${
              isMirror
                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Toggle Mirror View"
          >
            <FlipHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Mirror</span>
          </button>

          {/* Facing Mode Switcher */}
          <button
            onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-all"
            title="Switch Camera"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{facingMode === 'user' ? 'Front' : 'Rear'}</span>
          </button>

          {/* Countdown Selector */}
          <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-xl p-1">
            <Timer className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5 hidden sm:inline" />
            {([3, 5, 10] as const).map((secs) => (
              <button
                key={secs}
                onClick={() => setCountdownDuration(secs)}
                disabled={isCapturing}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                  countdownDuration === secs
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {secs}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Viewfinder Display */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[50vh] sm:max-h-[600px] bg-black rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl flex items-center justify-center">
        {/* Camera Error / Non-HTTPS Fallback */}
        {cameraError ? (
          <div className="p-6 sm:p-8 text-center max-w-lg space-y-4">
            <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400 mx-auto" />
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Browser Camera Access Notice</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{cameraError}</p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <label className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all">
                <Upload className="w-4 h-4" />
                <span>Upload {requiredPhotoCount} Photos from Device</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={initCamera}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
              >
                Retry Live Camera
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Live Video Element */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover transition-transform ${
                isMirror && facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />

            {/* Countdown Overlay */}
            {currentCountdown !== null && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-30">
                <span className="text-8xl sm:text-9xl font-black text-white drop-shadow-2xl animate-ping">
                  {currentCountdown}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Capture Control Button & Upload Option */}
      <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-2xl gap-3 sm:gap-4">
        {/* Direct Upload Option */}
        <label className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all">
          <Upload className="w-4 h-4 text-indigo-400" />
          <span>Upload Photos from Gallery</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {/* Start Shutter Sequence Button */}
        {!cameraError && (
          <button
            onClick={startCaptureSequence}
            disabled={isCapturing || capturedPhotos.length >= requiredPhotoCount}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 transition-all ${
              isCapturing
                ? 'bg-amber-500 text-slate-950 animate-pulse'
                : capturedPhotos.length >= requiredPhotoCount
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25 scale-[1.01] sm:scale-105'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span>
              {isCapturing
                ? `Capturing Photo #${activePhotoIndex + 1}...`
                : capturedPhotos.length >= requiredPhotoCount
                ? 'Photos Captured!'
                : `Start ${requiredPhotoCount}-Photo Session`}
            </span>
          </button>
        )}
      </div>

      {/* Captured Photo Thumbnails Bar */}
      {capturedPhotos.length > 0 && (
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-indigo-400" />
              <span>Captured Photos ({capturedPhotos.length}/{requiredPhotoCount})</span>
            </span>
            <button
              onClick={handleRetakeAll}
              className="text-slate-400 hover:text-rose-400 font-semibold transition-colors"
            >
              Clear All & Retake
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {capturedPhotos.map((src, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-indigo-500/50 shadow-md">
                <img src={src} alt={`Shot ${idx + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-1 right-1 bg-slate-950/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                  #{idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
