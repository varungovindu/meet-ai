/**
 * Stream Webhook Handler
 * 
 * Receives webhooks from Stream Video SDK for:
 * - Call recording completed
 * - Transcription completed
 * - Call ended events
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateMeetingTranscript, completeMeetingAndGenerateSummary } from '@/server/services/meeting.service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Verify webhook signature (production requirement)
    // const signature = req.headers.get('x-signature');
    // if (!verifySignature(signature, body)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const { type, call, transcript } = body;

    console.log('Stream webhook received:', { type, callId: call?.id });

    switch (type) {
      case 'call.transcription_ready':
        // Handle transcript ready event
        if (call?.id && transcript) {
          const transcriptText = formatTranscript(transcript);
          
          await updateMeetingTranscript(call.id, transcriptText);
          
          // Optionally auto-generate summary
          // await completeMeetingAndGenerateSummary(call.id);
        }
        break;

      case 'call.ended':
        // Handle call ended event
        if (call?.id) {
          console.log('Call ended:', call.id);
          // Could trigger summary generation if transcript exists
        }
        break;

      case 'call.recording_ready':
        // Handle recording ready event
        if (call?.id && body.recording?.url) {
          console.log('Recording ready:', body.recording.url);
          // Could store recording URL in database
        }
        break;

      default:
        console.log('Unhandled webhook type:', type);
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

/**
 * Format transcript array into readable text
 */
function formatTranscript(transcript: any[]): string {
  if (!Array.isArray(transcript)) {
    return String(transcript);
  }

  return transcript
    .map((entry) => {
      const speaker = entry.user?.name || entry.user?.id || 'Unknown';
      const text = entry.text || '';
      const timestamp = entry.start_time
        ? new Date(entry.start_time).toLocaleTimeString()
        : '';
      return `[${timestamp}] ${speaker}: ${text}`;
    })
    .join('\n');
}

/**
 * Verify webhook signature (implement in production)
 */
function verifySignature(signature: string | null, body: any): boolean {
  // TODO: Implement signature verification using Stream secret
  // This is crucial for production to prevent unauthorized webhook calls
  return true; // Disabled for development
}
