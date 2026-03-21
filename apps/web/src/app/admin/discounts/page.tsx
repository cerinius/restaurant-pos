
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import clsx from 'clsx';

function DiscountForm({ discount, onClose, onSaved }: any) {
  const isEdit = !!discount;
  const [form, setForm] = useState({
    name:                     discount?.name                     || '',
    type:                     discount?.type                     || 'PERCENTAGE',
    value:                    discount?.value                    || '',
    requiresManagerApproval:  discount?.requiresManagerApproval  || false,
    code:                     discount?.code                     || '',
    maxUses:                  discount?.maxUses                  || '',
    isActive:                 discount?.isActive                 !== false,
  });

  const saveMutation = useMutation({
    mutationFn: (p: any) => isEdit ? api.updateDiscount(discount.id, p) : api.createDiscount(p),
    onSuccess: () => { toast.success('Saved!'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Save failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
        className="card w-full max-w-md p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-slate-100">{isEdit ? 'Edit Discount' : 'New Discount'}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Discount Name</label>
            <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
              className="input w-full" placeholder="e.g. Staff Meal, Happy Hour" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className="input w-full">
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT">Flat ($)</option>
                <option value="COMP">Full Comp</option>
              </select>
            </div>
            <div>
              <label className="label">Value</label>
              <input type="number" value={form.value}
                onChange={(e) => setForm({...form, value: e.target.value})}
                className="input w-full" min="0"
                disabled={form.type === 'COMP'}
                placeholder={form.type === 'COMP' ? '100' : form.type === 'PERCENTAGE' ? '10' : '5.00'}
              />
            </div>
          </div>
          <div>
            <label className="label">Promo Code (optional)</label>
            <input value={form.code} onChange={(e) => setForm({...form, code: e.target.value.toUpperCase()})}
              className="input w-full font-mono" placeholder="SUMMER20" />
          </div>
          <div>
            <label className="label">Max Uses (optional, blank = unlimited)</label>
            <input type="number" value={form.maxUses}
              onChange={(e) => setForm({...form, maxUses: e.target.value})}
              className="input w-full" min="1" placeholder="Unlimited" />
          </div>
          <div className="space-y-2">
            {[
              { key: 'requiresManagerApproval', label: 'Requires manager approval to apply' },
              { key: 'isActive', label: 'Active' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(form as any)[key]}
                  onChange={(e) => setForm({...form, [key]: e.target.checked})}
                  className="w-4 h-4 accent-blue-600 rounded" />
                <span className="text-sm text-slate-300">{label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => saveMutation.mutate({
              name: form.name,
              type: form.type,
              value: form.type === 'COMP' ? 100 : parseFloat(form.value as string),
              requiresManagerApproval: form.requiresManagerApproval,
              code: form.code || undefined,
              maxUses: form.maxUses ? parseInt(form.maxUses as string) : undefined,
              isActive: form.isActive,
            })}
            disabled={saveMutation.isPending || !form.name || (!form.value && form.type !== 'COMP')}
            className="btn-primary flex-1"
          >
            {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function DiscountsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<any>(null);

  const { data } = useQuery({ queryKey: ['discounts'], queryFn: () => api.getDiscounts() });
  const discounts: any[] = data?.data || [];

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.updateDiscount(id, { isActive: false }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['discounts'] }); toast.success('Deactivated'); },
  });

  const TYPE_BADGE: Record<string, string> = {
    PERCENTAGE: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
    FLAT:       'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
    COMP:       'bg-red-900/50 text-red-300 border-red-700/50',
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-950/50 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Discounts</h1>
          <p className="text-sm text-slate-400">{discounts.length} discount rules</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Add Discount
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {discounts.map((d: any) => (
            <div key={d.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-100">{d.name}</p>
                  {d.code && (
                    <span className="text-xs font-mono bg-slate-700 text-slate-300 px-2 py-0.5 rounded mt-1 inline-block">
                      {d.code}
                    </span>
                  )}
                </div>
                <span className={clsx('text-xs px-2 py-0.5 rounded border font-bold shrink-0', TYPE_BADGE[d.type] || TYPE_BADGE.FLAT)}>
                  {d.type === 'PERCENTAGE' ? `${d.value}%` : d.type === 'COMP' ? 'COMP' : `$${d.value}`}
                </span>
              </div>
              <div className="space-y-1 text-xs text-slate-400">
                {d.requiresManagerApproval && <p>ð Requires manager approval</p>}
                {d.maxUses && <p>ð Max uses: {d.maxUses} (used: {d.useCount})</p>}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-700">
                <span className={clsx('text-xs font-medium', d.isActive ? 'text-emerald-400' : 'text-slate-500')}>
                  {d.isActive ? 'â Active' : 'â Inactive'}
                </span>
                <button onClick={() => { setEditing(d); setShowForm(true); }}
                  className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-all">
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {discounts.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center py-16 text-slate-500">
              <span className="text-4xl mb-3">ð·ï¸</span>
              <p>No discounts configured yet</p>
              <button onClick={() => setShowForm(true)} className="btn-primary mt-4">Create Discount</button>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <DiscountForm
          discount={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); qc.invalidateQueries({ queryKey: ['discounts'] }); }}
        />
      )}
    </div>
  );
}
