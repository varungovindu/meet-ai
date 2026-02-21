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
  trustedOrigins: [
    getAuthUrl(),
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ].filter(Boolean) as string[],
});

export type Session = typeof auth.$Infer.Session;
