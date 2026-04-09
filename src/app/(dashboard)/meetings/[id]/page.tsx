/**
 * Meeting Detail Page
 *
 * Shows details of a specific meeting and allows completing it.
 */

'use client';

import { use, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

type DetailTab = 'summary' | 'transcript' |  'productivity' | 'ask-ai';
type MeetingAnswer = {
  question: string;
  answer: string;
  provider?: string;
};
type MeetingProductivity = {
  overview: string;
  decisions: string[];
  actionItems: Array<{
    owner: string;
    task: string;
    deadline: string;
  }>;
  followUps: string[];
  followUpDraft: string;
  provider?: string;
};
type GoogleCalendarMeeting = {
  name: string;
  startTime: Date | string;
  endTime?: Date | string | null;
  summary?: string | null;
};

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [transcript, setTranscript] = useState('');
  const [isUpdatingTranscript, setIsUpdatingTranscript] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('summary');
  const [askInput, setAskInput] = useState('');
  const [answers, setAnswers] = useState<MeetingAnswer[]>([]);
  const [productivity, setProductivity] = useState<MeetingProductivity | null>(null);
  const [notionUrl, setNotionUrl] = useState('');
  const [actionError, setActionError] = useState('');

  const utils = trpc.useUtils();
  const queryOptions = useMemo(
    () => ({
      refetchInterval: (query: { state: { data?: { status?: string } } }) =>
        query.state.data?.status === 'processing' ? 4000 : false,
      refetchOnWindowFocus: true,
    }),
    []
  );
  const { data: meeting, isLoading } = trpc.meetings.getById.useQuery({ id }, queryOptions);

  const updateTranscript = trpc.meetings.updateTranscript.useMutation({
    onSuccess: () => {
      utils.meetings.getById.invalidate({ id });
      setIsUpdatingTranscript(false);
      setActionError('');
    },
    onError: (error) => {
      setActionError(error.message || 'Failed to save transcript');
    },
  });

  const completeMeeting = trpc.meetings.completeMeeting.useMutation({
    onSuccess: () => {
      utils.meetings.getById.invalidate({ id });
      utils.meetings.list.invalidate();
      setActiveTab('summary');
      setActionError('');
    },
    onError: (error) => {
      setActionError(error.message || 'Failed to generate summary');
    },
  });

  const updateStatus = trpc.meetings.updateStatus.useMutation({
    onSuccess: () => {
      utils.meetings.getById.invalidate({ id });
      utils.meetings.list.invalidate();
      setActionError('');
    },
    onError: (error) => {
      setActionError(error.message || 'Failed to update meeting status');
    },
  });

  const deleteMeeting = trpc.meetings.delete.useMutation({
    onSuccess: () => {
      utils.meetings.list.invalidate();
      router.push('/meetings');
    },
  });
  const askMeeting = trpc.ai.askMeeting.useMutation({
    onSuccess: (result) => {
      setAnswers((prev) => [
        ...prev,
        {
          question: askInput.trim(),
          answer: result.answer,
          provider: result.provider,
        },
      ]);
      setAskInput('');
      setActionError('');
    },
    onError: (error) => {
      setActionError(error.message || 'Failed to get meeting answer');
    },
  });
  const getMeetingProductivity = trpc.ai.getMeetingProductivity.useMutation({
    onSuccess: (result) => {
      setProductivity({
        ...result.insights,
        provider: result.provider,
      });
      setActionError('');
    },
    onError: (error) => {
      setActionError(error.message || 'Failed to generate productivity insights');
    },
  });
  const pushMeetingToNotion = trpc.ai.pushMeetingToNotion.useMutation({
    onSuccess: (result) => {
      setNotionUrl(result.url || '');
      setActionError('');
    },
    onError: (error) => {
      setActionError(error.message || 'Failed to push meeting to Notion');
    },
  });

  const handleSaveTranscript = () => {
    if (!transcript.trim()) return;
    updateTranscript.mutate({ id, transcript });
  };

  const handleComplete = () => {
    setActionError('');
    if (confirm('Generate AI summary for this meeting?')) {
      completeMeeting.mutate({ id });
    }
  };

  const handleDelete = () => {
    setActionError('');
    if (confirm('Delete this meeting permanently? This cannot be undone.')) {
      deleteMeeting.mutate({ id });
    }
  };

  const handleCopyLink = async () => {
    try {
      const inviteLink = `${window.location.origin}/room/${id}`;
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Copy invite link failed:', error);
    }
  };

  const handleAskMeeting = () => {
    const question = askInput.trim();
    if (!question) return;

    setActionError('');
    askMeeting.mutate({
      meetingId: id,
      question,
    });
  };

  const handleExportSummary = () => {
    if (!meeting.summary) return;

    downloadTextFile(`${slugify(exportMeeting.name)}-summary.md`, buildSummaryExport(exportMeeting));
  };

  const handleExportReport = () => {
    downloadTextFile(`${slugify(exportMeeting.name)}-report.md`, buildMeetingReport(exportMeeting));
  };

  const handleGenerateProductivity = () => {
    setActionError('');
    getMeetingProductivity.mutate({ meetingId: id });
  };

  const handlePushToNotion = () => {
    setActionError('');
    pushMeetingToNotion.mutate({ meetingId: id });
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-8 py-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-slate-600">Loading meeting...</p>
        </div>
      </main>
    );
  }

  if (!meeting) {
    return (
      <main className="min-h-screen bg-slate-50 px-8 py-6">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-slate-900">Meeting not found</p>
          <Link href="/meetings" className="text-blue-600 hover:text-blue-700">
            ← Back to meetings
          </Link>
        </div>
      </main>
    );
  }

  const isOwner = Boolean(meeting.isOwner);
  const meetingStartTime = new Date(meeting.startTime);
  const isScheduledForFuture = meeting.status === 'upcoming' && meetingStartTime.getTime() > Date.now();
  const canGenerateSummary = Boolean(meeting.transcript?.trim()) && meeting.status !== 'processing';
  const exportMeeting = {
    name: meeting.name ?? 'Meeting',
    startTime: meeting.startTime ?? new Date().toISOString(),
    endTime: meeting.endTime ?? null,
    status: meeting.status ?? 'completed',
    summary: meeting.summary ?? '',
    transcript: meeting.transcript ?? '',
  };
  const googleCalendarUrl = buildGoogleCalendarUrl(exportMeeting);

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/meetings" className="inline-block text-blue-600 transition-all duration-200 hover:text-blue-700">
          ← Back to meetings
        </Link>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {actionError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {actionError}
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{meeting.name}</h1>
              <p className="mt-2 text-sm text-slate-500">{meetingStartTime.toLocaleString()}</p>
              {isScheduledForFuture && (
                <p className="mt-2 text-sm text-amber-600">This meeting will unlock at the scheduled time.</p>
              )}
            </div>
            <span
              className={`rounded-xl px-3 py-1 text-sm font-medium ${
                meeting.status === 'completed'
                  ? 'bg-green-100 text-green-600'
                  : meeting.status === 'active'
                  ? 'bg-blue-100 text-blue-600'
                  : meeting.status === 'processing'
                  ? 'bg-yellow-100 text-yellow-600'
                  : meeting.status === 'cancelled'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {meeting.status}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {meeting.status === 'upcoming' && isOwner && !isScheduledForFuture && (
              <>
                <button
                  onClick={() => updateStatus.mutate({ id, status: 'active' })}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-white shadow-sm transition-all duration-200 hover:bg-blue-700"
                >
                  Start Meeting
                </button>
                <Link
                  href={`/room/${id}`}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 hover:bg-slate-200"
                >
                  Join Video Call
                </Link>
              </>
            )}
            {meeting.status === 'upcoming' && isOwner && isScheduledForFuture && (
              <>
                <button
                  disabled
                  className="rounded-xl bg-slate-100 px-4 py-2 text-slate-400 shadow-sm opacity-70"
                >
                  Start Meeting
                </button>
                <button
                  disabled
                  className="rounded-xl bg-slate-100 px-4 py-2 text-slate-400 shadow-sm opacity-70"
                >
                  Join Video Call
                </button>
              </>
            )}

            {meeting.status === 'active' && (
              <>
                <Link
                  href={`/room/${id}`}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-white shadow-sm transition-all duration-200 hover:bg-blue-700"
                >
                  Join Video Call
                </Link>
                {isOwner && (
                  <button
                    onClick={() => setIsUpdatingTranscript(true)}
                    className="rounded-xl bg-slate-100 px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 hover:bg-slate-200"
                  >
                    Add Transcript
                  </button>
                )}
              </>
            )}

            {canGenerateSummary && isOwner && (
              <button
                onClick={handleComplete}
                disabled={completeMeeting.isPending}
                className="rounded-xl bg-blue-600 px-4 py-2 text-white shadow-sm transition-all duration-200 hover:bg-blue-700 disabled:opacity-50"
              >
                {completeMeeting.isPending ? 'Generating...' : meeting.summary ? 'Regenerate Summary' : 'Generate Summary'}
              </button>
            )}

            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={deleteMeeting.isPending || isScheduledForFuture}
                className="rounded-xl bg-red-50 px-4 py-2 text-red-600 shadow-sm transition-all duration-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteMeeting.isPending ? 'Deleting...' : 'Delete Meeting'}
              </button>
            )}

            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-slate-100 px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 hover:bg-slate-200"
            >
              Add to Google Calendar
            </a>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-sm font-semibold text-slate-900">Invite people to this meeting</p>
            <div className="flex flex-wrap items-center gap-3">
              <code className="max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                {typeof window !== 'undefined' ? `${window.location.origin}/room/${id}` : `/room/${id}`}
              </code>
              <button
                onClick={handleCopyLink}
                className="rounded-xl bg-slate-100 px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 hover:bg-slate-200"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200">
          <div className="flex flex-wrap gap-2">
            {(['summary', 'transcript', 'productivity', 'ask-ai'] as DetailTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-t-xl px-4 py-2 text-sm font-medium capitalize transition-all duration-200 ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'ask-ai' ? 'Ask AI' : tab === 'productivity' ? 'Productivity' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {activeTab === 'summary' && (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleExportSummary}
                    disabled={!meeting.summary}
                    className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all duration-200 hover:bg-slate-200 disabled:opacity-50"
                  >
                    Export Summary
                  </button>
                  <button
                    onClick={handleExportReport}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700"
                  >
                    Export Report
                  </button>
                </div>
              </div>
              {meeting.summary ? (
                <div className="space-y-3 text-slate-600 leading-relaxed">
                  {meeting.summary
                    .split('\n')
                    .filter(Boolean)
                    .map((line, idx) => (
                      <p key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        {line}
                      </p>
                    ))}
                </div>
              ) : (
                <p className="text-slate-500">No summary yet. Complete the meeting to generate one.</p>
              )}
            </div>
          )}

          {activeTab === 'transcript' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Transcript</h2>
              {isUpdatingTranscript ? (
                <div>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste the meeting transcript here..."
                    className="h-72 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                  />
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={handleSaveTranscript}
                      disabled={updateTranscript.isPending}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-white shadow-sm transition-all duration-200 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updateTranscript.isPending ? 'Saving...' : 'Save Transcript'}
                    </button>
                    <button
                      onClick={() => setIsUpdatingTranscript(false)}
                      className="rounded-xl bg-slate-100 px-4 py-2 text-slate-900 transition-all duration-200 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : meeting.transcript ? (
                <div className="max-h-[28rem] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {meeting.transcript}
                </div>
              ) : (
                <p className="text-slate-500">No transcript saved yet.</p>
              )}
            </div>
          )}


          {activeTab === 'productivity' && (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Post-meeting productivity</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Turn this meeting into actions, decisions, and follow-up work.
                  </p>
                </div>
                <button
                  onClick={handleGenerateProductivity}
                  disabled={getMeetingProductivity.isPending || (!meeting.transcript && !meeting.summary)}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700 disabled:opacity-50"
                >
                  {getMeetingProductivity.isPending ? 'Generating...' : productivity ? 'Refresh Productivity' : 'Generate Productivity'}
                </button>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={handlePushToNotion}
                  disabled={pushMeetingToNotion.isPending || (!meeting.transcript && !meeting.summary)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all duration-200 hover:bg-slate-200 disabled:opacity-50"
                >
                  {pushMeetingToNotion.isPending ? 'Pushing to Notion...' : 'Push Productivity to Notion'}
                </button>
                {notionUrl && (
                  <a
                    href={notionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700"
                  >
                    Open Notion Page
                  </a>
                )}
              </div>

              {productivity ? (
                <div className="space-y-5">
                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-900">Overview</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{productivity.overview}</p>
                  </section>

                  <section className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="text-sm font-semibold text-slate-900">Decisions</h3>
                      {productivity.decisions.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {productivity.decisions.map((item, index) => (
                            <p key={`${item}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                              {item}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">No decisions detected.</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="text-sm font-semibold text-slate-900">Follow-ups</h3>
                      {productivity.followUps.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {productivity.followUps.map((item, index) => (
                            <p key={`${item}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                              {item}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">No follow-up suggestions detected.</p>
                      )}
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-900">Action items</h3>
                    {productivity.actionItems.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {productivity.actionItems.map((item, index) => (
                          <div key={`${item.task}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-sm font-medium text-slate-900">{item.task}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                              <span className="rounded-full bg-slate-100 px-3 py-1">Owner: {item.owner}</span>
                              <span className="rounded-full bg-slate-100 px-3 py-1">Deadline: {item.deadline}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">No action items detected.</p>
                    )}
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-900">Follow-up draft</h3>
                      {productivity.provider && (
                        <span className="text-xs uppercase tracking-wide text-slate-400">{productivity.provider}</span>
                      )}
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{productivity.followUpDraft}</p>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  Generate post-meeting productivity outputs to extract action items, decisions, and a ready-to-send follow-up draft.
                </div>
              )}
            </div>
          )}

          {activeTab === 'ask-ai' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Ask AI</h2>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm text-slate-600">
                  Ask questions based on this meeting context.
                </p>
                <textarea
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  placeholder="e.g., What are the top 3 action items from this meeting?"
                  className="h-28 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={handleAskMeeting}
                  disabled={askMeeting.isPending || (!meeting.transcript && !meeting.summary)}
                  className="mt-3 rounded-xl bg-slate-100 px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 hover:bg-slate-200 disabled:opacity-50"
                >
                  {askMeeting.isPending ? 'Thinking...' : 'Ask AI'}
                </button>
              </div>

              {answers.length > 0 && (
                <div className="mt-4 space-y-4">
                  {answers
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                      <div key={`${entry.question}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-sm font-semibold text-slate-900">{entry.question}</p>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{entry.answer}</p>
                        {entry.provider && (
                          <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">Answered by {entry.provider}</p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {meeting.status === 'processing' && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-center">
            <p className="text-yellow-600">AI is generating the meeting summary. This may take a minute.</p>
          </div>
        )}

        {!isOwner && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
            <p className="text-blue-700">You are viewing this meeting as a participant. Transcript, summary, and recording stay visible here after the host finishes the meeting.</p>
          </div>
        )}
      </div>
    </main>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'meeting';
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildSummaryExport(meeting: {
  name: string;
  startTime: Date | string;
  summary?: string | null;
}) {
  return `# ${meeting.name}

Date: ${new Date(meeting.startTime).toLocaleString()}

## Summary

${meeting.summary || 'No summary available.'}
`;
}

function buildMeetingReport(meeting: {
  name: string;
  startTime: Date | string;
  endTime?: Date | string | null;
  status: string;
  summary?: string | null;
  transcript?: string | null;
}) {
  return `# ${meeting.name}

Date: ${new Date(meeting.startTime).toLocaleString()}
Status: ${meeting.status}

## Summary

${meeting.summary || 'No summary available.'}

## Transcript

${meeting.transcript || 'No transcript available.'}
`;
}

function buildGoogleCalendarUrl(meeting: GoogleCalendarMeeting) {
  const start = new Date(meeting.startTime);
  const end = meeting.endTime ? new Date(meeting.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
  const details = meeting.summary?.trim() || 'Meeting created in Meet-AI.';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: meeting.name,
    dates: `${toGoogleCalendarDate(start)}/${toGoogleCalendarDate(end)}`,
    details,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function toGoogleCalendarDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
