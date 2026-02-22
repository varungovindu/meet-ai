/**
 * AI tRPC Router
 * 
 * Handles AI interactions for voice agent mode.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../root';
import { generateAgentResponse } from '@/services/ai.service';
import { getAgentById } from '@/server/services/agent.service';
import { db } from '@/server/db';
import { aiAgentMessages } from '@/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';

export const aiRouter = router({
  /**
   * Get stored conversation history for an agent
   */
  getConversationHistory: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        limit: z.number().min(1).max(200).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const agent = await getAgentById(input.agentId, ctx.session.user.id);

      if (!agent) {
        throw new Error('Agent not found');
      }

      const rows = await db
        .select({
          id: aiAgentMessages.id,
          role: aiAgentMessages.role,
          content: aiAgentMessages.content,
          provider: aiAgentMessages.provider,
          createdAt: aiAgentMessages.createdAt,
        })
        .from(aiAgentMessages)
        .where(
          and(
            eq(aiAgentMessages.userId, ctx.session.user.id),
            eq(aiAgentMessages.agentId, input.agentId)
          )
        )
        .orderBy(desc(aiAgentMessages.createdAt))
        .limit(input.limit ?? 100);

      return [...rows]
        .reverse()
        .map((message) => ({
          id: message.id,
          role: message.role as 'user' | 'assistant',
          content: message.content,
          provider: (message.provider as 'groq' | 'ollama' | null) || undefined,
          createdAt: message.createdAt,
        }));
    }),

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

      const now = new Date();
      await db.insert(aiAgentMessages).values([
        {
          userId: ctx.session.user.id,
          agentId: input.agentId,
          role: 'user',
          content: input.userMessage,
          createdAt: now,
          updatedAt: now,
        },
        {
          userId: ctx.session.user.id,
          agentId: input.agentId,
          role: 'assistant',
          content: result.response,
          provider: result.provider,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      return {
        response: result.response,
        provider: result.provider,
      };
    }),
});
