'use client';

import { User, Bell, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface AdminHeaderProps {
  adminEmail?: string;
  adminName?: string;
}

export function AdminHeader({ adminEmail = 'admin@photobooth.com', adminName = 'Administrator' }: AdminHeaderProps) {
  return (
    <header className="w-full h-16 bg-slate-950/60 border-b border-slate-800/80 px-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <span className="text-xs font-semibold text-slate-400">Status:</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          System Operational
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <Link
          href="/"
          target="_blank"
          className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-all"
        >
          <span>View Live Booth</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>

        <div className="flex items-center space-x-3 border-l border-slate-800 pl-4">
          <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xs">
            {adminName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-white">{adminName}</p>
            <p className="text-[10px] text-slate-400">{adminEmail}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
