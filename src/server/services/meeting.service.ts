/**
 * Meeting Service
 * 
 * Handles business logic for meeting operations including:
 * - Meeting completion
 * - Summary generation
 * - Status updates
 * 
 * This service uses Drizzle ORM and should be called from tRPC procedures or API routes.
 */

import { db } from '@/server/db';
import { meetings } from '@/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateMeetingSummary } from '@/services/ai.service';

// Types
export type MeetingStatus = 'upcoming' | 'active' | 'processing' | 'completed' | 'cancelled';
export type Meeting = typeof meetings.$inferSelect;

export interface CompleteMeetingResult {
  success: true;
  meeting: {
    id: string;
    summary: string;
    status: MeetingStatus;
  };
}

export interface CompleteMeetingError {
  success: false;
  error: string;
  code: 'NOT_FOUND' | 'NO_TRANSCRIPT' | 'AI_FAILED' | 'UPDATE_FAILED' | 'UNKNOWN';
}

/**
 * Complete a meeting and generate summary from transcript
 * 
 * This is the main workflow for post-meeting processing:
 * 1. Validate meeting exists
 * 2. Update status to "processing" when transcript exists
 * 3. Generate AI summary
 * 4. Save summary and mark as "completed"
 *
 * Note: This function is intentionally idempotent and can be called again
 * to regenerate summaries after transcript updates.
 */
export async function completeMeetingAndGenerateSummary(
  meetingId: string
): Promise<CompleteMeetingResult | CompleteMeetingError> {
  try {
    // Step 1: Fetch meeting from database
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .limit(1);

    // Step 2: Validate meeting exists
    if (!meeting) {
      return {
        success: false,
        error: 'Meeting not found',
        code: 'NOT_FOUND',
      };
    }

    // Step 3: Handle missing transcript with fallback summary
    if (!meeting.transcript || meeting.transcript.trim().length === 0) {
      const [updatedMeeting] = await db
        .update(meetings)
        .set({
          summary: 'Meeting completed. No transcript was captured, so a detailed AI summary is unavailable.',
          status: 'completed',
          endTime: meeting.endTime ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(meetings.id, meetingId))
        .returning({
          id: meetings.id,
          summary: meetings.summary,
          status: meetings.status,
        });

      if (!updatedMeeting) {
        return {
          success: false,
          error: 'Failed to finalize meeting without transcript',
          code: 'UPDATE_FAILED',
        };
      }

      return {
        success: true,
        meeting: {
          id: updatedMeeting.id,
          summary: updatedMeeting.summary!,
          status: updatedMeeting.status as MeetingStatus,
        },
      };
    }

    // Step 4: Update status to "processing"
    await db
      .update(meetings)
      .set({
        status: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId));

    // Step 5: Generate summary using AI service
    const summaryResult = await generateMeetingSummary(meeting.transcript);

    // Step 6: Handle AI generation result
    if (!summaryResult.success) {
      const [updatedMeeting] = await db
        .update(meetings)
        .set({
          summary: `Meeting completed, but AI summary generation failed. ${'error' in summaryResult ? summaryResult.error : 'Unknown AI error.'}`,
          status: 'completed',
          endTime: meeting.endTime ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(meetings.id, meetingId))
        .returning({
          id: meetings.id,
          summary: meetings.summary,
          status: meetings.status,
        });

      if (!updatedMeeting) {
        return {
          success: false,
          error: 'Failed to save meeting after AI summary error',
          code: 'UPDATE_FAILED',
        };
      }

      return {
        success: true,
        meeting: {
          id: updatedMeeting.id,
          summary: updatedMeeting.summary!,
          status: updatedMeeting.status as MeetingStatus,
        },
      };
    }

    // Step 7: Save summary and mark as completed
    const [updatedMeeting] = await db
      .update(meetings)
      .set({
        summary: summaryResult.summary,
        status: 'completed',
        endTime: meeting.endTime ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId))
      .returning({
        id: meetings.id,
        summary: meetings.summary,
        status: meetings.status,
      });

    // Step 8: Validate update succeeded
    if (!updatedMeeting) {
      return {
        success: false,
        error: 'Failed to update meeting with summary',
        code: 'UPDATE_FAILED',
      };
    }

    return {
      success: true,
      meeting: {
        id: updatedMeeting.id,
        summary: updatedMeeting.summary!,
        status: updatedMeeting.status as MeetingStatus,
      },
    };
  } catch (error) {
    // Handle unexpected errors
    console.error('Error in completeMeetingAndGenerateSummary:', error);

    // Try to mark meeting as cancelled
    try {
      await db
        .update(meetings)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(meetings.id, meetingId));
    } catch (updateError) {
      console.error('Failed to update meeting status to cancelled:', updateError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      code: 'UNKNOWN',
    };
  }
}

/**
 * Get meeting by ID
 */
export async function getMeetingById(
  meetingId: string
): Promise<Meeting | null> {
  try {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .limit(1);

    return meeting || null;
  } catch (error) {
    console.error('Error fetching meeting:', error);
    return null;
  }
}

/**
 * Get meetings by user ID
 */
export async function getMeetingsByUserId(
  userId: string,
  options?: {
    status?: MeetingStatus;
    limit?: number;
  }
): Promise<Meeting[]> {
  try {
    const conditions = [eq(meetings.userId, userId)];

    // Apply status filter if provided
    if (options?.status) {
      conditions.push(eq(meetings.status, options.status));
    }

    const result = await db
      .select()
      .from(meetings)
      .where(and(...conditions))
      .orderBy(desc(meetings.startTime))
      .limit(options?.limit || 100);

    return result;
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return [];
  }
}

/**
 * Update meeting transcript
 * 
 * This should be called when a meeting ends and transcript is ready
 */
export async function updateMeetingTranscript(
  meetingId: string,
  transcript: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!transcript || transcript.trim().length === 0) {
      return {
        success: false,
        error: 'Transcript cannot be empty',
      };
    }

    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .limit(1);

    if (!meeting) {
      return {
        success: false,
        error: 'Meeting not found',
      };
    }

    await db
      .update(meetings)
      .set({
        transcript: transcript.trim(),
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId));

    return { success: true };
  } catch (error) {
    console.error('Error updating transcript:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update transcript',
    };
  }
}

