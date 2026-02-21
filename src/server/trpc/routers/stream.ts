/**
 * Stream tRPC Router
 * 
 * Handles Stream Video SDK token generation and call management.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../root';
import { generateStreamToken, createStreamUser } from '@/server/lib/stream';

export const streamRouter = router({
  /**
   * Get Stream token for authenticated user
   */
  getToken: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const userName = ctx.session.user.name || ctx.session.user.email;

    // Ensure user exists in Stream
    await createStreamUser(userId, userName);

    // Generate token
    const token = generateStreamToken(userId);

    return {
      token,
      apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY!,
      userId,
    };
  }),
});
