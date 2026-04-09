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
  PaginatedGridLayout,
  useCallStateHooks,
  useCall,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import {
  Copy,
  DoorOpen,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Smile,
  Subtitles,
  Video,
  VideoOff,
} from 'lucide-react';

function MeetingControls({
  isHost,
  showTranscriptPanel,
  setShowTranscriptPanel,
  isRecording,
  handleTranscriptToggle,
  handleLeaveOrEndMeeting,
  isEnding,
}: {
  isHost: boolean;
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

  const baseButton =
    'flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-200';

  return (
    <div className="fixed inset-x-4 bottom-4 z-30 md:inset-x-auto md:left-1/2 md:-translate-x-1/2">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-center gap-3 rounded-[28px] border border-slate-800/70 bg-slate-950/90 px-4 py-4 shadow-2xl backdrop-blur md:flex-nowrap md:px-5">
        <button
          onClick={() => microphone.toggle()}
          className={`${baseButton} ${
            isMute
              ? 'border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/20'
              : 'border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-600 hover:bg-slate-800'
          }`}
          type="button"
        >
          {isMute ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          onClick={() => camera.toggle()}
          className={`${baseButton} ${
            isCameraOff
              ? 'border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/20'
              : 'border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-600 hover:bg-slate-800'
          }`}
          type="button"
        >
          {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        <button
          onClick={handleScreenShare}
          className={`${baseButton} ${
            screenShareState?.isEnabled
              ? 'border-sky-400/40 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30'
              : 'border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-600 hover:bg-slate-800'
          }`}
          type="button"
        >
          <Monitor size={20} />
        </button>

        <button
          onClick={handleReaction}
          className={`${baseButton} border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-600 hover:bg-slate-800`}
          type="button"
        >
          <Smile size={20} />
        </button>

        <button
          onClick={() => setShowTranscriptPanel((prev) => !prev)}
          className="flex h-14 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-slate-100 transition-all duration-200 hover:border-slate-600 hover:bg-slate-800"
          type="button"
        >
          <Subtitles size={18} />
          {showTranscriptPanel ? 'Hide Transcript' : 'Show Transcript'}
        </button>

        {isHost ? (
          <button
            onClick={handleTranscriptToggle}
            className={`flex h-14 items-center gap-2 rounded-2xl border px-4 text-sm font-medium transition-all duration-200 ${
              isRecording
                ? 'border-red-500/40 bg-red-500/20 text-red-100 hover:bg-red-500/30'
                : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25'
            }`}
            type="button"
          >
            <Subtitles size={18} />
            {isRecording ? 'Stop Transcript' : 'Start Transcript'}
          </button>
        ) : (
          <button
            disabled
            className="flex h-14 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm text-slate-400 opacity-70"
            type="button"
          >
            <Subtitles size={18} />
            Transcript
          </button>
        )}

        <button
          onClick={handleLeaveOrEndMeeting}
          disabled={isEnding}
          className={`flex h-14 items-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 ${
            isHost ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
          }`}
          type="button"
        >
          {isHost ? <PhoneOff size={18} /> : <DoorOpen size={18} />}
          {isEnding ? (isHost ? 'Ending...' : 'Leaving...') : isHost ? 'End Meeting' : 'Leave Call'}
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
  const [now, setNow] = useState(() => Date.now());
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [liveTranscriptLines, setLiveTranscriptLines] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [showTranscriptPanel, setShowTranscriptPanel] = useState(true);
  const [transcriptStatus, setTranscriptStatus] = useState('Preparing shared transcript...');
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

  const isHost = Boolean(meeting?.isOwner);
  const scheduledStart = meeting?.startTime ? new Date(meeting.startTime).getTime() : null;
  const isLockedUntilStart = meeting?.status === 'upcoming' && scheduledStart !== null && scheduledStart > now;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

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
    if (!client || !meetingId || isLockedUntilStart) return;

    const videoCall = client.call('default', meetingId);
    activeCallRef.current = videoCall;
    let didCleanup = false;

    videoCall
      .join({ create: true })
      .then(() => {
        if (didCleanup) return;
        setCall(videoCall);
        if (meeting?.isOwner) {
          updateStatus.mutate({ id: meetingId, status: 'active' });
        }
      })
      .catch((error) => {
        if (didCleanup) return;
        console.error('Failed to join call:', error);
        setRoomError('Failed to join the call. Please refresh and try again.');
      });

    return () => {
      didCleanup = true;
      if (activeCallRef.current === videoCall) {
        activeCallRef.current = null;
      }
      videoCall.leave();
      setCall(null);
    };
  }, [client, isLockedUntilStart, meetingId, meeting?.isOwner]);

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
        setTranscriptStatus('Live transcript is running for everyone in the room.');
      }),
      call.on('call.transcription_stopped', () => {
        if (!mounted) return;
        setIsRecording(false);
        setTranscriptStatus('Transcript is paused. The host can start it again.');
      }),
      call.on('call.transcription_failed', () => {
        if (!mounted) return;
        setIsRecording(false);
        setTranscriptStatus('Transcript is unavailable right now.');
        if (isHost) {
          setRoomError('Stream transcription could not be started for this call.');
        }
      }),
    ];

    const startSharedTranscription = async () => {
      if (!isHost) {
        setTranscriptStatus('Waiting for the host to start shared transcript...');
        return;
      }

      try {
        await call.startTranscription({ enable_closed_captions: true });
      } catch (error) {
        if (isAlreadyTranscribingError(error)) {
          setIsRecording(true);
          setTranscriptStatus('Shared transcript is already active.');
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
  }, [call, isHost]);

  const handleLeaveOrEndMeeting = async () => {
    if (!call || isEnding) return;

    setIsEnding(true);
    setRoomError('');

    try {
      if (!isHost) {
        await call.leave();
        router.push(`/meetings/${meetingId}`);
        return;
      }

      const transcriptToSave = liveTranscript.trim();

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
      console.error('Failed to leave or end meeting:', error);
      setRoomError(isHost ? 'Could not end the meeting cleanly. Please try again.' : 'Could not leave the call cleanly. Please try again.');
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
      setRoomError('Could not copy the invite link. Please copy the URL from the browser bar.');
    }
  };

  const handleTranscriptToggle = async () => {
    if (!call || !isHost) return;

    setRoomError('');

    try {
      if (isRecording) {
        await call.stopTranscription();
      } else {
        await call.startTranscription({ enable_closed_captions: true });
      }
    } catch (error) {
      console.error('Failed to toggle transcription:', error);
      setRoomError('Could not change the transcript state for this meeting.');
    }
  };

  if (isLockedUntilStart && meeting?.startTime) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 px-6">
        <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 px-8 py-10 text-center shadow-xl">
          <h1 className="text-2xl font-semibold text-white">{meeting.name || 'Scheduled meeting'}</h1>
          <p className="mt-3 text-sm text-slate-300">This room will open at {new Date(meeting.startTime).toLocaleString()}.</p>
          <p className="mt-2 text-sm text-slate-400">
            {isHost ? 'You can start the call once the scheduled time begins.' : 'Please come back when the host starts the meeting.'}
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.push(`/meetings/${meetingId}`)}
              className="rounded-2xl bg-slate-800 px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-700"
              type="button"
            >
              Back to meeting
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!client || !call) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 px-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 px-8 py-10 text-center shadow-xl">
          <h1 className="text-2xl font-semibold text-white">Joining meeting...</h1>
          <p className="mt-2 text-sm text-slate-400">Connecting video and transcript.</p>
        </div>
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <main className="h-screen overflow-hidden bg-slate-950 text-white">
          <div className="flex h-full flex-col">
            <header className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 py-4 backdrop-blur md:px-6">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-white">{meeting?.name || 'Meeting Room'}</h1>
                <p className="mt-1 text-xs text-slate-400">{isHost ? 'Host' : 'Guest'}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-300 md:inline-flex">
                  {isRecording ? 'Transcript live' : transcriptStatus}
                </span>
                <button
                  onClick={handleCopyInviteLink}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition-all duration-200 hover:border-slate-700 hover:bg-slate-800"
                  type="button"
                >
                  <Copy size={16} />
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </header>

            {roomError && (
              <div className="shrink-0 border-b border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 md:px-6">
                {roomError}
              </div>
            )}

            <section className="min-h-0 flex-1 px-4 py-4 md:px-6">
              <div className={`grid h-full min-h-0 gap-4 ${showTranscriptPanel ? 'xl:grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'}`}>
                <div className="meeting-grid-stage min-h-0 overflow-hidden rounded-[28px] border border-slate-800 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                  <div className="h-full min-h-0 bg-black">
                    <PaginatedGridLayout groupSize={9} pageArrowsVisible />
                  </div>
                </div>

                <aside className={`${showTranscriptPanel ? 'hidden xl:flex' : 'hidden'} min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900`}>
                  <div className="shrink-0 border-b border-slate-800 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-semibold text-white">Transcript</h2>
                      <span className="text-xs text-slate-400">{isRecording ? 'Live' : 'Standby'}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{transcriptStatus}</p>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                      {liveTranscript || 'Transcript will appear here.'}
                    </p>
                  </div>
                </aside>
              </div>
            </section>

            {showTranscriptPanel && (
              <div className="pointer-events-none fixed inset-x-4 bottom-28 z-20 xl:hidden">
                <section className="pointer-events-auto rounded-[24px] border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur">
                  <div className="border-b border-slate-800 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-semibold text-white">Transcript</h2>
                      <span className="text-xs text-slate-400">{isRecording ? 'Live' : 'Standby'}</span>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                      {liveTranscript || 'Transcript will appear here.'}
                    </p>
                  </div>
                </section>
              </div>
            )}
          </div>

          <MeetingControls
            isHost={isHost}
            showTranscriptPanel={showTranscriptPanel}
            setShowTranscriptPanel={setShowTranscriptPanel}
            isRecording={isRecording}
            handleTranscriptToggle={handleTranscriptToggle}
            handleLeaveOrEndMeeting={handleLeaveOrEndMeeting}
            isEnding={isEnding}
          />
        </main>
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
