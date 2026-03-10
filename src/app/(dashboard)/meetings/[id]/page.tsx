/**
 * Meeting Detail Page
 *
 * Shows details of a specific meeting and allows completing it.
 */

'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

type DetailTab = 'summary' | 'transcript' | 'recording' | 'ask-ai';

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

  const utils = trpc.useUtils();
  const { data: meeting, isLoading } = trpc.meetings.getById.useQuery({ id });

  const updateTranscript = trpc.meetings.updateTranscript.useMutation({
    onSuccess: () => {
      utils.meetings.getById.invalidate({ id });
      setIsUpdatingTranscript(false);
    },
  });

  const completeMeeting = trpc.meetings.completeMeeting.useMutation({
    onSuccess: () => {
      utils.meetings.getById.invalidate({ id });
      setActiveTab('summary');
    },
  });

  const updateStatus = trpc.meetings.updateStatus.useMutation({
    onSuccess: () => {
      utils.meetings.getById.invalidate({ id });
    },
  });

  const deleteMeeting = trpc.meetings.delete.useMutation({
    onSuccess: () => {
      utils.meetings.list.invalidate();
      router.push('/meetings');
    },
  });

  const handleSaveTranscript = () => {
    if (!transcript.trim()) return;
    updateTranscript.mutate({ id, transcript });
  };

  const handleComplete = () => {
    if (confirm('Generate AI summary for this meeting?')) {
      completeMeeting.mutate({ id });
    }
  };

  const handleDelete = () => {
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

  const canGenerateSummary =
    Boolean(meeting.transcript?.trim()) &&
    meeting.status !== 'processing' &&
    meeting.status !== 'completed';

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/meetings" className="inline-block text-blue-600 transition-all duration-200 hover:text-blue-700">
          ← Back to meetings
        </Link>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{meeting.name}</h1>
              <p className="mt-2 text-sm text-slate-500">{new Date(meeting.startTime).toLocaleString()}</p>
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
            {meeting.status === 'upcoming' && (
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

            {meeting.status === 'active' && (
              <>
                <Link
                  href={`/room/${id}`}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-white shadow-sm transition-all duration-200 hover:bg-blue-700"
                >
                  Join Video Call
                </Link>
                <button
                  onClick={() => setIsUpdatingTranscript(true)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 hover:bg-slate-200"
                >
                  Add Transcript
                </button>
              </>
            )}

            {canGenerateSummary && (
              <button
                onClick={handleComplete}
                disabled={completeMeeting.isPending}
                className="rounded-xl bg-blue-600 px-4 py-2 text-white shadow-sm transition-all duration-200 hover:bg-blue-700 disabled:opacity-50"
              >
                {completeMeeting.isPending ? 'Generating...' : 'Generate Summary'}
              </button>
            )}

            <button
              onClick={handleDelete}
              disabled={deleteMeeting.isPending}
              className="rounded-xl bg-red-50 px-4 py-2 text-red-600 shadow-sm transition-all duration-200 hover:bg-red-100 disabled:opacity-50"
            >
              {deleteMeeting.isPending ? 'Deleting...' : 'Delete Meeting'}
            </button>
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
            {(['summary', 'transcript', 'recording', 'ask-ai'] as DetailTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-t-xl px-4 py-2 text-sm font-medium capitalize transition-all duration-200 ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'ask-ai' ? 'Ask AI' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {activeTab === 'summary' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Summary</h2>
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

          {activeTab === 'recording' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Recording</h2>
              {meeting.recordingUrl ? (
                <a
                  href={meeting.recordingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded-xl bg-blue-600 px-4 py-2 text-white shadow-sm transition-all duration-200 hover:bg-blue-700"
                >
                  Open Recording
                </a>
              ) : (
                <p className="text-slate-500">No recording available for this meeting.</p>
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
                  className="mt-3 rounded-xl bg-slate-100 px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 hover:bg-slate-200"
                >
                  Use Voice Agent for Q&A
                </button>
              </div>
            </div>
          )}
        </div>

        {meeting.status === 'processing' && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-center">
            <p className="text-yellow-600">AI is generating the meeting summary. This may take a minute.</p>
          </div>
        )}
      </div>
    </main>
  );
}
