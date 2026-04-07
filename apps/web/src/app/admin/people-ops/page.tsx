'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { useAuthStore } from '@/store';

export default function PeopleOpsPage() {
  const qc = useQueryClient();
  const { locationId, user } = useAuthStore();
  const [logDraft, setLogDraft] = useState({ title: '', body: '', category: 'service' });
  const [taskDraft, setTaskDraft] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [documentDraft, setDocumentDraft] = useState({ userId: '', title: '', documentType: 'policy_acknowledgement' });

  const { data, isLoading } = useQuery({
    queryKey: ['ops-overview-people', locationId],
    queryFn: () => api.getOperationsOverview({ locationId }),
  });

  const overview = data?.data;
  const staff = useMemo(() => overview?.payroll?.rows || [], [overview?.payroll?.rows]);
  const firstChannel = overview?.channels?.[0];
  const firstTaskList = overview?.taskLists?.[0];

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['ops-overview-people'] });
  };

  const createLogMutation = useMutation({
    mutationFn: () => api.createManagerLog({ locationId, ...logDraft }),
    onSuccess: async () => {
      toast.success('Manager log entry added');
      setLogDraft({ title: '', body: '', category: 'service' });
      await refresh();
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: () => api.createTaskList({ locationId, name: taskDraft, category: 'shift' }),
    onSuccess: async () => {
      toast.success('Task list created');
      setTaskDraft('');
      await refresh();
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: (id: string) => api.toggleTaskItem(id),
    onSuccess: refresh,
  });

  const sendMessageMutation = useMutation({
    mutationFn: () => {
      if (!firstChannel?.id) return Promise.reject(new Error('Create a team channel first'));
      return api.sendTeamMessage(firstChannel.id, messageDraft);
    },
    onSuccess: async () => {
      toast.success('Team message sent');
      setMessageDraft('');
      await refresh();
    },
    onError: (error: any) => toast.error(error?.message || error?.response?.data?.error || 'Could not send message'),
  });

  const createDocumentMutation = useMutation({
    mutationFn: () => api.createEmployeeDocument(documentDraft),
    onSuccess: async () => {
      toast.success('Employee document recorded');
      setDocumentDraft({ userId: '', title: '', documentType: 'policy_acknowledgement' });
      await refresh();
    },
  });

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">People Ops</h1>
        <p className="mt-1 text-sm text-slate-400">Manager logbook, shift checklists, team channels, and employee document tracking in one operating layer.</p>
      </div>

      {isLoading ? (
        <div className="mt-6 text-sm text-slate-400">Loading people operations...</div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="space-y-6">
            <div className="card p-5">
              <h2 className="text-lg font-semibold text-slate-100">Manager Logbook</h2>
              <div className="mt-4 grid gap-3">
                <input value={logDraft.title} onChange={(e) => setLogDraft((c) => ({ ...c, title: e.target.value }))} className="input" placeholder="Shift handoff headline" />
                <select value={logDraft.category} onChange={(e) => setLogDraft((c) => ({ ...c, category: e.target.value }))} className="input">
                  <option value="service">Service</option>
                  <option value="staffing">Staffing</option>
                  <option value="facility">Facility</option>
                  <option value="guest">Guest</option>
                </select>
                <textarea value={logDraft.body} onChange={(e) => setLogDraft((c) => ({ ...c, body: e.target.value }))} className="input min-h-[120px]" placeholder="What does the next manager need to know?" />
                <div className="flex justify-end">
                  <button type="button" onClick={() => createLogMutation.mutate()} className="btn-primary" disabled={!logDraft.title || !logDraft.body}>
                    Add Entry
                  </button>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {(overview?.managerLogs || []).map((entry: any) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{entry.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{entry.category} | {new Date(entry.createdAt).toLocaleString()}</p>
                      </div>
                      {!entry.acknowledgedAt && (
                        <button type="button" onClick={() => api.acknowledgeManagerLog(entry.id).then(refresh)} className="btn-secondary px-3 py-2 text-xs">
                          Acknowledge
                        </button>
                      )}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{entry.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h2 className="text-lg font-semibold text-slate-100">Task Lists</h2>
              <div className="mt-4 flex gap-3">
                <input value={taskDraft} onChange={(e) => setTaskDraft(e.target.value)} className="input flex-1" placeholder="Opening checklist, patio setup, closeout..." />
                <button type="button" onClick={() => createTaskMutation.mutate()} className="btn-primary" disabled={!taskDraft}>
                  Create
                </button>
              </div>
              <div className="mt-5 space-y-4">
                {(overview?.taskLists || []).map((list: any) => (
                  <div key={list.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-sm font-semibold text-slate-100">{list.name}</p>
                    <div className="mt-3 space-y-2">
                      {(list.items || []).map((item: any) => (
                        <button key={item.id} type="button" onClick={() => toggleTaskMutation.mutate(item.id)} className="flex w-full items-center justify-between rounded-2xl border border-slate-800 px-3 py-2 text-left">
                          <span className={item.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}>{item.title}</span>
                          <span className="text-xs text-slate-500">{item.status}</span>
                        </button>
                      ))}
                    </div>
                    {firstTaskList?.id === list.id && (
                      <button
                        type="button"
                        onClick={() => api.addTaskItem(list.id, { title: 'Manager follow-up', notes: 'Created from people ops page' }).then(refresh)}
                        className="btn-secondary mt-3 px-3 py-2 text-xs"
                      >
                        Add Default Item
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-5">
              <h2 className="text-lg font-semibold text-slate-100">Team Messaging</h2>
              <p className="mt-1 text-sm text-slate-400">Use real channels for handoff and floor communication instead of duplicating alerts in multiple places.</p>
              <div className="mt-4 flex gap-3">
                <input value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} className="input flex-1" placeholder={firstChannel ? `Message #${firstChannel.name}` : 'No team channel yet'} />
                <button type="button" onClick={() => sendMessageMutation.mutate()} className="btn-primary" disabled={!messageDraft || !firstChannel}>
                  Send
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {(overview?.channels || []).map((channel: any) => (
                  <div key={channel.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-sm font-semibold text-slate-100">#{channel.name}</p>
                    <div className="mt-3 space-y-2">
                      {(channel.messages || []).slice(0, 5).map((message: any) => (
                        <div key={message.id} className="rounded-2xl bg-white/5 px-3 py-2">
                          <p className="text-sm text-slate-200">{message.body}</p>
                          <p className="mt-1 text-xs text-slate-500">{message.sender?.name || user?.name || 'Staff'} | {new Date(message.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h2 className="text-lg font-semibold text-slate-100">Employee Documents</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <select value={documentDraft.userId} onChange={(e) => setDocumentDraft((c) => ({ ...c, userId: e.target.value }))} className="input">
                  <option value="">Select staff member</option>
                  {staff.map((row: any) => (
                    <option key={row.userId} value={row.userId}>{row.userName}</option>
                  ))}
                </select>
                <select value={documentDraft.documentType} onChange={(e) => setDocumentDraft((c) => ({ ...c, documentType: e.target.value }))} className="input">
                  <option value="policy_acknowledgement">Policy acknowledgement</option>
                  <option value="onboarding_packet">Onboarding packet</option>
                  <option value="certification">Certification</option>
                </select>
                <input value={documentDraft.title} onChange={(e) => setDocumentDraft((c) => ({ ...c, title: e.target.value }))} className="input md:col-span-2" placeholder="Handbook acknowledgement, food safety card, onboarding checklist..." />
              </div>
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => createDocumentMutation.mutate()} className="btn-primary" disabled={!documentDraft.userId || !documentDraft.title}>
                  Save Document Record
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {(overview?.documents || []).map((document: any) => (
                  <div key={document.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-sm font-semibold text-slate-100">{document.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{document.user?.name} | {document.documentType}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      Acknowledgements: {document.acknowledgements?.length || 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
