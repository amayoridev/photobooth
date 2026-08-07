'use client';

import { useState, useEffect } from 'react';
import { IFrame, LayoutMode, LayoutSlot } from '@/types';
import { getDefaultSlotsForLayout, analyzeFrame } from '@/lib/canvas';
import { X, Upload, Check, RefreshCw, Wand2, Plus, Trash2, Sliders, RotateCcw } from 'lucide-react';

interface FrameEditorModalProps {
  frame?: IFrame | null;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export function FrameEditorModal({ frame, onClose, onSaveSuccess }: FrameEditorModalProps) {
  const [name, setName] = useState(frame?.name || '');
  const [description, setDescription] = useState(frame?.description || '');
  const [category, setCategory] = useState(frame?.category || 'General');
  const [aspectRatio, setAspectRatio] = useState(frame?.aspectRatio || '4:6');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(frame?.layoutMode || 'single');
  const [width, setWidth] = useState<number>(frame?.resolution?.width || 1200);
  const [height, setHeight] = useState<number>(frame?.resolution?.height || 1800);
  const [enabled, setEnabled] = useState<boolean>(frame ? frame.enabled : true);

  const [slots, setSlots] = useState<LayoutSlot[]>(
    frame?.slots && frame.slots.length > 0
      ? frame.slots
      : getDefaultSlotsForLayout(frame?.layoutMode || 'single', 1200, 1800)
  );

  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>(frame?.frameUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect actual image resolution on mount to prevent aspect ratio mismatches
  useEffect(() => {
    if (frame?.frameUrl) {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setWidth(img.naturalWidth);
          setHeight(img.naturalHeight);
        }
      };
      img.src = frame.frameUrl;
    }
  }, [frame]);

