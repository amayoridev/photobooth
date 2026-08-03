'use client';

import { useState, useEffect } from 'react';
import { Settings, Check, RefreshCw, Type, Sliders, LayoutGrid, Palette, Shield } from 'lucide-react';
import { ISystemSettings } from '@/types';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<ISystemSettings>({
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
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (data.success) {
        setMessage('System settings & Watermark configuration saved successfully!');
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-6 rounded-3xl backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <span>System & Watermark Settings</span>
            <Settings className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Admin configuration for camera defaults, canvas watermark text, font size, position, and export quality.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Admin Watermark Configuration Block */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Global Watermark Configuration (Admin Only)</h2>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-indigo-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showWatermark}
                onChange={(e) => setSettings({ ...settings, showWatermark: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
              />
              <span>Enable Watermark Overlay</span>
            </label>
          </div>

          {settings.showWatermark ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Text Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Type className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Watermark Text</span>
                </label>
                <input
                  type="text"
                  value={settings.watermarkText}
                  onChange={(e) => setSettings({ ...settings, watermarkText: e.target.value })}
                  placeholder="e.g. Antigravity PhotoBooth"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Font Size Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs uppercase tracking-wider">
                  <label className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Font Size (Size Watermark)</span>
                  </label>
                  <span className="font-mono text-indigo-400 font-bold text-xs">{settings.watermarkSize || 30}px</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="64"
                  step="2"
                  value={settings.watermarkSize || 30}
                  onChange={(e) => setSettings({ ...settings, watermarkSize: parseInt(e.target.value, 10) })}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Position Selector */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Watermark Position</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {[
                    { id: 'bottom_right', label: 'Bottom Right' },
                    { id: 'bottom_center', label: 'Bottom Center' },
                    { id: 'bottom_left', label: 'Bottom Left' },
                    { id: 'top_right', label: 'Top Right' },
                    { id: 'top_left', label: 'Top Left' },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, watermarkPosition: pos.id as any })}
                      className={`py-2.5 px-3 rounded-xl border font-semibold text-center transition-all ${
                        (settings.watermarkPosition || 'bottom_right') === pos.id
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Presets */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Palette className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Watermark Text Color</span>
                </label>
                <div className="flex items-center gap-3">
                  {[
                    { color: '#ffffff', name: 'Pure White' },
                    { color: '#fbbf24', name: 'Golden Yellow' },
                    { color: '#ec4899', name: 'Neon Pink' },
                    { color: '#10b981', name: 'Mint Green' },
                    { color: '#06b6d4', name: 'Cyan Blue' },
                    { color: '#000000', name: 'Pitch Black' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setSettings({ ...settings, watermarkColor: c.color })}
                      style={{ backgroundColor: c.color }}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        (settings.watermarkColor || '#ffffff') === c.color ? 'border-indigo-500 scale-110 shadow-lg ring-2 ring-indigo-500/30' : 'border-slate-700'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic text-center py-2">
              Watermark overlay is disabled. Check the box above to enable watermark rendering on photo collages.
            </p>
          )}
        </div>

        {/* General System Defaults */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">Camera & Export Defaults</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Default Camera Countdown
              </label>
              <select
                value={settings.defaultCountdown}
                onChange={(e) => setSettings({ ...settings, defaultCountdown: Number(e.target.value) as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={3}>3 Seconds</option>
                <option value={5}>5 Seconds</option>
                <option value={10}>10 Seconds</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                JPEG Export Quality (0.5 to 1.0)
              </label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="1.0"
                value={settings.jpegQuality}
                onChange={(e) => setSettings({ ...settings, jpegQuality: parseFloat(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="flex items-center gap-3 text-xs font-semibold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showTimestamp}
                onChange={(e) => setSettings({ ...settings, showTimestamp: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
              />
              <span>Render Date & Time Stamp on Canvas Collages</span>
            </label>

            <label className="flex items-center gap-3 text-xs font-semibold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.defaultMirrorMode}
                onChange={(e) => setSettings({ ...settings, defaultMirrorMode: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
              />
              <span>Enable Camera Mirror Preview by Default</span>
            </label>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save System & Watermark Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
