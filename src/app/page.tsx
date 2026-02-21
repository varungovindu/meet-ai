/**
 * Home Page
 * 
 * Landing page for Meet-AI Clone.
 */

import Link from 'next/link';
import { Navbar } from '@/components/navbar';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-10">
      <div className="z-10 w-full max-w-5xl items-center justify-center text-sm">
        <div className="text-center">
          <h1 className="mb-4 text-6xl font-bold text-slate-900">
            Meet-AI
          </h1>
          <p className="mb-8 text-xl text-slate-600">Smart Video Conferencing with AI Notes</p>
          <p className="mb-12 text-lg text-slate-500">
            Zero-cost AI-enhanced video conferencing powered by local Ollama
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="/dashboard"
              className="rounded-xl bg-blue-600 px-6 py-3 text-white shadow-sm transition-all duration-200 hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/meetings"
              className="rounded-xl bg-slate-100 px-6 py-3 text-slate-900 shadow-sm transition-all duration-200 hover:bg-slate-200"
            >
              View Meetings
            </Link>
            <Link
              href="/agents"
              className="rounded-xl bg-slate-100 px-6 py-3 text-slate-900 shadow-sm transition-all duration-200 hover:bg-slate-200"
            >
              AI Agents
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
              <h3 className="mb-2 text-xl font-semibold text-slate-900">Human Meetings</h3>
              <p className="text-slate-600">
                Real-time video conferencing with automatic transcription and AI-powered summaries
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
              <h3 className="mb-2 text-xl font-semibold text-slate-900">AI Voice Agent</h3>
              <p className="text-slate-600">
                Interactive AI voice conversations with customizable agent personas
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
    </>
  );
}
