/**
 * Video Meeting Room
 *
 * Live video conferencing using Stream Video SDK with shared transcription.
 */

'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
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
        await screenShareState.screenShare.disable();
      } else {
        await screenShareState?.screenShare.enable();
      }
    } catch (error) {
      console.error('Screen share error:', error);
    }
  };

  const handleReaction = () => {
    try {
      call?.sendReaction({ type: 'emoji', emoji_code: 'wave' });
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

function isAlreadyTranscribingError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes('already') && message.includes('transcription');
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
  const [liveTranscriptLines, setLiveTranscriptLines] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [showTranscriptPanel, setShowTranscriptPanel] = useState(true);
  const [transcriptStatus, setTranscriptStatus] = useState('Preparing live transcript...');
  const activeCallRef = useRef<Call | null>(null);

  const liveTranscript = useMemo(() => liveTranscriptLines.join('\n'), [liveTranscriptLines]);

  const { data: streamData } = trpc.stream.getToken.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
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
        name: streamData.userName || streamData.userId,
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
    activeCallRef.current = videoCall;
    let didCleanup = false;

    videoCall
      .join({ create: true })
      .then(() => {
        if (didCleanup) return;
        setCall(videoCall);
        setTranscriptStatus('Connecting to shared meeting transcript...');
        updateStatus.mutate({ id: meetingId, status: 'active' });
      })
      .catch((error) => {
        if (didCleanup) return;
        console.error('Failed to join call:', error);
        setRoomError('Failed to join call. Please refresh and try again.');
      });

    return () => {
      didCleanup = true;
      if (activeCallRef.current === videoCall) {
        activeCallRef.current = null;
      }
      videoCall.leave();
      setCall(null);
    };
  }, [client, meetingId]);

  useEffect(() => {
    if (!call) return;

    let mounted = true;

    const unsubscribers = [
      call.on('call.closed_caption', (event) => {
        const caption = event.closed_caption;
        const speaker = caption.user?.name || caption.user?.id || caption.speaker_id || 'Speaker';
        const line = `[${formatClock(caption.start_time)}] ${speaker}: ${caption.text}`;

        if (!mounted || !caption.text?.trim()) {
          return;
        }

        setLiveTranscriptLines((prev) => {
          if (prev[prev.length - 1] === line) {
            return prev;
          }

          return [...prev, line];
        });
      }),
      call.on('call.transcription_started', () => {
        if (!mounted) return;
        setIsRecording(true);
        setTranscriptStatus('Live transcript is running for everyone in the meeting.');
      }),
      call.on('call.transcription_stopped', () => {
        if (!mounted) return;
        setIsRecording(false);
        setTranscriptStatus('Transcript stopped. Restart it if you still need captions.');
      }),
      call.on('call.transcription_failed', () => {
        if (!mounted) return;
        setIsRecording(false);
        setTranscriptStatus('Stream transcription is unavailable right now.');
        setRoomError('Stream transcription could not be started for this call.');
      }),
    ];

    const startSharedTranscription = async () => {
      try {
        await call.startTranscription({ enable_closed_captions: true });
      } catch (error) {
        if (isAlreadyTranscribingError(error)) {
          setIsRecording(true);
          setTranscriptStatus('Live transcript is already active for this meeting.');
          return;
        }

        console.error('Failed to start transcription:', error);
        setTranscriptStatus('Automatic transcript could not start.');
        setRoomError('Automatic meeting transcription is not available. Check Stream transcription settings.');
      }
    };

    startSharedTranscription();

    return () => {
      mounted = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [call]);

  const handleLeaveOrEndMeeting = async () => {
    if (!call || isEnding) return;
    setIsEnding(true);
    setRoomError('');
    const transcriptToSave = liveTranscript.trim();

    try {
      if (isRecording) {
        try {
          await call.stopTranscription();
        } catch (error) {
          console.error('Failed to stop transcription cleanly:', error);
        }
      }

      if (transcriptToSave) {
        await updateTranscript.mutateAsync({
          id: meetingId,
          transcript: transcriptToSave,
        });
      }

      try {
        await call.endCall();
      } catch {
        await call.leave();
      }

      await completeMeeting.mutateAsync({ id: meetingId });

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

  const handleTranscriptToggle = async () => {
    if (!call) return;

    setRoomError('');

    try {
      if (isRecording) {
        await call.stopTranscription();
      } else {
        await call.startTranscription({ enable_closed_captions: true });
      }
    } catch (error) {
      console.error('Failed to toggle transcription:', error);
      setRoomError('Could not change the transcription state for this meeting.');
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
        <div className="relative flex min-h-screen flex-col bg-slate-100">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-slate-900">{meeting?.name || 'Meeting Room'}</h1>
              <p className="text-xs text-slate-500">Live conference session</p>
            </div>
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

          <div className="flex-1 px-4 pb-32 pt-4 md:px-6 lg:px-8">
            <div
              className={`mx-auto grid h-[calc(100vh-11rem)] w-full max-w-[1440px] gap-4 ${
                showTranscriptPanel ? 'grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'
              }`}
            >
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-xl">
                <SpeakerLayout />
              </div>

              {showTranscriptPanel && (
                <aside className="hidden h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:block">
                  <h3 className="mb-1 text-base font-semibold text-slate-900">Live Transcript</h3>
                  <p className="mb-3 text-xs text-slate-500">{transcriptStatus}</p>
                  <div className="h-[calc(100%-3.25rem)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="whitespace-pre-wrap text-sm text-slate-700">
                      {liveTranscript || 'Spoken captions will appear here once Stream transcription starts.'}
                    </p>
                  </div>
                </aside>
              )}
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
            <aside className="fixed inset-x-4 bottom-24 z-20 max-h-52 rounded-2xl border border-slate-200 bg-white p-3 shadow-md xl:hidden">
              <h3 className="mb-1 text-sm font-semibold text-slate-900">Live Transcript</h3>
              <p className="mb-2 text-[11px] text-slate-500">{transcriptStatus}</p>
              <div className="h-[calc(100%-2.75rem)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                <p className="whitespace-pre-wrap text-xs text-slate-700">
                  {liveTranscript || 'Spoken captions will appear here once Stream transcription starts.'}
                </p>
              </div>
            </aside>
          )}
        </div>
      </StreamCall>
    </StreamVideo>
  );
}

function formatClock(value?: string) {
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
