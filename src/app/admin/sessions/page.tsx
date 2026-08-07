'use client';

import { useState, useEffect, useCallback } from 'react';
import { ISession } from '@/types';
import { formatDate } from '@/lib/utils';
import {
  Camera,
  Search,
  Trash2,
  Download,
  ExternalLink,
  Clock,
  RefreshCw,
  Eye,
  CheckSquare,
  Square,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<ISession[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewingSession, setViewingSession] = useState<ISession | null>(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
      });
      const res = await fetch(`/api/admin/sessions?${query}`);
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === sessions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sessions.map((s) => s._id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected sessions and their files from R2?`)) return;

    try {
      const res = await fetch('/api/admin/sessions/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionIds: selectedIds }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedIds([]);
        fetchSessions();
      }
    } catch (err) {
      console.error('Bulk delete error:', err);
    }
  };

  const handleExpireSession = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/sessions/${id}/expire`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        fetchSessions();
      }
    } catch (err) {
      console.error('Failed to expire session:', err);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session and remove files from R2?')) return;
    try {
      const res = await fetch(`/api/admin/sessions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchSessions();
      }
    } catch (err) {
      console.error('Delete session error:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <span>Session Records & Logs</span>
            <Camera className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search session tokens, view metrics, download high-res files, expire links, or bulk delete.
          </p>
        </div>

        {selectedIds.length > 0 && (
          <button
            onClick={handleBulkDelete}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg flex items-center gap-2 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Bulk Delete ({selectedIds.length})</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search QR token, download token, or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          onClick={fetchSessions}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Sessions Table */}
      {isLoading ? (
        <div className="py-24 text-center flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-xs text-slate-400 font-semibold">Loading session records...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 space-y-2">
          <Camera className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No session records found.</p>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4 w-10 text-center">
                    <button onClick={handleSelectAll}>
                      {selectedIds.length === sessions.length ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">Preview</th>
                  <th className="p-4">Session Tokens</th>
                  <th className="p-4">Layout</th>
                  <th className="p-4">Downloads / Scans</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sessions.map((session) => {
                  const isSelected = selectedIds.includes(session._id);
                  const isExpired = session.expiresAt && new Date() > new Date(session.expiresAt);

                  return (
                    <tr key={session._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-center">
                        <button onClick={() => handleToggleSelect(session._id)}>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>

                      <td className="p-4">
                        <div
                          onClick={() => setViewingSession(session)}
                          className="w-12 h-16 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={session.finalImageUrl}
                            alt="Final Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="font-mono font-bold text-indigo-300">QR: {session.qrToken}</p>
                          <p className="font-mono text-[10px] text-slate-500">DL: {session.downloadToken}</p>
                        </div>
                      </td>

                      <td className="p-4 capitalize font-semibold text-slate-300">
                        {session.layout?.replace('_', ' ') || 'Standard'}
                      </td>

                      <td className="p-4">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-bold text-[10px] mr-2">
                            {session.downloadCount} Downloads
                          </span>
                          <span className="inline-block px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 font-bold text-[10px]">
                            {session.scanCount} Scans
                          </span>
                        </div>
                      </td>

                      <td className="p-4 text-slate-400">
                        <div>
                          <p>{formatDate(session.createdAt)}</p>
                          {isExpired && (
                            <span className="text-[10px] font-bold text-rose-400">Expired</span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingSession(session)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400"
                            title="Inspect Session"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <a
                            href={`/share/${session.qrToken}`}
                            target="_blank"
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400"
                            title="View Public Share Page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => handleExpireSession(session._id)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-amber-400"
                            title="Expire Link Immediately"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteSession(session._id)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400"
                            title="Delete Session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total sessions)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Session Inspector Modal */}
      {viewingSession && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-lg text-white">Session Inspector</h3>
              </div>
              <button
                onClick={() => setViewingSession(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">📸 Composite Photo</p>
              <div className="aspect-[4/6] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden p-2 flex items-center justify-center">
                <img
                  src={viewingSession.finalImageUrl}
                  alt="Final Composite"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-400">QR: {viewingSession.qrToken}</span>
              <a
                href={`/share/${viewingSession.qrToken}`}
                target="_blank"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5"
              >
                <span>Open Public Page</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
