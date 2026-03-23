
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { LoadingNotice, SkeletonBlock } from '@/components/ui/LoadingState';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function HappyHourForm({ hh, categories, onClose, onSaved }: any) {
  const isEdit = !!hh;
  const [form, setForm] = useState({
    name:          hh?.name          || '',
    startTime:     hh?.startTime     || '16:00',
    endTime:       hh?.endTime       || '18:00',
    daysOfWeek:    hh?.daysOfWeek    || [1,2,3,4,5],
    discountType:  hh?.discountType  || 'PERCENTAGE',
    discountValue: hh?.discountValue || 20,
    categoryIds:   hh?.categoryIds   || [],
    isActive:      hh?.isActive      !== false,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      isEdit ? api.updateHappyHour(hh.id, payload) : api.createHappyHour(payload),
    onSuccess: () => { toast.success(isEdit ? 'Updated!' : 'Created!'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Save failed'),
  });

  const toggleDay = (d: number) => setForm((f) => ({
    ...f,
    daysOfWeek: f.daysOfWeek.includes(d)
      ? f.daysOfWeek.filter((x: number) => x !== d)
      : [...f.daysOfWeek, d].sort(),
  }));

  const toggleCat = (id: string) => setForm((f) => ({
    ...f,
    categoryIds: f.categoryIds.includes(id)
      ? f.categoryIds.filter((x: string) => x !== id)
      : [...f.categoryIds, id],
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} className="card w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="font-bold text-slate-100">{isEdit ? 'Edit Happy Hour' : 'New Happy Hour'}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="label">Name</label>
            <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="input w-full" placeholder="Weekday Happy Hour" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Time</label>
              <input type="time" value={form.startTime} onChange={(e) => setForm({...form, startTime: e.target.value})} className="input w-full" />
            </div>
            <div>
              <label className="label">End Time</label>
              <input type="time" value={form.endTime} onChange={(e) => setForm({...form, endTime: e.target.value})} className="input w-full" />
            </div>
          </div>
          <div>
            <label className="label">Days of Week</label>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((d, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className={clsx('w-10 h-10 rounded-xl text-xs font-bold border transition-all',
                    form.daysOfWeek.includes(i) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'
                  )}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Discount Type</label>
              <select value={form.discountType} onChange={(e) => setForm({...form, discountType: e.target.value})} className="input w-full">
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT">Flat ($)</option>
              </select>
            </div>
            <div>
              <label className="label">Discount Value</label>
              <input type="number" value={form.discountValue} onChange={(e) => setForm({...form, discountValue: parseFloat(e.target.value)})} className="input w-full" min="0" />
            </div>
          </div>
          <div>
            <label className="label">Apply to Categories (leave empty for all)</label>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((cat: any) => (
                <button key={cat.id} type="button" onClick={() => toggleCat(cat.id)}
                  className={clsx('px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left',
                    form.categoryIds.includes(cat.id) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'
                  )}>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({...form, isActive: e.target.checked})} className="w-4 h-4 accent-blue-600" />
            <span className="text-sm text-slate-300">Active</span>
          </label>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-700">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name} className="btn-primary flex-1">
            {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function HappyHoursPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<any>(null);

  const { data: hhData, isLoading: happyHoursLoading }  = useQuery({ queryKey: ['happy-hours'],     queryFn: () => api.getHappyHours() });
  const { data: catData, isLoading: categoriesLoading } = useQuery({ queryKey: ['categories-admin'], queryFn: () => api.getCategories() });

  const happyHours: any[] = hhData?.data  || [];
  const categories: any[] = catData?.data || [];
  const showHappyHourSkeleton = (happyHoursLoading || categoriesLoading) && happyHours.length === 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteHappyHour(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['happy-hours'] }); toast.success('Deleted'); },
  });

  if (showHappyHourSkeleton) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-slate-700 bg-slate-950/50 px-6 py-4">
          <SkeletonBlock className="h-7 w-40" />
          <SkeletonBlock className="mt-2 h-4 w-44" />
        </div>
        <div className="space-y-4 p-6">
          <LoadingNotice
            title="Loading happy hour rules"
            description="We are syncing time-based pricing and category eligibility."
          />
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-950/50 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Happy Hours</h1>
          <p className="text-sm text-slate-400">Time-based pricing rules</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Add Happy Hour
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-3">
          {happyHours.map((hh: any) => (
            <div key={hh.id} className="card p-5 flex items-center gap-4">
              <div className={clsx('w-3 h-3 rounded-full shrink-0', hh.isActive ? 'bg-emerald-400' : 'bg-slate-500')} />
              <div className="flex-1">
                <p className="font-bold text-slate-100">{hh.name}</p>
                <p className="text-sm text-slate-400">
                  {hh.startTime} â {hh.endTime} Â· {hh.daysOfWeek.map((d: number) => DAYS[d]).join(', ')}
                </p>
                <p className="text-xs text-blue-400 mt-0.5">
                  {hh.discountType === 'PERCENTAGE' ? `${hh.discountValue}% off` : `$${hh.discountValue} off`}
                  {hh.categoryIds?.length > 0 ? ` Â· ${hh.categoryIds.length} categories` : ' Â· All items'}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(hh); setShowForm(true); }} className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-all">
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button onClick={() => { if(confirm('Delete this happy hour?')) deleteMutation.mutate(hh.id); }} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded-lg transition-all">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {happyHours.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <span className="text-4xl mb-3">ðº</span>
              <p>No happy hours configured yet</p>
              <button onClick={() => setShowForm(true)} className="btn-primary mt-4">Create Happy Hour</button>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <HappyHourForm
          hh={editing}
          categories={categories}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); qc.invalidateQueries({ queryKey: ['happy-hours'] }); }}
        />
      )}
    </div>
  );
}
