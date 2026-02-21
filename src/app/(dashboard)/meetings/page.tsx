/**
 * Meetings Page
 * 
 * Lists all meetings and allows creating new ones.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

export default function MeetingsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [meetingName, setMeetingName] = useState('');
  const [createError, setCreateError] = useState('');

  const utils = trpc.useUtils();
  const { data: meetings, isLoading } = trpc.meetings.list.useQuery();
  const createMeeting = trpc.meetings.create.useMutation({
    onSuccess: () => {
      utils.meetings.list.invalidate();
      setIsCreating(false);
      setMeetingName('');
      setCreateError('');
    },
    onError: (error) => {
      setCreateError(error.message || 'Failed to create meeting');
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingName.trim()) return;
    setCreateError('');

    createMeeting.mutate({
      name: meetingName,
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-900">Meetings</h1>
          <button
            onClick={() => setIsCreating(true)}
            className="rounded-xl bg-blue-600 px-6 py-2 font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700"
          >
            + New Meeting
          </button>
        </div>

        {/* Create Meeting Form */}
        {isCreating && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Create New Meeting</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {createError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {createError}
                </div>
              )}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">Meeting Name</label>
                <input
                  type="text"
                  value={meetingName}
                  onChange={(e) => setMeetingName(e.target.value)}
                  placeholder="Enter meeting name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={createMeeting.isPending}
                  className="rounded-xl bg-blue-600 px-6 py-2 font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMeeting.isPending ? 'Creating...' : 'Create Meeting'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="rounded-xl bg-slate-100 px-6 py-2 font-medium text-slate-900 transition-all duration-200 hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Meetings List */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-8 py-6">
            <h2 className="text-2xl font-semibold text-slate-900">All Meetings</h2>
          </div>
          <div className="px-8 py-6 space-y-6">
            {isLoading ? (
              <p className="text-slate-600">Loading meetings...</p>
            ) : meetings && meetings.length > 0 ? (
              <div className="space-y-4">
                {meetings.map((meeting) => (
                  <Link
                    key={meeting.id}
                    href={`/meetings/${meeting.id}`}
                    className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    <div className="flex justify-between items-start gap-6">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900">{meeting.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {new Date(meeting.startTime).toLocaleString()}
                        </p>
                        {meeting.summary && (
                          <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                            {meeting.summary}
                          </p>
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
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="mb-4 text-slate-600">No meetings yet</p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="rounded-xl bg-blue-600 px-6 py-2 font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700"
                >
                  Create Your First Meeting
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
