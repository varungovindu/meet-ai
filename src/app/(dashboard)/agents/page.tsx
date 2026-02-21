/**
 * Agents Page
 * 
 * Manage AI agents (CRUD operations).
 */

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export default function AgentsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    instructions: '',
  });

  const utils = trpc.useUtils();
  const { data: agents, isLoading } = trpc.agents.list.useQuery();
  
  const createAgent = trpc.agents.create.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate();
      setIsCreating(false);
      setFormData({ name: '', instructions: '' });
    },
  });

  const updateAgent = trpc.agents.update.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate();
      setEditingId(null);
      setFormData({ name: '', instructions: '' });
    },
  });

  const deleteAgent = trpc.agents.delete.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.instructions.trim()) return;

    if (editingId) {
      updateAgent.mutate({ id: editingId, ...formData });
    } else {
      createAgent.mutate(formData);
    }
  };

  const handleEdit = (agent: typeof agents extends (infer T)[] ? T : never) => {
    setEditingId(agent.id);
    setFormData({ name: agent.name, instructions: agent.instructions });
    setIsCreating(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete agent "${name}"?`)) {
      deleteAgent.mutate({ id });
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ name: '', instructions: '' });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-900">AI Agents</h1>
          <button
            onClick={() => setIsCreating(true)}
            className="rounded-xl bg-blue-600 px-6 py-2 font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700"
          >
            + New Agent
          </button>
        </div>

        {/* Create/Edit Form */}
        {isCreating && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">
              {editingId ? 'Edit Agent' : 'Create New Agent'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">Agent Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Technical Assistant, Customer Support"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">Instructions</label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Define the agent's personality, knowledge, and behavior..."
                  className="h-32 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400"
                  required
                />
                <p className="mt-1 text-sm text-slate-600">
                  Tip: Be specific about the agent's role, tone, and expertise
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={createAgent.isPending || updateAgent.isPending}
                  className="rounded-xl bg-blue-600 px-6 py-2 font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700 disabled:opacity-50"
                >
                  {createAgent.isPending || updateAgent.isPending
                    ? 'Saving...'
                    : editingId
                    ? 'Update Agent'
                    : 'Create Agent'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-xl bg-slate-100 px-6 py-2 font-medium text-slate-900 transition-all duration-200 hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Agents List */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-8 py-6">
            <h2 className="text-2xl font-semibold text-slate-900">Your AI Agents</h2>
          </div>
          <div className="px-8 py-6">
            {isLoading ? (
              <p className="text-slate-600">Loading agents...</p>
            ) : agents && agents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-slate-900">{agent.name}</h3>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEdit(agent)}
                          className="text-sm text-blue-600 transition-all duration-200 hover:text-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(agent.id, agent.name)}
                          className="text-sm text-red-500 transition-all duration-200 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {agent.instructions.length > 150
                        ? agent.instructions.substring(0, 150) + '...'
                        : agent.instructions}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">
                      Created: {new Date(agent.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="mb-4 text-slate-600">No AI agents yet</p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="rounded-xl bg-blue-600 px-6 py-2 font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700"
                >
                  Create Your First Agent
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
