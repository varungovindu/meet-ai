/**
 * Dashboard Layout
 * 
 * Protected layout for authenticated pages.
 */

import { AuthGuard } from '@/components/auth-guard';
import { AppSidebar } from '@/components/app-sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        <AppSidebar />
        <main className="ml-64 min-h-screen overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
