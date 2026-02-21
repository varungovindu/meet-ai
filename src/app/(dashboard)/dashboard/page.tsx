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
    <main className="min-h-screen p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 text-3xl font-bold text-white">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="mb-2 text-sm text-slate-300">Total Meetings</h3>
            <p className="text-3xl font-bold text-white">{meetings?.length || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="mb-2 text-sm text-slate-300">AI Agents</h3>
            <p className="text-3xl font-bold text-white">{agents?.length || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="mb-2 text-sm text-slate-300">Completed</h3>
            <p className="text-3xl font-bold text-white">
              {meetings?.filter(m => m.status === 'completed').length || 0}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="mb-2 text-sm text-slate-300">Upcoming</h3>
            <p className="text-3xl font-bold text-white">
              {meetings?.filter(m => m.status === 'upcoming').length || 0}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Meetings */}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-white">Recent Meetings</h2>
              <Link href="/meetings" className="text-emerald-400 hover:text-emerald-300">
                View all
              </Link>
            </div>
            {meetingsLoading ? (
              <p className="text-slate-300">Loading...</p>
            ) : meetings && meetings.length > 0 ? (
              <ul className="space-y-3">
                {meetings.slice(0, 5).map((meeting) => (
                  <li key={meeting.id} className="flex justify-between items-center rounded-xl border border-slate-700 bg-slate-800 p-3">
                    <div>
                      <p className="font-medium text-white">{meeting.name}</p>
                      <p className="text-sm text-slate-300">
                        {new Date(meeting.startTime).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-xl px-3 py-1 text-xs ${
                        meeting.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : meeting.status === 'active'
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {meeting.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-300">No meetings yet</p>
            )}
          </div>

          {/* AI Agents */}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-white">AI Agents</h2>
              <Link href="/agents" className="text-emerald-400 hover:text-emerald-300">
                View all
              </Link>
            </div>
            {agentsLoading ? (
              <p className="text-slate-300">Loading...</p>
            ) : agents && agents.length > 0 ? (
              <ul className="space-y-3">
                {agents.slice(0, 5).map((agent) => (
                  <li key={agent.id} className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                    <p className="font-medium text-white">{agent.name}</p>
                    <p className="truncate text-sm text-slate-300">
                      {agent.instructions.substring(0, 60)}...
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-300">No agents yet</p>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/meetings"
            className="rounded-xl border border-slate-700 bg-slate-900 p-8 transition hover:bg-slate-800"
          >
            <h3 className="mb-2 text-2xl font-semibold text-white">Start Meeting</h3>
            <p className="text-slate-300">
              Create a new video conference with automatic AI summaries
            </p>
          </Link>
          <Link
            href="/ai-agent"
            className="rounded-xl border border-slate-700 bg-slate-900 p-8 transition hover:bg-slate-800"
          >
            <h3 className="mb-2 text-2xl font-semibold text-white">AI Voice Agent</h3>
            <p className="text-slate-300">
              Chat with your AI agents using voice commands
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
