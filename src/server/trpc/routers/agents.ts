/**
 * Agents tRPC Router
 * 
 * Handles AI agent CRUD operations.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../root';
import {
  createAgent,
  getAgentById,
  getAgentsByUserId,
  updateAgent,
  deleteAgent,
} from '@/server/services/agent.service';

export const agentsRouter = router({
  /**
   * Create a new AI agent
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required').max(255),
        instructions: z.string().min(1, 'Instructions are required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await createAgent({
        name: input.name,
        userId: ctx.session.user.id,
        instructions: input.instructions,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.agent;
    }),

  /**
   * Get all agents for current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getAgentsByUserId(ctx.session.user.id);
  }),

  /**
   * Get a specific agent by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const agent = await getAgentById(input.id, ctx.session.user.id);

      if (!agent) {
        throw new Error('Agent not found');
      }

      return agent;
    }),

  /**
   * Update an agent
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        instructions: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const result = await updateAgent(id, ctx.session.user.id, updateData);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.agent;
    }),

  /**
   * Delete an agent
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await deleteAgent(input.id, ctx.session.user.id);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete agent');
      }

      return { success: true };
    }),
});
