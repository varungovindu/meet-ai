/**
 * Dashboard Page
 * 
 * Main dashboard showing overview of meetings and agents.
 */

'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';

export default function DashboardPage() {
  const { data: meetings, isLoading: meetingsLoading } = trpc.meetings.list.useQuery({
    limit: 5,
  });
  
  const { data: agents, isLoading: agentsLoading } = trpc.agents.list.useQuery();

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 text-3xl font-bold text-slate-900">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-sm text-slate-600">Total Meetings</h3>
            <p className="text-3xl font-bold text-slate-900">{meetings?.length || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-sm text-slate-600">AI Agents</h3>
            <p className="text-3xl font-bold text-slate-900">{agents?.length || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-sm text-slate-600">Completed</h3>
            <p className="text-3xl font-bold text-slate-900">
              {meetings?.filter(m => m.status === 'completed').length || 0}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-sm text-slate-600">Upcoming</h3>
            <p className="text-3xl font-bold text-slate-900">
              {meetings?.filter(m => m.status === 'upcoming').length || 0}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Meetings */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-slate-900">Recent Meetings</h2>
              <Link href="/meetings" className="text-blue-600 hover:text-blue-700">
                View all
              </Link>
            </div>
            {meetingsLoading ? (
              <p className="text-slate-600">Loading...</p>
            ) : meetings && meetings.length > 0 ? (
              <ul className="space-y-3">
                {meetings.slice(0, 5).map((meeting) => (
                  <li key={meeting.id} className="flex justify-between items-center rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div>
                      <p className="font-medium text-slate-900">{meeting.name}</p>
                      <p className="text-sm text-slate-600">
                        {new Date(meeting.startTime).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-xl px-3 py-1 text-xs ${
                        meeting.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : meeting.status === 'active'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {meeting.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-600">No meetings yet</p>
            )}
          </div>

          {/* AI Agents */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-slate-900">AI Agents</h2>
              <Link href="/agents" className="text-blue-600 hover:text-blue-700">
                View all
              </Link>
            </div>
            {agentsLoading ? (
              <p className="text-slate-600">Loading...</p>
            ) : agents && agents.length > 0 ? (
              <ul className="space-y-3">
                {agents.slice(0, 5).map((agent) => (
                  <li key={agent.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="font-medium text-slate-900">{agent.name}</p>
                    <p className="truncate text-sm text-slate-600">
                      {agent.instructions.substring(0, 60)}...
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-600">No agents yet</p>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/meetings"
            className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm transition hover:shadow-md"
          >
            <h3 className="mb-2 text-2xl font-semibold text-slate-900">Start Meeting</h3>
            <p className="text-slate-600">
              Create a new video conference with automatic AI summaries
            </p>
          </Link>
          <Link
            href="/ai-agent"
            className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm transition hover:shadow-md"
          >
            <h3 className="mb-2 text-2xl font-semibold text-slate-900">AI Voice Agent</h3>
            <p className="text-slate-600">
              Chat with your AI agents using voice commands
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
