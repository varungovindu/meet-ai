/**
 * AI tRPC Router
 * 
 * Handles AI interactions for voice agent mode.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../root';
import { generateAgentResponse } from '@/services/ai.service';
import { getAgentById } from '@/server/services/agent.service';

export const aiRouter = router({
  /**
   * Generate AI voice agent response
   */
  generateVoiceResponse: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        userMessage: z.string().min(1),
        conversationHistory: z
          .array(
            z.object({
              role: z.enum(['user', 'assistant']),
              content: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get agent
      const agent = await getAgentById(input.agentId, ctx.session.user.id);

      if (!agent) {
        throw new Error('Agent not found');
      }

      const normalizedHistory = input.conversationHistory?.map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content as string,
      }));

      // Generate response using Ollama
      const result = await generateAgentResponse(
        input.userMessage,
        agent.instructions,
        normalizedHistory
      );

      if (!result.success) {
        throw new Error('error' in result ? result.error : 'Failed to generate AI response');
      }

      return {
        response: result.response,
        provider: result.provider,
      };
    }),
});