  // Auto-detect slots & dimensions whenever file preview changes
  const autoDetectFrameCutouts = async (previewUrl: string) => {
    if (!previewUrl) return;
    setIsAnalyzing(true);
    try {
      const res = await analyzeFrame(previewUrl);
      if (res.width && res.height) {
        setWidth(res.width);
        setHeight(res.height);

        // Auto-select aspect ratio & strip layout mode
        if (res.height > res.width * 2.0) {
          setLayoutMode('vertical_strip');
          setAspectRatio('2:6');
        } else if (res.height > res.width * 1.6) {
          setLayoutMode('three_photo');
          setAspectRatio('2:6');
        } else if (res.height > res.width * 1.3) {
          setLayoutMode('two_photo');
          setAspectRatio('4:6');
        } else if (res.width === res.height) {
          setLayoutMode('single');
          setAspectRatio('1:1');
        }
      }

      if (res.slots && res.slots.length > 0) {
        setSlots(res.slots);
        setSelectedSlotIdx(0);
      } else {
        setSlots(getDefaultSlotsForLayout(layoutMode, res.width || width, res.height || height));
      }
    } catch {
      // fallback
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLayoutModeChange = (mode: LayoutMode) => {
    setLayoutMode(mode);
    setSlots(getDefaultSlotsForLayout(mode, width, height));
    setSelectedSlotIdx(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const previewUrl = URL.createObjectURL(selected);
      setFilePreview(previewUrl);
      autoDetectFrameCutouts(previewUrl);
    }
  };

  const handleUpdateSlot = (index: number, key: keyof LayoutSlot, val: number) => {
    const updated = [...slots];
    updated[index] = { ...updated[index], [key]: Math.max(0, val) };
    setSlots(updated);
  };

  const handleAddSlot = () => {
    const newSlot: LayoutSlot = {
      x: Math.round(width * 0.1),
      y: Math.round(height * 0.1),
      width: Math.round(width * 0.8),
      height: Math.round(height * 0.3),
    };
    setSlots([...slots, newSlot]);
    setSelectedSlotIdx(slots.length);
  };

  const handleDeleteSlot = (index: number) => {
    if (slots.length <= 1) return;
    const updated = slots.filter((_, i) => i !== index);
    setSlots(updated);
    if (selectedSlotIdx >= updated.length) {
      setSelectedSlotIdx(Math.max(0, updated.length - 1));
    }
  };

  const handleResetDefaults = () => {
    setSlots(getDefaultSlotsForLayout(layoutMode, width, height));
    setSelectedSlotIdx(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('Frame name is required.');
      return;
    }
    if (!frame && !file) {
      setError('Transparent PNG frame image file is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('aspectRatio', aspectRatio);
      formData.append('layoutMode', layoutMode);
      formData.append('width', width.toString());
      formData.append('height', height.toString());
      formData.append('enabled', enabled.toString());
      formData.append('slots', JSON.stringify(slots));
      if (file) {
        formData.append('frameFile', file);
      }

      const endpoint = frame ? `/api/admin/frames/${frame._id}` : '/api/admin/frames';
      const method = frame ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Operation failed');
      }

      onSaveSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save frame.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">
              {frame ? 'Edit Frame Configuration' : 'Upload New Frame'}
            </h3>
            <p className="text-xs text-slate-400">Configure auto/manual cutout slots, dimensions, strip modes, and transparent PNG overlay.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Frame Display Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. BearBare Vintage Strip"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of theme..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Vintage, Cute, Event"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Aspect Ratio
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="4:6">4:6 (Standard Portrait)</option>
                  <option value="2:6">2:6 (Tall 4-Photo Strip)</option>
                  <option value="1:1">1:1 (Square Grid)</option>
                  <option value="16:9">16:9 (Widescreen)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Canvas Width (px)
                </label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value, 10) || 1200)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Canvas Height (px)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value, 10) || 1800)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Photo Layout & Strip Mode
              </label>
              <select
                value={layoutMode}
                onChange={(e) => handleLayoutModeChange(e.target.value as LayoutMode)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="single">Single Photo (1 Ảnh Single)</option>
                <option value="two_photo">Two Photos (2 Ảnh Stack/Strip)</option>
                <option value="three_photo">Three Photos (3 Ảnh Strip Dọc)</option>
                <option value="vertical_strip">Four Photos Strip (4 Ảnh Strip Dọc)</option>
                <option value="four_grid">Four Photos Grid (4 Ảnh Lưới 2x2)</option>
                <option value="film_strip">Film Strip Style (Cuộn Phim Classic)</option>
                <option value="polaroid">Polaroid Style (Ảnh Khung Giấy)</option>
                <option value="horizontal_strip">Horizontal Strip (Dải Ngang)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Transparent PNG Frame Image
              </label>
              <div className="relative border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 text-center cursor-pointer transition-colors">
                <input
                  type="file"
                  accept="image/png"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-20"
                />
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-semibold">
                  {file ? file.name : 'Click or drop transparent PNG image'}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Supports any dimensions (e.g. 880x2650 4-strip, 1200x1800 4:6)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                />
                <span>Enable Frame Immediately</span>
              </label>
            </div>
          </div>

          {/* Right Column: Dynamic Aspect-Ratio Aligned Preview & Cutout Editor */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Cutout Slots ({slots.length} Photos)
              </label>

              <div className="flex items-center gap-1.5">
                {filePreview && (
                  <button
                    type="button"
                    onClick={() => autoDetectFrameCutouts(filePreview)}
                    disabled={isAnalyzing}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20 transition-all"
                    title="Tự động quét ô đục lỗ"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>{isAnalyzing ? 'Scanning...' : 'Auto-Detect'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 transition-all"
                  title="Thêm ô ảnh thủ công"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Slot</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-all"
                  title="Khôi phục mặc định"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Canvas Preview Box */}
            <div className="relative w-full h-[300px] bg-slate-950 border-2 border-slate-800 rounded-2xl p-3 overflow-hidden flex items-center justify-center mx-auto select-none">
              <div
                className="relative max-h-full max-w-full bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center"
                style={{
                  aspectRatio: width && height ? `${width} / ${height}` : '4/6',
                  height: '100%',
                }}
              >
                {/* Interactive Cutout Overlay Slots */}
                {slots.map((slot, idx) => {
                  const scaleX = 100 / (width || 1200);
                  const scaleY = 100 / (height || 1800);
                  const isSelected = selectedSlotIdx === idx;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedSlotIdx(idx)}
                      style={{
                        left: `${slot.x * scaleX}%`,
                        top: `${slot.y * scaleY}%`,
                        width: `${slot.width * scaleX}%`,
                        height: `${slot.height * scaleY}%`,
                      }}
                      className={`absolute border-2 cursor-pointer transition-all rounded-md flex items-center justify-center text-[10px] font-extrabold shadow-lg ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-500/40 text-white ring-2 ring-indigo-400/50 z-20'
                          : 'border-amber-400/80 bg-amber-500/20 text-amber-200 hover:border-amber-300 z-10'
                      }`}
                    >
                      Photo #{idx + 1}
                    </div>
                  );
                })}

                {/* Frame PNG Image Overlay */}
                {filePreview && (
                  <img
                    src={filePreview}
                    alt="Frame Overlay Preview"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none z-30 drop-shadow-md"
                  />
                )}
              </div>
            </div>

            {/* Manual Adjuster Controls for Selected Slot */}
            {slots[selectedSlotIdx] && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-[11px] font-bold text-indigo-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Manual Slot Adjuster: Photo #{selectedSlotIdx + 1}</span>
                  </span>
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(selectedSlotIdx)}
                      className="text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400">Position X (px)</label>
                    <input
                      type="number"
                      value={slots[selectedSlotIdx].x}
                      onChange={(e) => handleUpdateSlot(selectedSlotIdx, 'x', parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400">Position Y (px)</label>
                    <input
                      type="number"
                      value={slots[selectedSlotIdx].y}
                      onChange={(e) => handleUpdateSlot(selectedSlotIdx, 'y', parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400">Width (px)</label>
                    <input
                      type="number"
                      value={slots[selectedSlotIdx].width}
                      onChange={(e) => handleUpdateSlot(selectedSlotIdx, 'width', parseInt(e.target.value, 10) || 10)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400">Height (px)</label>
                    <input
                      type="number"
                      value={slots[selectedSlotIdx].height}
                      onChange={(e) => handleUpdateSlot(selectedSlotIdx, 'height', parseInt(e.target.value, 10) || 10)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono mt-0.5"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-2 border-t border-slate-800 pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Saving Frame...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{frame ? 'Update Frame Configuration' : 'Save & Publish Frame'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
