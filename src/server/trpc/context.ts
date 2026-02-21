/**
 * tRPC Context
 * 
 * Creates the context for all tRPC procedures.
 * Includes database connection and user session.
 */

import { db } from '@/server/db';
import { auth, type Session } from '@/server/lib/auth';

interface CreateContextOptions {
  headers: Headers;
}

/**
 * Create context for tRPC procedures
 * 
 * This context is available in all tRPC procedures and includes:
 * - db: Drizzle database instance
 * - session: User session from Better Auth (null if not authenticated)
 */
export async function createContext(opts: CreateContextOptions) {
  // Get session from Better Auth using request headers
  const session = await auth.api.getSession({
    headers: opts.headers,
  });

  return {
    db,
    session: session as Session | null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
