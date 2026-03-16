/**
 * Video Meeting Room
 *
 * Live video conferencing using Stream Video SDK.
 */

'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  Call,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Smile,
  Monitor,
  PhoneOff,
} from 'lucide-react';

function MeetingControls({
  showTranscriptPanel,
  setShowTranscriptPanel,
  isRecording,
  handleTranscriptToggle,
  handleLeaveOrEndMeeting,
  isEnding,
}: {
  showTranscriptPanel: boolean;
  setShowTranscriptPanel: (value: boolean | ((prev: boolean) => boolean)) => void;
  isRecording: boolean;
  handleTranscriptToggle: () => void;
  handleLeaveOrEndMeeting: () => void;
  isEnding: boolean;
}) {
  const { useMicrophoneState, useCameraState, useScreenShareState } = useCallStateHooks();
  const { microphone, isMute } = useMicrophoneState();
  const { camera, isMute: isCameraOff } = useCameraState();
  const screenShareState = useScreenShareState();
  const call = useCall();

  const handleScreenShare = async () => {
    try {
      if (screenShareState?.isEnabled) {
        await screenShareState?.screenShare.disable();
      } else {
        await screenShareState?.screenShare.enable();
      }
    } catch (error) {
      console.error('Screen share error:', error);
    }
  };

  const handleReaction = () => {
    // Send emoji reaction through call
    try {
      call?.sendReaction({ type: 'emoji', emoji_code: '👋' });
    } catch (error) {
      console.error('Reaction error:', error);
    }
  };

  return (
    <div className="meeting-dock fixed bottom-6 left-1/2 z-30 -translate-x-1/2 transition-all duration-200 ease-in-out hover:scale-105">
      <div className="flex items-center gap-4 rounded-full border border-slate-200 bg-white px-6 py-3 shadow-md">
        <button
          onClick={() => microphone.toggle()}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 transition-all duration-200 hover:bg-slate-200"
        >
          {isMute ? (
            <MicOff size={20} className="text-red-600" />
          ) : (
            <Mic size={20} className="text-slate-700" />
          )}
        </button>

        <button
          onClick={() => camera.toggle()}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 transition-all duration-200 hover:bg-slate-200"
        >
          {isCameraOff ? (
            <VideoOff size={20} className="text-red-600" />
          ) : (
            <Video size={20} className="text-slate-700" />
          )}
        </button>

        <button 
          onClick={handleReaction}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 transition-all duration-200 hover:bg-slate-200"
        >
          <Smile size={20} className="text-slate-700" />
        </button>

        <button 
          onClick={handleScreenShare}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
            screenShareState?.isEnabled ? 'bg-blue-500 hover:bg-blue-600' : 'bg-slate-100 hover:bg-slate-200'
          }`}
          type="button"
        >
          <Monitor size={20} className={screenShareState?.isEnabled ? 'text-white' : 'text-slate-700'} />
        </button>

        <div className="mx-2 h-8 w-px bg-slate-200" />

        <button
          onClick={() => setShowTranscriptPanel((prev) => !prev)}
          className="h-10 rounded-full bg-slate-100 px-4 text-sm font-medium text-slate-900 transition-all duration-200 hover:bg-slate-200"
        >
          {showTranscriptPanel ? 'Hide Transcript' : 'Show Transcript'}
        </button>

        <button
          onClick={handleTranscriptToggle}
          className={`h-10 rounded-full px-4 text-sm font-medium transition-all duration-200 ${
            isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
          }`}
        >
          {isRecording ? 'Stop Transcript' : 'Start Transcript'}
        </button>

        <button
          onClick={handleLeaveOrEndMeeting}
          disabled={isEnding}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 transition-all duration-200 hover:bg-red-600 disabled:opacity-60"
        >
          <PhoneOff size={20} className="text-white" />
        </button>
      </div>
    </div>
  );
}

export default function MeetingRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: meetingId } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [showTranscriptPanel, setShowTranscriptPanel] = useState(true);

  const { data: streamData } = trpc.stream.getToken.useQuery();
  const { data: meeting } = trpc.meetings.getById.useQuery({ id: meetingId });
  const updateStatus = trpc.meetings.updateStatus.useMutation();
  const updateTranscript = trpc.meetings.updateTranscript.useMutation();
  const completeMeeting = trpc.meetings.completeMeeting.useMutation();

  useEffect(() => {
    if (!streamData) return;

    const videoClient = new StreamVideoClient({
      apiKey: streamData.apiKey,
      user: {
        id: streamData.userId,
        name: streamData.userId,
      },
      token: streamData.token,
    });

    setClient(videoClient);

    return () => {
      videoClient.disconnectUser();
      setClient(null);
    };
  }, [streamData]);

  useEffect(() => {
    if (!client || !meetingId) return;

    const videoCall = client.call('default', meetingId);

    videoCall
      .join({ create: true })
      .then(() => {
        setCall(videoCall);
        updateStatus.mutate({ id: meetingId, status: 'active' });
      })
      .catch((error) => {
        console.error('Failed to join call:', error);
        setRoomError('Failed to join call. Please refresh and try again.');
      });

    return () => {
      videoCall.leave();
      setCall(null);
    };
  }, [client, meetingId]);

  const handleLeaveOrEndMeeting = async () => {
    if (!call || isEnding) return;
    setIsEnding(true);
    setRoomError('');

    try {
      if ((window as any).currentRecognition) {
        (window as any).currentRecognition.stop();
      }
      setIsRecording(false);

      const hasTranscript = transcript.trim().length > 0;

      if (hasTranscript) {
        await updateTranscript.mutateAsync({
          id: meetingId,
          transcript,
        });
      }

      try {
        await call.endCall();
      } catch {
        await call.leave();
      }

      try {
        await completeMeeting.mutateAsync({ id: meetingId });
      } catch (error) {
        console.error('Failed to complete meeting on end:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to generate summary automatically. You can add transcript and generate summary from meeting details.';
        setRoomError(errorMessage);
      }

      router.push(`/meetings/${meetingId}`);
    } catch (error) {
      console.error('Failed to end meeting:', error);
      setRoomError('Could not end meeting cleanly. Please try again.');
      setIsEnding(false);
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      const inviteLink = `${window.location.origin}/room/${meetingId}`;
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Copy link failed:', error);
      setRoomError('Could not copy link. Please copy URL from the browser bar.');
    }
  };

  const handleStartTranscript = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcriptPart + ' ';
        }
      }

      if (final) {
        setTranscript((prev) => prev + final);
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    setIsRecording(true);
    (window as any).currentRecognition = recognition;
  };

  const handleStopTranscript = () => {
    if ((window as any).currentRecognition) {
      (window as any).currentRecognition.stop();
    }
    setIsRecording(false);
  };

  const handleTranscriptToggle = () => {
    if (isRecording) {
      handleStopTranscript();
    } else {
      handleStartTranscript();
    }
  };

  if (!client || !call) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading meeting room...</p>
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <div className="relative flex min-h-screen flex-col bg-slate-50">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-6">
            <h1 className="truncate text-lg font-semibold text-slate-900">{meeting?.name || 'Meeting Room'}</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyInviteLink}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all duration-200 hover:bg-slate-200"
              >
                {copied ? 'Copied!' : 'Copy meeting link'}
              </button>
              <button
                onClick={handleLeaveOrEndMeeting}
                disabled={isEnding}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-red-600 disabled:opacity-60"
              >
                {isEnding ? 'Leaving...' : 'Leave'}
              </button>
            </div>
          </div>

          {roomError && (
            <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {roomError}
            </div>
          )}

          <div className="flex-1 px-8 pb-32 pt-6">
            <div className="mx-auto h-full max-w-6xl rounded-xl bg-black shadow-md">
              <div className="h-full overflow-hidden rounded-xl">
                <SpeakerLayout />
              </div>
            </div>
          </div>

          <MeetingControls
            showTranscriptPanel={showTranscriptPanel}
            setShowTranscriptPanel={setShowTranscriptPanel}
            isRecording={isRecording}
            handleTranscriptToggle={handleTranscriptToggle}
            handleLeaveOrEndMeeting={handleLeaveOrEndMeeting}
            isEnding={isEnding}
          />

          {showTranscriptPanel && (
            <aside className="fixed right-6 top-24 z-20 h-[calc(100vh-9rem)] w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-base font-semibold text-slate-900">Live Transcript</h3>
              <div className="h-[calc(100%-2.5rem)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="whitespace-pre-wrap text-sm text-slate-700">
                  {transcript || 'Transcript will appear here once started.'}
                </p>
              </div>
            </aside>
          )}
        </div>
      </StreamCall>
    </StreamVideo>
  );
}
