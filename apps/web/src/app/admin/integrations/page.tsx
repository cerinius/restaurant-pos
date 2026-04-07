'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { useAuthStore } from '@/store';

export default function IntegrationsPage() {
  const qc = useQueryClient();
  const { locationId } = useAuthStore();
  const [draft, setDraft] = useState({ appId: '', displayName: '', status: 'connected' });

  const { data, isLoading } = useQuery({
    queryKey: ['ops-integrations-page'],
    queryFn: () => api.getIntegrations(),
  });

  const catalog = data?.data?.catalog || [];
  const connections = data?.data?.connections || [];

  const createMutation = useMutation({
    mutationFn: () => api.createIntegrationConnection({ ...draft, locationId }),
    onSuccess: async () => {
      toast.success('Integration connection saved');
      setDraft({ appId: '', displayName: '', status: 'connected' });
      await qc.invalidateQueries({ queryKey: ['ops-integrations-page'] });
    },
  });

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Integrations</h1>
        <p className="mt-1 text-sm text-slate-400">Manage the integration marketplace foundation with real catalog entries and per-restaurant connection records.</p>
      </div>

      {isLoading ? (
        <div className="mt-6 text-sm text-slate-400">Loading integrations...</div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="card p-5">
            <h2 className="text-lg font-semibold text-slate-100">Connect App</h2>
            <div className="mt-4 grid gap-3">
              <select value={draft.appId} onChange={(e) => setDraft((c) => ({ ...c, appId: e.target.value }))} className="input">
                <option value="">Select app</option>
                {catalog.map((app: any) => (
                  <option key={app.id} value={app.id}>{app.name}</option>
                ))}
              </select>
              <input value={draft.displayName} onChange={(e) => setDraft((c) => ({ ...c, displayName: e.target.value }))} className="input" placeholder="Connection label" />
              <select value={draft.status} onChange={(e) => setDraft((c) => ({ ...c, status: e.target.value }))} className="input">
                <option value="connected">Connected</option>
                <option value="pending">Pending</option>
                <option value="disconnected">Disconnected</option>
              </select>
              <div className="flex justify-end">
                <button type="button" onClick={() => createMutation.mutate()} className="btn-primary" disabled={!draft.appId || !draft.displayName}>
                  Save Connection
                </button>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-100">Available Apps</h3>
              <div className="mt-3 space-y-3">
                {catalog.map((app: any) => (
                  <div key={app.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-sm font-semibold text-slate-100">{app.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{app.category} | {app.authType}</p>
                    {app.description && <p className="mt-2 text-sm text-slate-300">{app.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold text-slate-100">Current Connections</h2>
            <div className="mt-4 space-y-3">
              {connections.map((connection: any) => (
                <div key={connection.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{connection.displayName}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {connection.app?.name} | {connection.location?.name || 'All locations'}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-slate-300">{connection.status}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {connection.lastSyncAt ? `Last sync ${new Date(connection.lastSyncAt).toLocaleString()}` : 'No sync recorded yet'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
