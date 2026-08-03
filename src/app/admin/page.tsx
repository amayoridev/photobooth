'use client';

import { useState, useEffect } from 'react';
import { StatCard } from '@/components/admin/StatCard';
import { AnalyticsCharts } from '@/components/admin/AnalyticsCharts';
import { Camera, Image as ImageIcon, Download, QrCode, HardDrive, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <span>System Analytics Overview</span>
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time statistics for photo sessions, Cloudflare R2 storage, downloads & frame popularity.
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-24 text-center flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-xs text-slate-400 font-semibold">Loading dashboard metrics...</p>
        </div>
      ) : stats ? (
        <>
          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
              title="Total Sessions"
              value={stats.totalSessions}
              subtitle="All time captures"
              icon={Camera}
              color="indigo"
            />
            <StatCard
              title="Today's Sessions"
              value={stats.todaySessions}
              subtitle="Captured today"
              icon={Sparkles}
              color="emerald"
            />
            <StatCard
              title="Active Frames"
              value={stats.activeFrames}
              subtitle="Visible to users"
              icon={ImageIcon}
              color="purple"
            />
            <StatCard
              title="Total Downloads"
              value={stats.totalDownloads}
              subtitle="Photo saves"
              icon={Download}
              color="cyan"
            />
            <StatCard
              title="QR Scans"
              value={stats.totalScans}
              subtitle="Mobile redirects"
              icon={QrCode}
              color="pink"
            />
            <StatCard
              title="Storage Growth"
              value={`${stats.estimatedStorageMB} MB`}
              subtitle="Estimated R2 usage"
              icon={HardDrive}
              color="amber"
            />
          </div>

          {/* SVG Analytics Charts */}
          <AnalyticsCharts dailySessions={stats.dailySessions} popularFrames={stats.popularFrames} />

          {/* Quick Management Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <Link
              href="/admin/frames"
              className="p-5 bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition-all group"
            >
              <h4 className="font-bold text-sm text-white group-hover:text-indigo-400 flex items-center justify-between">
                <span>Manage Photo Frames</span>
                <ImageIcon className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
              </h4>
              <p className="text-xs text-slate-400 mt-1">Upload PNG overlays, toggle visibility & reorder frames.</p>
            </Link>

            <Link
              href="/admin/sessions"
              className="p-5 bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition-all group"
            >
              <h4 className="font-bold text-sm text-white group-hover:text-indigo-400 flex items-center justify-between">
                <span>Session Records & Logs</span>
                <Camera className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
              </h4>
              <p className="text-xs text-slate-400 mt-1">Search, expire, download raw photos or bulk delete sessions.</p>
            </Link>

            <Link
              href="/admin/branding"
              className="p-5 bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition-all group"
            >
              <h4 className="font-bold text-sm text-white group-hover:text-indigo-400 flex items-center justify-between">
                <span>Branding & Appearance</span>
                <Sparkles className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
              </h4>
              <p className="text-xs text-slate-400 mt-1">Update app title, logo URL, footer text & primary colors.</p>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
