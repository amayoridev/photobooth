import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Camera, Sparkles, QrCode, Image as ImageIcon, Zap, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-white selection:bg-indigo-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/30 via-purple-600/30 to-pink-500/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-8 z-10">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border border-slate-800 backdrop-blur-md text-xs font-semibold text-indigo-300 shadow-xl">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>Digital-Only Studio PhotoBooth Platform</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400">
            Capture. Frame. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Share Instantly.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed font-normal">
            A modern, digital-only PhotoBooth application. Capture browser photos, overlay custom designer frames, render high-res collages, and download instantly via QR code.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/booth"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:scale-105 active:scale-95 text-white font-bold text-base shadow-2xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-3 group"
            >
              <Camera className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
              <span>Start PhotoBooth</span>
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/admin/login"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-semibold text-sm border border-slate-800 backdrop-blur-md transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span>Admin Management</span>
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="relative max-w-6xl mx-auto mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 px-4 z-10">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Browser Camera Suite</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Front & rear camera switching, mirror mode toggle, 3/5/10s countdowns, flash visual animation, and shutter sound feedback.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Custom Frames & Layouts</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Transparent PNG frame overlays, single photo, 2-photo, 4-photo grid, film strip, and polaroid layout modes.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Instant QR Code Sharing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cloudflare R2 image storage with instant high-resolution QR codes, public share links, and download counters.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
