'use client';

import { useState, useEffect } from 'react';
import { Palette, Check, RefreshCw, Sparkles, Upload, Image as ImageIcon, Globe } from 'lucide-react';
import { IBrandingSettings } from '@/types';

export default function AdminBrandingPage() {
  const [branding, setBranding] = useState<IBrandingSettings>({
    appName: 'Antigravity PhotoBooth',
    logoUrl: '',
    faviconUrl: '',
    loadingScreenText: 'Get ready for your moment...',
    primaryColor: '#6366f1',
    secondaryColor: '#ec4899',
    accentColor: '#8b5cf6',
    footerText: 'Powered by Antigravity Digital PhotoBooth',
    copyrightText: '© 2026 Antigravity Inc. All Rights Reserved.',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadBranding() {
      try {
        const res = await fetch('/api/admin/branding');
        const data = await res.json();
        if (data.success && data.branding) {
          setBranding(data.branding);
          if (data.branding.logoUrl) {
            setLogoPreview(data.branding.logoUrl);
          }
        }
      } catch (err) {
        console.error('Failed to load branding:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadBranding();
  }, []);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('appName', branding.appName || '');
      formData.append('logoUrl', branding.logoUrl || '');
      formData.append('loadingScreenText', branding.loadingScreenText || '');
      formData.append('primaryColor', branding.primaryColor || '#6366f1');
      formData.append('secondaryColor', branding.secondaryColor || '#ec4899');
      formData.append('accentColor', branding.accentColor || '#8b5cf6');
      formData.append('footerText', branding.footerText || '');
      formData.append('copyrightText', branding.copyrightText || '');

      if (logoFile) {
        formData.append('logoFile', logoFile);
      }

      const res = await fetch('/api/admin/branding', {
        method: 'PUT',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setBranding(data.branding);
        if (data.branding.logoUrl) {
          setLogoPreview(data.branding.logoUrl);
        }
        setMessage('Custom Branding settings updated successfully!');
        setTimeout(() => setMessage(null), 3500);
      }
    } catch (err) {
      console.error('Failed to save branding:', err);
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
            <span>Branding & Visual Appearance</span>
            <Palette className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload custom brand logo, change app title, brand colors, and copyright footer text.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        {/* App Title & Logo Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Application Title Name
            </label>
            <input
              type="text"
              required
              value={branding.appName}
              onChange={(e) => setBranding({ ...branding, appName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Upload Custom Logo Image (PNG / JPG)
            </label>
            <div className="flex items-center gap-3">
              {logoPreview ? (
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 p-1 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 p-1 flex items-center justify-center text-slate-600 shrink-0">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}

              <label className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>{logoFile ? logoFile.name : 'Choose Logo File...'}</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={handleLogoFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Brand Theme Colors */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Brand Theme Color Palette</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                Secondary Accent
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={branding.secondaryColor}
                  onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                  className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.secondaryColor}
                  onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                Glow Accent
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={branding.accentColor}
                  onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                  className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.accentColor}
                  onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer & Loading Screen Text */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Footer Text
            </label>
            <input
              type="text"
              value={branding.footerText}
              onChange={(e) => setBranding({ ...branding, footerText: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Copyright Notice
            </label>
            <input
              type="text"
              value={branding.copyrightText}
              onChange={(e) => setBranding({ ...branding, copyrightText: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Custom Branding</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
