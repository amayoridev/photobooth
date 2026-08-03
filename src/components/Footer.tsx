import Link from 'next/link';
import { Camera } from 'lucide-react';

interface FooterProps {
  footerText?: string;
  copyrightText?: string;
}

export function Footer({
  footerText = 'Digital PhotoBooth Platform — Capture, Frame, Share.',
  copyrightText = '© 2026 Antigravity Inc. All Rights Reserved.',
}: FooterProps) {
  return (
    <footer className="w-full bg-slate-950 border-t border-slate-900 py-8 px-4 sm:px-6 lg:px-8 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Camera className="w-4 h-4 text-indigo-400" />
          <span className="font-medium text-slate-300">{footerText}</span>
        </div>
        <div className="flex items-center space-x-6 text-xs text-slate-500">
          <span>{copyrightText}</span>
          <Link href="/admin/login" className="hover:text-slate-300 transition-colors">
            Admin Management
          </Link>
        </div>
      </div>
    </footer>
  );
}
