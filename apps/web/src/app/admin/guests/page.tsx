'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MagnifyingGlassIcon, PlusIcon, TagIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { useAuthStore } from '@/store';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
}

export default function GuestsPage() {
  const qc = useQueryClient();
  const { locationId } = useAuthStore();
  const [search, setSearch] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [tagDraft, setTagDraft] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['ops-guests', locationId, search],
    queryFn: () => api.getGuests({ locationId, search }),
  });

  const guests = data?.data || [];
  const selectedGuest = useMemo(
    () => guests.find((guest: any) => guest.id === selectedGuestId) || guests[0] || null,
    [guests, selectedGuestId]
  );

  const detailQuery = useQuery({
    queryKey: ['ops-guest-detail', selectedGuest?.id],
    queryFn: () => api.getGuest(selectedGuest.id),
    enabled: !!selectedGuest?.id,
  });

  const saveNoteMutation = useMutation({
    mutationFn: () => api.addGuestNote(selectedGuest.id, { body: noteDraft }),
    onSuccess: async () => {
      toast.success('Guest note saved');
      setNoteDraft('');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['ops-guests'] }),
        qc.invalidateQueries({ queryKey: ['ops-guest-detail', selectedGuest?.id] }),
      ]);
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Could not save guest note'),
  });

  const saveTagsMutation = useMutation({
    mutationFn: () =>
      api.updateGuestTags(
        selectedGuest.id,
        tagDraft
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      ),
    onSuccess: async () => {
      toast.success('Guest tags updated');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['ops-guests'] }),
        qc.invalidateQueries({ queryKey: ['ops-guest-detail', selectedGuest?.id] }),
      ]);
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Could not update tags'),
  });

  const stats = useMemo(
    () => ({
      total: guests.length,
      vip: guests.filter((guest: any) => guest.isVip).length,
      spend: guests.reduce((sum: number, guest: any) => sum + Number(guest.totalSpend || 0), 0),
      atRisk: guests.filter((guest: any) => {
        if (!guest.lastVisitAt) return false;
        return Date.now() - new Date(guest.lastVisitAt).getTime() > 1000 * 60 * 60 * 24 * 30;
      }).length,
    }),
    [guests]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-700 bg-slate-950/60 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Guest CRM</h1>
            <p className="text-sm text-slate-400">Real guest profiles built from reservations and order history, with service notes and segmentation tags.</p>
          </div>
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search guests by name, email, or phone"
              className="input w-full pl-9"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ['Profiles', String(stats.total), 'Synced from real reservation and order activity'],
            ['VIP Guests', String(stats.vip), 'Guests flagged for elevated service'],
            ['Total Spend', formatCurrency(stats.spend), 'Lifetime tracked spend in CRM'],
            ['At Risk', String(stats.atRisk), 'Guests inactive for more than 30 days'],
          ].map(([label, value, sub]) => (
            <div key={label} className="card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
              <p className="mt-2 text-xl font-bold text-slate-100">{value}</p>
              <p className="text-xs text-slate-400">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid flex-1 min-h-0 gap-0 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-auto border-r border-slate-800">
          {isLoading ? (
            <div className="p-6 text-sm text-slate-400">Loading guest profiles...</div>
          ) : guests.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">No guests found yet. Reservations and customer orders will populate CRM profiles automatically.</div>
          ) : (
            <div className="p-4">
              <div className="grid gap-3 md:grid-cols-2">
                {guests.map((guest: any) => (
                  <button
                    key={guest.id}
                    type="button"
                    onClick={() => {
                      setSelectedGuestId(guest.id);
                      setTagDraft((guest.tagLinks || []).map((entry: any) => entry.tag.name).join(', '));
                    }}
                    className={`rounded-3xl border p-4 text-left transition-all ${
                      (selectedGuest?.id || '') === guest.id
                        ? 'border-cyan-300/40 bg-cyan-400/10'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{guest.fullName}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {guest.email || guest.phone || 'No direct contact saved'}
                        </p>
                      </div>
                      {guest.isVip && (
                        <span className="rounded-full bg-amber-400/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-2xl bg-white/5 p-3">
                        <p className="text-lg font-bold text-slate-100">{guest.visitCount}</p>
                        <p className="text-[11px] text-slate-500">Visits</p>
                      </div>
                      <div className="rounded-2xl bg-white/5 p-3">
                        <p className="text-lg font-bold text-slate-100">{formatCurrency(guest.totalSpend)}</p>
                        <p className="text-[11px] text-slate-500">Spend</p>
                      </div>
                      <div className="rounded-2xl bg-white/5 p-3">
                        <p className="text-lg font-bold text-slate-100">{formatCurrency(guest.averageCheck)}</p>
                        <p className="text-[11px] text-slate-500">Avg Check</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(guest.tagLinks || []).slice(0, 3).map((entry: any) => (
                        <span key={entry.tag.id} className="rounded-full bg-white/8 px-2 py-1 text-[11px] font-semibold text-slate-300">
                          {entry.tag.name}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="overflow-auto p-6">
          {!selectedGuest ? (
            <div className="rounded-3xl border border-dashed border-slate-700 p-8 text-sm text-slate-400">
              Select a guest to review reservation history, order behavior, tags, and service notes.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-bold text-slate-100">{detailQuery.data?.data?.fullName || selectedGuest.fullName}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {selectedGuest.email || selectedGuest.phone || 'No direct contact saved'}
                    </p>
                  </div>
                  {selectedGuest.isVip && (
                    <span className="rounded-full bg-amber-400/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200">
                      VIP service
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Visits</p>
                    <p className="mt-2 text-xl font-bold text-slate-100">{selectedGuest.visitCount}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Lifetime Spend</p>
                    <p className="mt-2 text-xl font-bold text-slate-100">{formatCurrency(selectedGuest.totalSpend)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Last Visit</p>
                    <p className="mt-2 text-xl font-bold text-slate-100">
                      {selectedGuest.lastVisitAt ? new Date(selectedGuest.lastVisitAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <TagIcon className="h-4 w-4 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-100">Segmentation Tags</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(detailQuery.data?.data?.tagLinks || []).map((entry: any) => (
                    <span key={entry.tag.id} className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                      {entry.tag.name}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <input
                    value={tagDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    className="input min-w-[260px] flex-1"
                    placeholder="vip, birthday, corporate"
                  />
                  <button type="button" onClick={() => saveTagsMutation.mutate()} className="btn-secondary">
                    Update Tags
                  </button>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <div className="card p-5">
                  <p className="text-sm font-semibold text-slate-100">Recent Reservations</p>
                  <div className="mt-4 space-y-3">
                    {(detailQuery.data?.data?.reservations || []).slice(0, 6).map((reservation: any) => (
                      <div key={reservation.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                        <p className="text-sm font-semibold text-slate-100">
                          {new Date(reservation.reservationAt).toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {reservation.partySize} covers | {reservation.status.replace(/_/g, ' ').toLowerCase()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-5">
                  <p className="text-sm font-semibold text-slate-100">Recent Orders</p>
                  <div className="mt-4 space-y-3">
                    {(detailQuery.data?.data?.orders || []).slice(0, 6).map((order: any) => (
                      <div key={order.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                        <p className="text-sm font-semibold text-slate-100">
                          {formatCurrency(order.total)} | {order.serverName || 'No server'}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(order.createdAt).toLocaleString()} | {order.tableName || 'No table'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-100">Service Notes</p>
                  <button type="button" className="rounded-full bg-white/8 p-2 text-slate-300">
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  className="input mt-4 min-h-[110px] w-full"
                  placeholder="Add meaningful service context: favorite table, allergy handling, pacing preferences, business dining patterns..."
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => saveNoteMutation.mutate()}
                    disabled={!noteDraft.trim()}
                    className="btn-primary"
                  >
                    Save Note
                  </button>
                </div>
                <div className="mt-5 space-y-3">
                  {(detailQuery.data?.data?.notesLog || []).map((note: any) => (
                    <div key={note.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-sm text-slate-200">{note.body}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {note.author?.name || 'System'} | {new Date(note.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
