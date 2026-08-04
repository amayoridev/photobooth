'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Image as ImageIcon,
  Camera,
  Palette,
  Settings,
  LogOut,
  Shield,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Frame Management', href: '/admin/frames', icon: ImageIcon },
  { label: 'Sessions & Logs', href: '/admin/sessions', icon: Camera },
  { label: 'Branding & Theme', href: '/admin/branding', icon: Palette },
  { label: 'System Settings', href: '/admin/settings', icon: Settings },
];

interface AdminSidebarProps {
  isOpenOnMobile: boolean;
  onCloseMobile: () => void;
  isCollapsedOnDesktop: boolean;
  onToggleDesktopCollapse: () => void;
}

export function AdminSidebar({
  isOpenOnMobile,
  onCloseMobile,
  isCollapsedOnDesktop,
  onToggleDesktopCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Auto close mobile drawer on route change
  useEffect(() => {
    onCloseMobile();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navContent = (isCollapsed: boolean) => (
    <div className="flex flex-col justify-between h-full p-4">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-slate-800 pb-4`}>
          <Link href="/admin" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shadow-md flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="font-bold text-sm text-white tracking-tight">Admin Portal</h2>
                <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Antigravity Suite</p>
              </div>
            )}
          </Link>

          {/* Close button for mobile drawer */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center ${
                  isCollapsed ? 'justify-center py-3' : 'space-x-3 px-3.5 py-2.5'
                } rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls */}
      <div className="pt-4 border-t border-slate-900 space-y-2">
        {/* Desktop Collapse Toggle */}
        <button
          onClick={onToggleDesktopCollapse}
          className="hidden lg:flex w-full items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-900 transition-all"
          title={isCollapsedOnDesktop ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {!isCollapsedOnDesktop && <span>Collapse Sidebar</span>}
          {isCollapsedOnDesktop ? (
            <ChevronRight className="w-4 h-4 mx-auto text-indigo-400" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Sign Out' : undefined}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center py-3' : 'space-x-3 px-3.5 py-2.5'
          } rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Mobile Drawer Backdrop & Slide-out (Screen < 1024px) */}
      {isOpenOnMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
          />
          <aside className="fixed inset-y-0 left-0 w-72 bg-slate-950 border-r border-slate-800 shadow-2xl z-50">
            {navContent(false)}
          </aside>
        </div>
      )}

      {/* 2. Desktop Collapsible Sidebar (Screen >= 1024px) */}
      <aside
        className={`hidden lg:flex flex-col justify-between bg-slate-950 border-r border-slate-800/80 min-h-screen transition-all duration-300 sticky top-0 h-screen ${
          isCollapsedOnDesktop ? 'w-20' : 'w-64'
        }`}
      >
        {navContent(isCollapsedOnDesktop)}
      </aside>
    </>
  );
}
