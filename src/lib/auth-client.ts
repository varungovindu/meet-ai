/**
 * Better Auth Client
 * 
 * Client-side authentication helper.
 */

import { createAuthClient } from 'better-auth/react';

// Get base URL - in browser, use current origin; in SSR, use env var
const getClientBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

export const authClient = createAuthClient({
  baseURL: getClientBaseUrl(),
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
