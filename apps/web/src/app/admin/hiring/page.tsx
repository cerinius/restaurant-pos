'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { useAuthStore } from '@/store';

export default function HiringPage() {
  const qc = useQueryClient();
  const { locationId } = useAuthStore();
  const [postingDraft, setPostingDraft] = useState({ title: '', department: 'Front of House', employmentType: 'part-time', description: '' });
  const [candidateDraft, setCandidateDraft] = useState({ firstName: '', lastName: '', email: '', phone: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['ops-hiring-page', locationId],
    queryFn: () => api.getHiringOverview({ locationId }),
  });

  const postings = data?.data || [];
  const firstPosting = postings[0];

  const createPostingMutation = useMutation({
    mutationFn: () => api.createJobPosting({ locationId, ...postingDraft }),
    onSuccess: async () => {
      toast.success('Job posting created');
      setPostingDraft({ title: '', department: 'Front of House', employmentType: 'part-time', description: '' });
      await qc.invalidateQueries({ queryKey: ['ops-hiring-page'] });
    },
  });

  const createCandidateMutation = useMutation({
    mutationFn: () => api.createCandidate(firstPosting.id, candidateDraft),
    onSuccess: async () => {
      toast.success('Candidate added');
      setCandidateDraft({ firstName: '', lastName: '', email: '', phone: '' });
      await qc.invalidateQueries({ queryKey: ['ops-hiring-page'] });
    },
  });

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Hiring and Onboarding</h1>
        <p className="mt-1 text-sm text-slate-400">Track requisitions and candidates in the platform, then pair them with onboarding documents in people ops.</p>
      </div>

      {isLoading ? (
        <div className="mt-6 text-sm text-slate-400">Loading hiring pipeline...</div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div className="card p-5">
              <h2 className="text-lg font-semibold text-slate-100">Open a Role</h2>
              <div className="mt-4 grid gap-3">
                <input value={postingDraft.title} onChange={(e) => setPostingDraft((c) => ({ ...c, title: e.target.value }))} className="input" placeholder="Server, Bartender, Host..." />
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={postingDraft.department} onChange={(e) => setPostingDraft((c) => ({ ...c, department: e.target.value }))} className="input" placeholder="Department" />
                  <input value={postingDraft.employmentType} onChange={(e) => setPostingDraft((c) => ({ ...c, employmentType: e.target.value }))} className="input" placeholder="part-time, full-time" />
                </div>
                <textarea value={postingDraft.description} onChange={(e) => setPostingDraft((c) => ({ ...c, description: e.target.value }))} className="input min-h-[140px]" placeholder="Role expectations, shift needs, certifications, and availability requirements..." />
                <div className="flex justify-end">
                  <button type="button" onClick={() => createPostingMutation.mutate()} className="btn-primary" disabled={!postingDraft.title}>
                    Create Posting
                  </button>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h2 className="text-lg font-semibold text-slate-100">Add Candidate</h2>
              <p className="mt-1 text-sm text-slate-400">Candidates attach to the most recent posting from this page.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input value={candidateDraft.firstName} onChange={(e) => setCandidateDraft((c) => ({ ...c, firstName: e.target.value }))} className="input" placeholder="First name" />
                <input value={candidateDraft.lastName} onChange={(e) => setCandidateDraft((c) => ({ ...c, lastName: e.target.value }))} className="input" placeholder="Last name" />
                <input value={candidateDraft.email} onChange={(e) => setCandidateDraft((c) => ({ ...c, email: e.target.value }))} className="input" placeholder="Email" />
                <input value={candidateDraft.phone} onChange={(e) => setCandidateDraft((c) => ({ ...c, phone: e.target.value }))} className="input" placeholder="Phone" />
              </div>
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => createCandidateMutation.mutate()} className="btn-primary" disabled={!firstPosting || !candidateDraft.firstName || !candidateDraft.lastName}>
                  Add Candidate
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {(postings || []).map((posting: any) => (
              <div key={posting.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">{posting.title}</h2>
                    <p className="mt-1 text-sm text-slate-400">{posting.department} | {posting.employmentType} | {posting.status}</p>
                  </div>
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-slate-300">
                    {posting.candidates?.length || 0} candidates
                  </span>
                </div>
                {posting.description && <p className="mt-4 text-sm leading-6 text-slate-300">{posting.description}</p>}
                <div className="mt-5 space-y-3">
                  {(posting.candidates || []).map((candidate: any) => (
                    <div key={candidate.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-sm font-semibold text-slate-100">{candidate.firstName} {candidate.lastName}</p>
                      <p className="mt-1 text-xs text-slate-400">{candidate.email || candidate.phone || 'No contact saved'} | {candidate.stage}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
