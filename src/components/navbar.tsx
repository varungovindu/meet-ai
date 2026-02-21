/**
 * Navbar Component
 * 
 * Global navigation bar with auth status.
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from '@/lib/auth-client';

export function Navbar() {
  const router = useRouter();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-slate-900">
              Meet-AI
            </Link>
            {session && (
              <div className="ml-10 flex gap-6">
                <Link
                  href="/dashboard"
                  className="text-slate-600 hover:text-slate-900"
                >
                  Dashboard
                </Link>
                <Link
                  href="/meetings"
                  className="text-slate-600 hover:text-slate-900"
                >
                  Meetings
                </Link>
                <Link
                  href="/agents"
                  className="text-slate-600 hover:text-slate-900"
                >
                  AI Agents
                </Link>
                <Link
                  href="/ai-agent"
                  className="text-slate-600 hover:text-slate-900"
                >
                  Voice Agent
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <span className="text-sm text-slate-600">
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-slate-900 transition-all duration-200 hover:bg-slate-200"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-slate-600 hover:text-slate-900"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-white transition-all duration-200 hover:bg-blue-700"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
