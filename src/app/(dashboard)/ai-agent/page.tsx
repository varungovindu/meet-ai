/**
 * AI Voice Agent Page
 *
 * Interactive voice conversation with AI agents using Web Speech API.
 */

'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

type AgentConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
  provider?: 'groq' | 'ollama';
};

export default function AIAgentPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [conversation, setConversation] = useState<Array<AgentConversationMessage>>([]);
  const [error, setError] = useState('');
  const [showTranscriptPanel, setShowTranscriptPanel] = useState(true);

  const utils = trpc.useUtils();
  const { data: agents } = trpc.agents.list.useQuery();
  const { data: conversationHistory } = trpc.ai.getConversationHistory.useQuery(
    { agentId: selectedAgentId, limit: 100 },
    { enabled: Boolean(selectedAgentId) }
  );
  const generateResponse = trpc.ai.generateVoiceResponse.useMutation({
    onSuccess: async () => {
      if (selectedAgentId) {
        await utils.ai.getConversationHistory.invalidate({ agentId: selectedAgentId, limit: 100 });
      }
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        setError('Speech recognition not supported in this browser. Please use Chrome or Edge.');
      }
      if (!('speechSynthesis' in window)) {
        setError('Speech synthesis not supported in this browser.');
      }
    }
  }, []);

  useEffect(() => {
    if (selectedAgentId) {
      setConversation(
        (conversationHistory || []).map((message) => ({
          role: message.role,
          content: message.content,
          provider: message.provider,
        }))
      );
      return;
    }

    setConversation([]);
  }, [selectedAgentId, conversationHistory]);

  const startListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setTranscript(speechToText);
      handleUserMessage(speechToText);
    };

    recognition.onerror = (event: any) => {
      setError(`Recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleUserMessage = async (message: string) => {
    if (!selectedAgentId) {
      setError('Please select an agent first');
      return;
    }

    const newConversation = [...conversation, { role: 'user' as const, content: message }];
    setConversation(newConversation);

    try {
      const result = await generateResponse.mutateAsync({
        agentId: selectedAgentId,
        userMessage: message,
        conversationHistory: conversation,
      });

      setConversation([
        ...newConversation,
        { role: 'assistant', content: result.response, provider: result.provider },
      ]);
      speakText(result.response);
    } catch (err: any) {
      const errorMessage =
        err?.message ||
        err?.data?.message ||
        'Failed to get AI response. Please verify GROQ_API_KEY is configured in Vercel and an agent is selected.';
      setError(errorMessage);
    }
  };

  const speakText = (text: string) => {
    if (typeof window === 'undefined') return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const clearConversation = () => {
    setTranscript('');
    setError('');
    setTextInput('');
  };

  return (
    <main className="relative min-h-screen bg-slate-50 px-8 pb-32 pt-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">AI Voice Agent</h1>
          <p className="text-sm text-slate-600">Call-style AI conversation workspace</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedAgentId}
            onChange={(e) => {
              setSelectedAgentId(e.target.value);
              setTranscript('');
              setTextInput('');
              setError('');
            }}
            className="min-w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
          >
            <option value="">Choose an agent...</option>
            {agents?.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowTranscriptPanel((prev) => !prev)}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all duration-200 hover:bg-slate-200"
          >
            {showTranscriptPanel ? 'Hide Transcript' : 'Show Transcript'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <section className="mx-auto flex max-w-5xl flex-col items-center gap-8 pb-20">
        <div className="w-full rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-40 w-40 items-center justify-center rounded-full bg-slate-100 text-6xl">
            🤖
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {selectedAgentId
              ? agents?.find((agent) => agent.id === selectedAgentId)?.name || 'AI Agent'
              : 'Select an Agent'}
          </h2>
          <p className="mt-3 text-slate-600 leading-relaxed">
            {selectedAgentId
              ? agents?.find((agent) => agent.id === selectedAgentId)?.instructions || 'Ready to assist you.'
              : 'Choose an AI agent from the top bar to start a voice call.'}
          </p>
        </div>

        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-3xl">
            👤
          </div>
          <p className="font-semibold text-slate-900">You</p>
          <p className="mt-2 text-sm text-slate-600">{transcript || 'Waiting for your voice...'}</p>
        </div>
      </section>

      <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full border border-slate-200 bg-white px-6 py-3 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={startListening}
            disabled={isListening || !selectedAgentId || isSpeaking}
            className="h-10 w-10 rounded-full flex items-center justify-center bg-blue-600 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-700 disabled:opacity-50"
          >
            🎤
          </button>
          <button
            onClick={stopSpeaking}
            disabled={!isSpeaking}
            className="h-10 rounded-full bg-slate-100 px-5 text-sm font-medium text-slate-900 transition-all duration-200 hover:bg-slate-200 disabled:opacity-50"
          >
            End Voice
          </button>
          <button
            onClick={clearConversation}
            className="h-10 rounded-full bg-red-500 px-5 text-sm font-medium text-white transition-all duration-200 hover:bg-red-600"
          >
            Clear
          </button>
        </div>
      </div>

      {showTranscriptPanel && (
        <aside className="fixed right-6 top-24 z-20 h-[calc(100vh-9rem)] w-96 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-slate-900">Transcript & Chat</h3>

          <div className="mb-3 h-[calc(100%-8.5rem)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
            {conversation.length === 0 ? (
              <p className="text-sm text-slate-600">No conversation yet.</p>
            ) : (
              <div className="space-y-2">
                {conversation.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      msg.role === 'user' ? 'bg-slate-100 text-slate-900' : 'bg-blue-100 text-slate-900'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <p className="text-xs font-semibold">{msg.role === 'user' ? 'You' : 'AI'}</p>
                      {msg.role === 'assistant' && msg.provider && (
                        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700">
                          {msg.provider}
                        </span>
                      )}
                    </div>
                    <p>{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (textInput.trim()) {
                handleUserMessage(textInput.trim());
                setTextInput('');
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your message..."
              disabled={!selectedAgentId || isSpeaking}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
            <button
              type="submit"
              disabled={!selectedAgentId || !textInput.trim() || isSpeaking}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </aside>
      )}
    </main>
  );
}
