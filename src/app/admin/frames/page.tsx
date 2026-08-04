'use client';

import { useState, useEffect, useRef } from 'react';
import { IFrame } from '@/types';
import { FrameEditorModal } from '@/components/admin/FrameEditorModal';
import { analyzeFrame } from '@/lib/canvas';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  Pin,
  Sparkles,
  ScanLine,
  CheckCircle2,
} from 'lucide-react';

const BATCH_SIZE = 30;

export default function AdminFramesPage() {
  const [frames, setFrames] = useState<IFrame[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingFrame, setEditingFrame] = useState<IFrame | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Lazy Load / Infinite Scroll State
  const [visibleCount, setVisibleCount] = useState<number>(BATCH_SIZE);
  const observerTargetRef = useRef<HTMLDivElement | null>(null);

  // Batch Auto-Detect States
  const [isBatchScanning, setIsBatchScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanTotal, setScanTotal] = useState<number>(0);
  const [currentScanningName, setCurrentScanningName] = useState<string>('');
  const [scanResultSummary, setScanResultSummary] = useState<string | null>(null);

  const loadFrames = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/frames');
      const data = await res.json();
      if (data.success) {
        setFrames(data.frames);
      }
    } catch (err) {
      console.error('Failed to load frames:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFrames();
  }, []);

  const visibleFrames = frames.slice(0, visibleCount);
  const hasMore = visibleCount < frames.length;

  // IntersectionObserver for Infinite Scroll in Admin Portal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, frames.length));
        }
      },
      { threshold: 0.2, rootMargin: '200px' }
    );

    const currentTarget = observerTargetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, frames.length]);

  const handleToggleStatus = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/frames/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        setFrames((prev) => prev.map((f) => (String(f._id) === String(id) ? { ...f, enabled: !currentEnabled } : f)));
      } else {
        alert(data.error || 'Failed to toggle status.');
      }
    } catch (err: any) {
      console.error('Failed to toggle status:', err);
      alert('Failed to toggle status: ' + err.message);
    }
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    try {
      const res = await fetch(`/api/admin/frames/${encodeURIComponent(id)}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !currentPinned }),
      });
      const data = await res.json();
      if (data.success) {
        setFrames((prev) =>
          prev
            .map((f) => (String(f._id) === String(id) ? { ...f, isPinned: !currentPinned } : f))
            .sort((a, b) => {
              const pinA = a.isPinned ? 1 : 0;
              const pinB = b.isPinned ? 1 : 0;
              if (pinA !== pinB) return pinB - pinA;
              return (a.displayOrder || 0) - (b.displayOrder || 0);
            })
        );
      } else {
        alert(data.error || 'Failed to toggle pin status.');
      }
    } catch (err: any) {
      console.error('Failed to toggle pin status:', err);
      alert('Failed to toggle pin status: ' + err.message);
    }
  };

  const handleDeleteFrame = async (id: string) => {
    if (!confirm('Are you sure you want to delete this frame?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/frames/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFrames((prev) => prev.filter((f) => String(f._id) !== String(id)));
      } else {
        alert(data.error || 'Failed to delete frame.');
      }
    } catch (err: any) {
      console.error('Failed to delete frame:', err);
      alert('Failed to delete frame: ' + (err.message || 'Network error'));
    } finally {
      setDeletingId(null);
    }
  };

  // Batch Auto-Detect Photo Cutouts for ALL Frames in the Library
  const handleAutoScanAllFrames = async () => {
    if (frames.length === 0) return;
    setIsBatchScanning(true);
    setScanProgress(0);
    setScanTotal(frames.length);
    setScanResultSummary(null);

    const updates: { id: string; layoutMode: string; slots: any[] }[] = [];
    let detectedCount = 0;

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      setCurrentScanningName(frame.name);
      setScanProgress(i + 1);

      try {
        const frameUrl = frame.thumbnailUrl || frame.frameUrl;
        const analysis = await analyzeFrame(frameUrl);

        if (analysis.slots && analysis.slots.length > 0) {
          updates.push({
            id: frame._id,
            layoutMode: analysis.suggestedLayout,
            slots: analysis.slots,
          });
          detectedCount++;
        }
      } catch (err) {
        console.warn(`Failed to scan frame cutouts for ${frame.name}:`, err);
      }

      await new Promise((r) => setTimeout(r, 15));
    }

    if (updates.length > 0) {
      try {
        const res = await fetch('/api/admin/frames/batch-update-slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates }),
        });
        const data = await res.json();
        if (data.success) {
          setScanResultSummary(`Successfully scanned and auto-detected photo cutouts for ${detectedCount} / ${frames.length} frames!`);
          await loadFrames();
        }
      } catch (err) {
        console.error('Batch update failed:', err);
      }
    } else {
      setScanResultSummary(`Completed scanning ${frames.length} frames.`);
    }

    setIsBatchScanning(false);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <span>Frame Management</span>
            <Layers className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload designer PNG overlays, pin featured frames to the top, & auto-detect photo cutouts for all frames.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          {/* Batch Auto-Detect Cutouts Button */}
          <button
            onClick={handleAutoScanAllFrames}
            disabled={isBatchScanning || frames.length === 0}
            className="flex-1 lg:flex-initial px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <ScanLine className="w-4 h-4" />
            <span>{isBatchScanning ? `Scanning (${scanProgress}/${scanTotal})...` : '✨ Auto-Detect All Cutouts'}</span>
          </button>

          {/* Upload New Frame Button */}
          <button
            onClick={() => {
              setEditingFrame(null);
              setIsModalOpen(true);
            }}
            className="flex-1 lg:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Upload New Frame</span>
          </button>
        </div>
      </div>

      {/* Batch Scan Progress Modal */}
      {isBatchScanning && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto">
              <ScanLine className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Auto-Detecting Photo Cutouts</h3>
              <p className="text-xs text-slate-400 mt-1">
                Scanning PNG alpha channels for <span className="text-amber-300 font-semibold">{currentScanningName}</span>...
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>Progress</span>
                <span>{scanProgress} / {scanTotal} ({Math.round((scanProgress / scanTotal) * 100)}%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-indigo-500 h-full transition-all duration-200"
                  style={{ width: `${(scanProgress / scanTotal) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scan Summary Banner */}
      {scanResultSummary && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between gap-4 text-emerald-300 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{scanResultSummary}</span>
          </div>
          <button
            onClick={() => setScanResultSummary(null)}
            className="text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-24 text-center flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-xs text-slate-400 font-semibold">Loading frames from database...</p>
        </div>
      ) : frames.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 space-y-4">
          <Layers className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No frames found in database.</p>
          <button
            onClick={() => {
              setEditingFrame(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
          >
            Create First Frame
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleFrames.map((frame, idx) => (
              <div
                key={frame._id}
                className={`bg-slate-900/90 border rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between group transition-all relative ${
                  frame.isPinned ? 'border-amber-500/60 ring-2 ring-amber-500/20 shadow-amber-500/10' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Card Image */}
                <div className="relative aspect-[4/5] bg-slate-950 p-4 flex items-center justify-center overflow-hidden">
                  <img
                    src={frame.thumbnailUrl || frame.frameUrl}
                    alt={frame.name}
                    loading="lazy"
                    className="w-full h-full object-contain relative z-10 drop-shadow-xl"
                  />

                  <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20">
                    {frame.isPinned && (
                      <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase flex items-center gap-1 shadow-md">
                        <Pin className="w-3 h-3 fill-slate-950" />
                        <span>Pinned</span>
                      </span>
                    )}
                    <span className="bg-slate-950/80 backdrop-blur-md text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {frame.layoutMode.replace('_', ' ')}
                    </span>
                    <span className="bg-slate-950/80 backdrop-blur-md text-slate-300 border border-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {frame.aspectRatio}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                    <button
                      onClick={() => handleTogglePin(frame._id, !!frame.isPinned)}
                      title={frame.isPinned ? 'Unpin frame' : 'Pin frame to top'}
                      className={`p-1.5 rounded-full text-[10px] font-bold flex items-center transition-all ${
                        frame.isPinned
                          ? 'bg-amber-500 text-slate-950 font-extrabold shadow-lg shadow-amber-500/30'
                          : 'bg-slate-950/80 text-slate-400 border border-slate-800 hover:text-amber-400'
                      }`}
                    >
                      <Pin className={`w-3.5 h-3.5 ${frame.isPinned ? 'fill-slate-950' : ''}`} />
                    </button>

                    <button
                      onClick={() => handleToggleStatus(frame._id, frame.enabled)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${
                        frame.enabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {frame.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{frame.enabled ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>

                {/* Card Content & Action Controls */}
                <div className="p-5 border-t border-slate-800/80 space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>{frame.name}</span>
                        {frame.isPinned && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                      </h3>
                      <span className="text-[10px] text-slate-500 font-mono">Order #{frame.displayOrder || idx + 1}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {frame.description || 'Custom designer frame overlay.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                    <span>Category: <strong className="text-slate-300">{frame.category}</strong></span>
                    <span>Cutout Slots: <strong className="text-amber-300 font-bold">{frame.slots?.length || 1} Slots</strong></span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setEditingFrame(frame);
                        setIsModalOpen(true);
                      }}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-all"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDeleteFrame(frame._id)}
                      disabled={deletingId === frame._id}
                      className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center justify-center border border-rose-500/20 transition-all"
                    >
                      {deletingId === frame._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Infinite Scroll Sentinel */}
          <div ref={observerTargetRef} className="py-6 flex flex-col items-center justify-center gap-3">
            {hasMore ? (
              <button
                onClick={() => setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, frames.length))}
                className="px-5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
              >
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                <span>Loading more frames... ({visibleFrames.length} / {frames.length})</span>
              </button>
            ) : (
              <p className="text-xs text-slate-500 font-mono">
                Showing all {frames.length} frames
              </p>
            )}
          </div>
        </>
      )}

      {/* Frame Editor Modal */}
      {isModalOpen && (
        <FrameEditorModal
          frame={editingFrame}
          onClose={() => {
            setIsModalOpen(false);
            setEditingFrame(null);
          }}
          onSaveSuccess={() => {
            setIsModalOpen(false);
            setEditingFrame(null);
            loadFrames();
          }}
        />
      )}
    </div>
  );
}
