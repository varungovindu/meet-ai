'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from '@/lib/auth-client';

const navItems = [
  { href: '/meetings', label: 'Meetings' },
  { href: '/agents', label: 'Agents' },
  { href: '/ai-agent', label: 'Voice Agent' },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white px-4 py-6">
      <div className="mb-8">
        <Link href="/dashboard" className="block rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:bg-slate-50">
          <p className="text-lg font-bold text-slate-900">Meet-AI</p>
          <p className="text-xs text-slate-600">Smart Video Meetings</p>
        </Link>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-xl px-4 py-3 text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-slate-100 font-medium text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-6 left-4 right-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="truncate text-sm font-medium text-slate-900">{session?.user.name || 'User'}</p>
        <p className="truncate text-xs text-slate-600">{session?.user.email}</p>
        <button
          onClick={handleSignOut}
          className="mt-3 w-full rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900 transition-all duration-200 hover:bg-slate-200"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