/**
 * Update meeting transcript/recording artifacts captured by Stream.
 */
export async function updateMeetingArtifacts(
  meetingId: string,
  updates: {
    transcript?: string;
    transcriptUrl?: string;
    recordingUrl?: string;
    status?: MeetingStatus;
    endTime?: Date;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const [meeting] = await db
      .select({ id: meetings.id })
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .limit(1);

    if (!meeting) {
      return {
        success: false,
        error: 'Meeting not found',
      };
    }

    const payload: Partial<typeof meetings.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (typeof updates.transcript === 'string') {
      payload.transcript = updates.transcript.trim();
    }

    if (typeof updates.transcriptUrl === 'string') {
      payload.transcriptUrl = updates.transcriptUrl;
    }

    if (typeof updates.recordingUrl === 'string') {
      payload.recordingUrl = updates.recordingUrl;
    }

    if (updates.status) {
      payload.status = updates.status;
    }

    if (updates.endTime) {
      payload.endTime = updates.endTime;
    }

    await db
      .update(meetings)
      .set(payload)
      .where(eq(meetings.id, meetingId));

    return { success: true };
  } catch (error) {
    console.error('Error updating meeting artifacts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update meeting artifacts',
    };
  }
}

/**
 * Update meeting status
 */
export async function updateMeetingStatus(
  meetingId: string,
  status: MeetingStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .limit(1);

    if (!meeting) {
      return {
        success: false,
        error: 'Meeting not found',
      };
    }

    const updates: {
      status: MeetingStatus;
      updatedAt: Date;
      endTime?: Date;
    } = {
      status,
      updatedAt: new Date(),
    };

    if ((status === 'completed' || status === 'cancelled') && !meeting.endTime) {
      updates.endTime = new Date();
    }

    await db
      .update(meetings)
      .set(updates)
      .where(eq(meetings.id, meetingId));

    return { success: true };
  } catch (error) {
    console.error('Error updating meeting status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update status',
    };
  }
}

/**
 * Delete meeting by ID
 */
export async function deleteMeetingById(
  meetingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const [meeting] = await db
      .select({ id: meetings.id })
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .limit(1);

    if (!meeting) {
      return {
        success: false,
        error: 'Meeting not found',
      };
    }

    await db.delete(meetings).where(eq(meetings.id, meetingId));

    return { success: true };
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete meeting',
    };
  }
}
