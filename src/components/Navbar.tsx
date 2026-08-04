'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Camera, Shield, Sparkles } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  appName?: string;
  logoUrl?: string;
}

export function Navbar({ appName: initialAppName, logoUrl: initialLogoUrl }: NavbarProps) {
  const [branding, setBranding] = useState<{ appName: string; logoUrl?: string }>({
    appName: initialAppName || 'Antigravity PhotoBooth',
    logoUrl: initialLogoUrl,
  });

  useEffect(() => {
    async function fetchBranding() {
      try {
        const res = await fetch('/api/branding');
        const data = await res.json();
        if (data.success && data.branding) {
          setBranding({
            appName: data.branding.appName || 'Antigravity PhotoBooth',
            logoUrl: data.branding.logoUrl || initialLogoUrl,
          });
        }
      } catch {}
    }
    fetchBranding();
  }, [initialLogoUrl]);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center overflow-hidden p-1">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.appName} className="w-full h-full object-contain" />
              ) : (
                <Camera className="w-5 h-5 text-indigo-400 group-hover:text-pink-400 transition-colors" />
              )}
            </div>
          </div>
          <span className="font-extrabold text-lg sm:text-xl bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight">
            {branding.appName}
          </span>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <Link
            href="/booth"
            className="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
            <span>Booth</span>
          </Link>

          <Link
            href="/admin/login"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-slate-700/50 transition-all"
            title="Admin Portal"
          >
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Admin</span>
          </Link>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
