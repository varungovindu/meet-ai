/**
 * Meetings tRPC Router
 * 
 * Handles meeting operations (create, list, complete, update status, etc.)
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../root';
import { db } from '@/server/db';
import { meetings } from '@/server/db/schema';
import {
  getMeetingById,
  getMeetingsByUserId,
  completeMeetingAndGenerateSummary,
  updateMeetingTranscript,
  updateMeetingStatus,
  type MeetingStatus,
} from '@/server/services/meeting.service';

export const meetingsRouter = router({
  /**
   * Create a new meeting
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Meeting name is required').max(255),
        agentId: z.string().optional(),
        startTime: z.coerce.date().optional().default(() => new Date()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [meeting] = await db
        .insert(meetings)
        .values({
          name: input.name,
          userId: ctx.session.user.id,
          agentId: input.agentId || null,
          startTime: input.startTime,
          status: 'upcoming',
        })
        .returning();

      if (!meeting) {
        throw new Error('Failed to create meeting');
      }

      return meeting;
    }),

  /**
   * Get all meetings for current user
   */
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(['upcoming', 'active', 'processing', 'completed', 'cancelled']).optional(),
          limit: z.number().min(1).max(100).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return await getMeetingsByUserId(ctx.session.user.id, input);
    }),

  /**
   * Get a specific meeting by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const meeting = await getMeetingById(input.id);

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Verify ownership
      if (meeting.userId !== ctx.session.user.id) {
        throw new Error('Unauthorized');
      }

      return meeting;
    }),

  /**
   * Update meeting status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['upcoming', 'active', 'processing', 'completed', 'cancelled']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const meeting = await getMeetingById(input.id);
      if (!meeting || meeting.userId !== ctx.session.user.id) {
        throw new Error('Meeting not found');
      }

      const result = await updateMeetingStatus(input.id, input.status);

      if (!result.success) {
        throw new Error('error' in result ? result.error : 'Failed to update meeting status');
      }

      return { success: true };
    }),

  /**
   * Update meeting transcript
   */
  updateTranscript: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        transcript: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const meeting = await getMeetingById(input.id);
      if (!meeting || meeting.userId !== ctx.session.user.id) {
        throw new Error('Meeting not found');
      }

      const result = await updateMeetingTranscript(input.id, input.transcript);

      if (!result.success) {
        throw new Error('error' in result ? result.error : 'Failed to update transcript');
      }

      return { success: true };
    }),

  /**
   * Complete meeting and generate summary
   */
  completeMeeting: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const meeting = await getMeetingById(input.id);
      if (!meeting || meeting.userId !== ctx.session.user.id) {
        throw new Error('Meeting not found');
      }

      const result = await completeMeetingAndGenerateSummary(input.id);

      if (!result.success) {
        throw new Error('error' in result ? result.error : 'Failed to complete meeting');
      }

      return result.meeting;
    }),
});
