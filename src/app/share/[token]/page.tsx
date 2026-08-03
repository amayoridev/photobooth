'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Download, Sparkles, Eye, Clock, AlertTriangle, Share2, Check, Copy } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function SharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [session, setSession] = useState<{
    id: string;
    frameName: string;
    finalImageUrl: string;
    downloadToken: string;
    downloadCount: number;
    scanCount: number;
    expiresAt?: string;
    createdAt: string;
  } | null>(null);

  const [branding, setBranding] = useState<{ appName: string }>({ appName: 'Antigravity PhotoBooth' });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!token) return;

    async function loadShareDetails() {
      try {
        const res = await fetch(`/api/share/${token}`);
        const data = await res.json();

        if (!data.success) {
          setError(data.error || 'Photo not found or link has expired.');
        } else {
          setSession(data.session);
          if (data.branding) setBranding(data.branding);
        }
      } catch (err) {
        setError('Failed to fetch photo session.');
      } finally {
        setIsLoading(false);
      }
    }

    loadShareDetails();
  }, [token]);

  const handleShareLinkCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100">
      <Navbar appName={branding.appName} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center gap-8">
        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-400">Fetching high-res photo...</p>
          </div>
        ) : error ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md text-center space-y-4 shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold text-white">Photo Unavailable</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          </div>
        ) : session ? (
          <>
            {/* Header Title */}
            <div className="text-center space-y-2 max-w-lg">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{session.frameName}</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white">Your PhotoBooth Moment</h1>
              <p className="text-xs text-slate-400">
                Created on {formatDate(session.createdAt)}
              </p>
            </div>

            {/* Main Photo Card */}
            <div className="relative w-full max-w-md aspect-[4/6] bg-slate-900 rounded-3xl border-2 border-slate-800 p-4 shadow-2xl overflow-hidden flex items-center justify-center">
              <img
                src={session.finalImageUrl}
                alt="PhotoBooth Memories"
                className="w-full h-full object-contain rounded-2xl drop-shadow-2xl"
              />
            </div>

            {/* Metrics Bar */}
            <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-around text-xs backdrop-blur-md">
              <div className="flex items-center gap-2 text-slate-300">
                <Download className="w-4 h-4 text-indigo-400" />
                <span><strong className="text-white">{session.downloadCount}</strong> Downloads</span>
              </div>
              <div className="h-4 w-px bg-slate-800" />
              <div className="flex items-center gap-2 text-slate-300">
                <Eye className="w-4 h-4 text-purple-400" />
                <span><strong className="text-white">{session.scanCount}</strong> QR Scans</span>
              </div>
              {session.expiresAt && (
                <>
                  <div className="h-4 w-px bg-slate-800" />
                  <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Expires {formatDate(session.expiresAt)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Download & Share Actions */}
            <div className="w-full max-w-md flex flex-col sm:flex-row items-center gap-3">
              <a
                href={`/api/download/${session.downloadToken}`}
                download
                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:scale-105 active:scale-95 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Photo</span>
              </a>

              <button
                onClick={handleShareLinkCopy}
                className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-800 transition-all flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied Link</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-indigo-400" />
                    <span>Share Link</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
