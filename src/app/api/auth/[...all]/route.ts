/**
 * Better Auth API Route
 * 
 * Handles all authentication requests (login, signup, session, etc.)
 */

import { auth } from '@/server/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
