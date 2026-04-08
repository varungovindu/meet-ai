/**
 * Stream Webhook Handler
 *
 * Receives webhook events for completed Stream assets and syncs them
 * into the meetings table.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  completeMeetingAndGenerateSummary,
  updateMeetingArtifacts,
} from '@/server/services/meeting.service';

export const runtime = 'nodejs';

type StreamWebhookBody = {
  type?: string;
  call_cid?: string;
  call?: {
    id?: string;
  };
  call_transcription?: {
    url?: string;
  };
  recording?: {
    url?: string;
  };
};

type TranscriptLine = {
  start_time?: string;
  end_time?: string;
  speaker_id?: string;
  text?: string;
  user?: {
    id?: string;
    name?: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StreamWebhookBody;

    const meetingId = resolveMeetingId(body);

    console.log('Stream webhook received:', {
      type: body.type,
      meetingId,
      callCid: body.call_cid,
      callId: body.call?.id,
    });

    if (!meetingId) {
      return NextResponse.json({ success: true, ignored: true });
    }

    switch (body.type) {
      case 'call.transcription_ready': {
        const transcriptUrl = body.call_transcription?.url;

        if (!transcriptUrl) {
          return NextResponse.json({ success: true, ignored: true });
        }

        const transcriptText = await fetchAndFormatTranscript(transcriptUrl);

        if (!transcriptText) {
          console.error('Transcript file was empty or unreadable:', transcriptUrl);
          return NextResponse.json({ success: false }, { status: 500 });
        }

        await updateMeetingArtifacts(meetingId, {
          transcriptUrl,
          transcript: transcriptText,
          status: 'processing',
          endTime: new Date(),
        });

        await completeMeetingAndGenerateSummary(meetingId);
        break;
      }

      case 'call.recording_ready': {
        if (body.recording?.url) {
          await updateMeetingArtifacts(meetingId, {
            recordingUrl: body.recording.url,
          });
        }
        break;
      }

      default:
        console.log('Unhandled webhook type:', body.type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

function resolveMeetingId(body: StreamWebhookBody): string | null {
  const candidates = [body.call?.id, body.call_cid];

  for (const value of candidates) {
    if (!value) continue;

    if (value.includes(':')) {
      return value.split(':').pop() || null;
    }

    return value;
  }

  return null;
}

async function fetchAndFormatTranscript(url: string): Promise<string> {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to fetch transcript file: ${response.status} ${response.statusText}`);
  }

  const rawText = await response.text();
  const entries = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as TranscriptLine;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is TranscriptLine => Boolean(entry));

  return formatTranscript(entries);
}

function formatTranscript(transcript: TranscriptLine[]): string {
  return transcript
    .map((entry) => {
      const speaker = entry.user?.name || entry.user?.id || entry.speaker_id || 'Unknown speaker';
      const text = entry.text?.trim() || '';
      const timestamp = formatTimestamp(entry.start_time);

      if (!text) {
        return null;
      }

      return `[${timestamp}] ${speaker}: ${text}`;
    })
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

function formatTimestamp(value?: string): string {
  if (!value) {
    return '--:--';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}
