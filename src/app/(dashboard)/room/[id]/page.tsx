/**
 * Video Meeting Room
 *
 * Live video conferencing using Stream Video SDK with shared transcription.
 */

'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useSession } from '@/lib/auth-client';
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
  Copy,
  DoorOpen,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Smile,
  Sparkles,
  Subtitles,
  UserRound,
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
            <Sparkles size={18} />
            {isRecording ? 'Stop Transcript' : 'Start Transcript'}
          </button>
        ) : (
          <div className="flex h-14 items-center rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm text-slate-300">
            Host manages transcript
          </div>
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
  const { data: session } = useSession();
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
  const currentUserName = session?.user?.name || session?.user?.email || streamData?.userName || 'Participant';

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
  }, [client, meetingId, meeting?.isOwner]);

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

  if (!client || !call) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#dbeafe_0%,#e2e8f0_35%,#f8fafc_100%)] px-6">
        <div className="rounded-3xl border border-white/70 bg-white/85 px-8 py-10 text-center shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Meet AI</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-950">Preparing your meeting room</h1>
          <p className="mt-2 text-sm text-slate-600">Connecting video, transcript, and session controls...</p>
        </div>
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,#cbd5e1_0%,#e2e8f0_25%,#f8fafc_62%)] pb-32">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-6 lg:px-8">
            <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/85 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
              <div className="flex flex-col gap-6 border-b border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_50%,#0f766e_100%)] px-6 py-6 text-white lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100">
                    <Sparkles size={14} />
                    Smart meeting room
                  </div>
                  <h1 className="text-3xl font-semibold tracking-tight">{meeting?.name || 'Meeting Room'}</h1>
                  <p className="mt-2 max-w-xl text-sm text-slate-200">
                    {isHost
                      ? 'You are hosting this call. End the meeting when everyone is done to save the transcript and generate the summary.'
                      : 'You are joining as a participant. You can follow the live transcript here, and the saved summary will appear after the host finishes the meeting.'}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Role</p>
                    <p className="mt-2 text-sm font-semibold text-white">{isHost ? 'Host' : 'Guest'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Transcript</p>
                    <p className="mt-2 text-sm font-semibold text-white">{isRecording ? 'Live' : 'Standby'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-300">You</p>
                    <p className="mt-2 truncate text-sm font-semibold text-white">{currentUserName}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700">
                    <UserRound size={16} />
                    {isHost ? 'Host controls meeting actions' : 'Guest access to transcript and summary'}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700">
                    <Subtitles size={16} />
                    {transcriptStatus}
                  </span>
                </div>

                <button
                  onClick={handleCopyInviteLink}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
                  type="button"
                >
                  <Copy size={16} />
                  {copied ? 'Invite link copied' : 'Copy invite link'}
                </button>
              </div>
            </section>

            {roomError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                {roomError}
              </div>
            )}

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.22)]">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-white">
                  <div>
                    <p className="text-sm font-semibold">Live stage</p>
                    <p className="text-xs text-slate-300">Professional layout for everyone in the room</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                    {isHost ? 'Host session' : 'Participant session'}
                  </span>
                </div>
                <div className="h-[58vh] min-h-[420px] bg-black">
                  <SpeakerLayout />
                </div>
              </div>

              <aside className={`${showTranscriptPanel ? 'flex' : 'hidden'} flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)] xl:flex`}>
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-lg font-semibold text-slate-950">Meeting notes</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Everyone in the call can follow the live transcript. Saved notes appear after the meeting ends.
                  </p>
                </div>

                <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Status</p>
                    <p className="mt-2 text-sm font-medium text-slate-700">{transcriptStatus}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">After meeting</p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Transcript and summary stay available at `/meetings/{meetingId}` for invited participants too.
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden px-5 py-4">
                  <div className="h-full overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {liveTranscript || 'Spoken captions will appear here once the shared transcript starts.'}
                    </p>
                  </div>
                </div>
              </aside>
            </section>

            {showTranscriptPanel && (
              <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm xl:hidden">
                <h2 className="text-base font-semibold text-slate-950">Transcript</h2>
                <p className="mt-1 text-sm text-slate-500">{transcriptStatus}</p>
                <div className="mt-4 max-h-56 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {liveTranscript || 'Spoken captions will appear here once the shared transcript starts.'}
                  </p>
                </div>
              </section>
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
