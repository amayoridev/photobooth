'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FrameSelector } from '@/components/FrameSelector';
import { CameraBooth } from '@/components/CameraBooth';
import { ImageCompositor } from '@/components/ImageCompositor';
import { IFrame } from '@/types';
import { Loader2, ArrowLeft } from 'lucide-react';

type Step = 'SELECT_FRAME' | 'CAMERA_SESSION' | 'COMPOSITION';

export default function PhotoBoothPage() {
  const [step, setStep] = useState<Step>('SELECT_FRAME');
  const [frames, setFrames] = useState<IFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<IFrame | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isLoadingFrames, setIsLoadingFrames] = useState<boolean>(true);

  // Fetch enabled frames from API
  useEffect(() => {
    let isMounted = true;

    async function loadFrames(retries = 3) {
      try {
        const res = await fetch('/api/frames');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.frames)) {
          setFrames(data.frames);
        }
      } catch (err) {
        if (retries > 0 && isMounted) {
          setTimeout(() => loadFrames(retries - 1), 600);
          return;
        }
        console.warn('Failed to load frames:', err);
      } finally {
        if (isMounted) {
          setIsLoadingFrames(false);
        }
      }
    }

    loadFrames();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectFrame = (frame: IFrame) => {
    setSelectedFrame(frame);
    setCapturedPhotos([]);
    setStep('CAMERA_SESSION');
  };

  const handlePhotosCaptured = (photos: string[]) => {
    setCapturedPhotos(photos);
    setStep('COMPOSITION');
  };

  const handleRetake = () => {
    setCapturedPhotos([]);
    setStep('CAMERA_SESSION');
  };

  const handleBackToFrames = () => {
    setCapturedPhotos([]);
    setSelectedFrame(null);
    setStep('SELECT_FRAME');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step Navigation Header */}
        <div className="flex items-center justify-between mb-8">
          {step !== 'SELECT_FRAME' ? (
            <button
              onClick={handleBackToFrames}
              className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Frame Selection</span>
            </button>
          ) : <div />}

          {/* Progress Indicator */}
          <div className="flex items-center space-x-2 text-xs font-bold">
            <span className={step === 'SELECT_FRAME' ? 'text-indigo-400' : 'text-slate-500'}>1. Frame</span>
            <span className="text-slate-700">•</span>
            <span className={step === 'CAMERA_SESSION' ? 'text-indigo-400' : 'text-slate-500'}>2. Capture</span>
            <span className="text-slate-700">•</span>
            <span className={step === 'COMPOSITION' ? 'text-indigo-400' : 'text-slate-500'}>3. Complete</span>
          </div>
        </div>

        {/* Step Render */}
        {isLoadingFrames ? (
          <div className="py-24 text-center flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-sm text-slate-400 font-semibold">Loading designer frames...</p>
          </div>
        ) : step === 'SELECT_FRAME' ? (
          <FrameSelector frames={frames} onSelectFrame={handleSelectFrame} />
        ) : step === 'CAMERA_SESSION' && selectedFrame ? (
          <CameraBooth frame={selectedFrame} onPhotosCaptured={handlePhotosCaptured} />
        ) : step === 'COMPOSITION' && selectedFrame ? (
          <ImageCompositor frame={selectedFrame} photos={capturedPhotos} onRetake={handleRetake} />
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
