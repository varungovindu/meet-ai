/**
 * tRPC API Route Handler
 * 
 * Handles all tRPC requests using the fetch adapter.
 * Works with Next.js 15 App Router.
 */

import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc/router';
import { createContext } from '@/server/trpc/context';

// Force Node.js runtime (required for tRPC)
export const runtime = 'nodejs';

/**
 * Handle GET and POST requests
 */
const handler = (req: Request) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: ({ req }) => createContext({ headers: req.headers }),
  });
};

export { handler as GET, handler as POST };
