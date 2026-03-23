'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GiftIcon,
  PlusIcon,
  StopIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import api from '@/lib/api';

function GiftCardForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    code: '',
    balance: 25,
    expiresAt: '',
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => api.createGiftCard(payload),
    onSuccess: () => {
      toast.success('Gift card created');
      onSaved();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Unable to create gift card'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Create Gift Card</h2>
            <p className="text-sm text-slate-400">Issue a new card balance for guests.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-200">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="label">Code</label>
            <input
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              className="input w-full"
              placeholder="Leave blank to auto-generate"
            />
          </div>

          <div>
            <label className="label">Initial Balance</label>
            <input
              type="number"
              step="0.01"
              value={form.balance}
              onChange={(event) => setForm({ ...form, balance: Number(event.target.value) || 0 })}
              className="input w-full"
            />
          </div>

          <div>
            <label className="label">Expiration Date</label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
              className="input w-full"
            />
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-700 px-6 py-4">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={() =>
              saveMutation.mutate({
                ...form,
                code: form.code.trim() || undefined,
                expiresAt: form.expiresAt || undefined,
              })
            }
            disabled={saveMutation.isPending || form.balance <= 0}
            className="btn-primary flex-1"
          >
            {saveMutation.isPending ? 'Saving...' : 'Create Gift Card'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GiftCardsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data } = useQuery({
    queryKey: ['gift-cards'],
    queryFn: () => api.getGiftCards(),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.deactivateGiftCard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
      toast.success('Gift card deactivated');
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Unable to deactivate gift card'),
  });

  const cards: any[] = data?.data || [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-950/50 px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Gift Cards</h1>
          <p className="text-sm text-slate-400">Issue, monitor, and deactivate stored-value cards.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          Create Gift Card
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {cards.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <GiftIcon className="h-12 w-12 text-slate-500" />
            <p className="mt-4 text-lg font-semibold text-slate-100">No gift cards issued yet</p>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              Create cards here so staff can redeem them during payment.
            </p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-5">
              Create First Gift Card
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {cards.map((card) => (
              <div key={card.id} className="card overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600/20 to-blue-600/10 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Gift Card</p>
                      <h2 className="mt-2 font-mono text-lg font-bold text-slate-100">{card.code}</h2>
                    </div>
                    <span
                      className={clsx(
                        'rounded-full border px-2 py-1 text-xs font-semibold',
                        card.isActive
                          ? 'border-emerald-700/60 bg-emerald-900/40 text-emerald-200'
                          : 'border-slate-700 bg-slate-900/50 text-slate-400'
                      )}
                    >
                      {card.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Balance</p>
                      <p className="mt-1 text-2xl font-black text-slate-100">
                        ${Number(card.balance || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Issued</p>
                      <p className="mt-1 text-2xl font-black text-slate-100">
                        ${Number(card.initialValue || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm text-slate-400">
                    <p>
                      Created:{' '}
                      {card.createdAt ? new Date(card.createdAt).toLocaleDateString() : 'Unknown'}
                    </p>
                    <p>
                      Expires:{' '}
                      {card.expiresAt ? new Date(card.expiresAt).toLocaleDateString() : 'Never'}
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        if (confirm(`Deactivate gift card "${card.code}"?`)) {
                          deactivateMutation.mutate(card.id);
                        }
                      }}
                      disabled={!card.isActive || deactivateMutation.isPending}
                      className="rounded-xl border border-red-800/60 bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-200 transition-colors hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <StopIcon className="h-4 w-4" />
                        Deactivate
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <GiftCardForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
          }}
        />
      )}
    </div>
  );
}
