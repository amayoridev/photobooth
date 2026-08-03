'use client';

import { useState } from 'react';
import { X, Copy, Check, Download, Sparkles, ExternalLink, Link2, Globe } from 'lucide-react';

interface QRCodeModalProps {
  qrToken: string;
  downloadToken: string;
  finalImageUrl: string;
  expiresAt?: string;
  onClose: () => void;
}

export function QRCodeModal({
  qrToken,
  downloadToken,
  finalImageUrl,
  expiresAt,
  onClose,
}: QRCodeModalProps) {
  const [qrMode, setQrMode] = useState<'r2' | 'share'>('r2'); // Default to Direct R2 link as requested
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const sharePageUrl = `${origin}/share/${qrToken}`;
  const directR2Url = finalImageUrl.startsWith('http://') || finalImageUrl.startsWith('https://')
    ? finalImageUrl
    : `${origin}${finalImageUrl}`;

  const currentUrl = qrMode === 'r2' ? directR2Url : sharePageUrl;
  const qrImageSrc = qrMode === 'r2'
    ? `/api/qr/${qrToken}?direct=true`
    : `/api/qr/${qrToken}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col items-center gap-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Scan to Download</span>
          </div>
          <h3 className="text-2xl font-bold text-white">Your Photo is Ready!</h3>
          <p className="text-xs text-slate-400">
            Scan this QR code with any camera or phone to view/download your photo.
          </p>
        </div>

        {/* Mode Toggle Switch: Direct R2 Link vs Web Share Page */}
        <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-2xl w-full text-xs font-semibold">
          <button
            onClick={() => setQrMode('r2')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              qrMode === 'r2'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Direct R2 Link</span>
          </button>
          <button
            onClick={() => setQrMode('share')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              qrMode === 'share'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Share Page</span>
          </button>
        </div>

        {/* QR Code Graphic Box */}
        <div className="relative p-4 bg-white rounded-2xl shadow-xl border-4 border-indigo-500/20 group">
          <img
            src={qrImageSrc}
            alt="Photo Share QR Code"
            className="w-52 h-52 object-contain"
          />
        </div>

        {/* Share Link Copy Field */}
        <div className="w-full flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5 pl-3">
          <span className="text-xs font-mono text-slate-400 truncate flex-1">{currentUrl}</span>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Action Links */}
        <div className="w-full flex items-center gap-3">
          <a
            href={`/api/download/${downloadToken}`}
            download
            className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Direct Download</span>
          </a>

          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Link</span>
          </a>
        </div>
      </div>
    </div>
  );
}
