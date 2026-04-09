/**
 * Room Layout
 * 
 * Full-screen layout for video meeting rooms without sidebar.
 */

import { AuthGuard } from '@/components/auth-guard';

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      {children}
    </AuthGuard>
  );
}
