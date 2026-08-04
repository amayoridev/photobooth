'use client';

import { useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpenOnMobile, setIsOpenOnMobile] = useState<boolean>(false);
  const [isCollapsedOnDesktop, setIsCollapsedOnDesktop] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex overflow-x-hidden">
      {/* Sidebar Navigation */}
      <AdminSidebar
        isOpenOnMobile={isOpenOnMobile}
        onCloseMobile={() => setIsOpenOnMobile(false)}
        isCollapsedOnDesktop={isCollapsedOnDesktop}
        onToggleDesktopCollapse={() => setIsCollapsedOnDesktop(!isCollapsedOnDesktop)}
      />

      {/* Main Dashboard Workspace */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
        <AdminHeader onOpenMobileSidebar={() => setIsOpenOnMobile(true)} />
        <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto max-w-full">{children}</main>
      </div>
    </div>
  );
}
