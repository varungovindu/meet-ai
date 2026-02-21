/**
 * tRPC Root Configuration
 * 
 * Initializes tRPC and creates reusable procedures.
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { type Context } from './context';

/**
 * Initialize tRPC with context
 */
const t = initTRPC.context<Context>().create();

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 * 
 * Automatically checks if user is authenticated.
 * Throws UNAUTHORIZED error if session is missing.
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});
