/**
 * tRPC Client Configuration
 * 
 * Client-side tRPC helper with type inference.
 * Use this to call tRPC procedures from React components.
 */

'use client';

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/trpc/router';

/**
 * Create tRPC React hooks with type inference
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Get base URL for tRPC API
 */
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser: use relative URL
    return '';
  }

  if (process.env.VERCEL_URL) {
    // SSR on Vercel: use Vercel URL
    return `https://${process.env.VERCEL_URL}`;
  }

  // SSR locally: use localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
