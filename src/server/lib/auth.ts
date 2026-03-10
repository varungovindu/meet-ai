/**
 * Better Auth Configuration
 * 
 * Handles authentication for the application.
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/server/db';
import { users, sessions, accounts, verifications } from '@/server/db/schema';
import { getAuthUrl } from '@/lib/env';

function toOrigin(input?: string): string | undefined {
  if (!input) return undefined;

  const value = input.trim();
  if (!value) return undefined;

  try {
    const withProtocol = value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`;
    return new URL(withProtocol).origin;
  } catch {
    return undefined;
  }
}

function getTrustedOrigins(): string[] {
  const candidates = [
    getAuthUrl(),
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ];

  const origins = new Set<string>();
  for (const candidate of candidates) {
    const origin = toOrigin(candidate);
    if (origin) {
      origins.add(origin);
    }
  }

  // Allow any Vercel deployment hostname for this app (preview/share/prod).
  origins.add('https://*.vercel.app');

  return Array.from(origins);
}

export const auth = betterAuth({
  baseURL: getAuthUrl(),
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    camelCase: true,
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: getTrustedOrigins(),
});

export type Session = typeof auth.$Infer.Session;
