'use client';

import { useState, useEffect, useRef } from 'react';
import { IFrame, LayoutMode } from '@/types';
import { Sparkles, Layers, Check, Search, Pin, Loader2 } from 'lucide-react';

interface FrameSelectorProps {
  frames: IFrame[];
  onSelectFrame: (frame: IFrame) => void;
}

const CATEGORIES = ['All', 'General', 'Wedding', 'Birthday', 'Party', 'Vintage', 'Minimal', 'Imported'];
const LAYOUT_TABS: { label: string; mode: LayoutMode | 'all' | 'pinned' }[] = [
  { label: 'All Layouts (Tất cả)', mode: 'all' },
  { label: '📌 Pinned (Nổi bật)', mode: 'pinned' },
  { label: '1 Photo (1 Ảnh)', mode: 'single' },
  { label: '2 Photos (2 Ảnh)', mode: 'two_photo' },
  { label: '3 Photos (3 Strip)', mode: 'three_photo' },
  { label: '4 Photos (4 Strip)', mode: 'vertical_strip' },
  { label: '4 Grid (4 Lưới)', mode: 'four_grid' },
  { label: 'Polaroid', mode: 'polaroid' },
];

const BATCH_SIZE = 30;

export function FrameSelector({ frames, onSelectFrame }: FrameSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLayout, setSelectedLayout] = useState<LayoutMode | 'all' | 'pinned'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);

  // Lazy Load / Infinite Scroll State (Default load 30 frames)
  const [visibleCount, setVisibleCount] = useState<number>(BATCH_SIZE);
  const observerTargetRef = useRef<HTMLDivElement | null>(null);

  // Reset visible batch count to 30 whenever filters change
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [selectedCategory, selectedLayout, searchQuery]);

  // Filter frames based on user selection
  const filteredFrames = frames.filter((frame) => {
    const matchCategory = selectedCategory === 'All' || frame.category === selectedCategory;
    const matchLayout =
      selectedLayout === 'all'
        ? true
        : selectedLayout === 'pinned'
        ? !!frame.isPinned
        : frame.layoutMode === selectedLayout;
    const matchSearch =
      frame.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      frame.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchLayout && matchSearch;
  });

  // Slice visible frames to reduce initial rendering & network load
  const visibleFrames = filteredFrames.slice(0, visibleCount);
  const hasMore = visibleCount < filteredFrames.length;

  // IntersectionObserver for Auto Infinite Scroll as user scrolls down
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredFrames.length));
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
  }, [hasMore, filteredFrames.length]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Choose Your Aesthetic</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Select a Photo Frame
        </h1>
        <p className="text-sm text-slate-400">
          Pick your favorite custom overlay before launching the live camera session.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl backdrop-blur-md">
        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto py-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search frames..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Layout Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {LAYOUT_TABS.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => setSelectedLayout(tab.mode)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedLayout === tab.mode
                ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Frame Grid */}
      {filteredFrames.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800">
          <p className="text-slate-400 font-medium">No frames found matching your selected filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleFrames.map((frame) => {
              const isSelected = activeFrameId === frame._id;

              return (
                <div
                  key={frame._id}
                  onClick={() => setActiveFrameId(frame._id)}
                  className={`group relative bg-slate-900/90 border rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-2xl shadow-indigo-500/20 scale-[1.02]'
                      : frame.isPinned
                      ? 'border-amber-500/50 shadow-amber-500/5 hover:border-amber-500'
                      : 'border-slate-800 hover:border-slate-700 hover:shadow-xl'
                  }`}
                >
                  {/* Frame Preview Image Card */}
                  <div className="relative aspect-[4/5] w-full bg-slate-950 p-4 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

                    <img
                      src={frame.thumbnailUrl || frame.frameUrl}
                      alt={frame.name}
                      loading="lazy"
                      className="w-full h-full object-contain relative z-10 drop-shadow-xl group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Layout & Aspect Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20">
                      {frame.isPinned && (
                        <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md">
                          <Pin className="w-3 h-3 fill-slate-950" />
                          <span>Pinned</span>
                        </span>
                      )}
                      <span className="bg-slate-950/80 backdrop-blur-md text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {frame.layoutMode.replace('_', ' ')}
                      </span>
                      <span className="bg-slate-950/80 backdrop-blur-md text-slate-300 border border-slate-800 text-[10px] font-bold px-2 py-1 rounded-full">
                        {frame.aspectRatio}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-indigo-600 text-white p-1.5 rounded-full shadow-lg z-20">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Card Info & Select Button */}
                  <div className="p-5 bg-slate-900 border-t border-slate-800/80 flex flex-col gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                        <span>{frame.name}</span>
                        {frame.isPinned && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {frame.description || 'Custom digital photo frame design.'}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFrame(frame);
                      }}
                      className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                          : frame.isPinned
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md hover:brightness-110'
                          : 'bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white'
                      }`}
                    >
                      <span>Use This Frame</span>
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Infinite Scroll Auto-Load Sentinel & Indicator */}
          <div ref={observerTargetRef} className="py-6 flex flex-col items-center justify-center gap-3">
            {hasMore ? (
              <button
                onClick={() => setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredFrames.length))}
                className="px-5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
              >
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                <span>Loading more frames... ({visibleFrames.length} / {filteredFrames.length})</span>
              </button>
            ) : (
              <p className="text-xs text-slate-500 font-mono">
                Showing all {filteredFrames.length} frames
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
