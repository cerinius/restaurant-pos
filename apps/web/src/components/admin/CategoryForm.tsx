
'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const DAY_PARTS = ['ALL_DAY', 'BREAKFAST', 'LUNCH', 'DINNER', 'LATE_NIGHT'];
const COLORS = ['#EF4444','#F97316','#EAB308','#22C55E','#3B82F6','#8B5CF6','#EC4899','#06B6D4','#14B8A6'];

interface Props {
  category?: any;
  onClose: () => void;
  onSaved: () => void;
}

export function CategoryForm({ category, onClose, onSaved }: Props) {
  const isEdit = !!category;
  const [form, setForm] = useState({
    name:        category?.name        || '',
    description: category?.description || '',
    color:       category?.color       || '#3B82F6',
    sortOrder:   category?.sortOrder   || 0,
    isActive:    category?.isActive    !== false,
    dayParts:    category?.dayParts    || ['ALL_DAY'],
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      isEdit ? api.updateCategory(category.id, payload) : api.createCategory(payload),
    onSuccess: () => { toast.success(isEdit ? 'Category updated!' : 'Category created!'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Save failed'),
  });

  const toggleDayPart = (dp: string) => {
    setForm((f) => ({
      ...f,
      dayParts: f.dayParts.includes(dp)
        ? f.dayParts.filter((d: string) => d !== dp)
        : [...f.dayParts, dp],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="font-bold text-slate-100">{isEdit ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="label">Category Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input w-full" placeholder="e.g. Appetizers" />
          </div>
          <div>
            <label className="label">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input w-full" placeholder="Optional" />
          </div>
          <div>
            <label className="label">Sort Order</label>
            <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) })} className="input w-full" min="0" />
          </div>

          {/* Color Picker */}
          <div>
            <label className="label">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={clsx('w-8 h-8 rounded-xl border-2 transition-all', form.color === c ? 'border-white scale-110' : 'border-transparent')}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Day Parts */}
          <div>
            <label className="label">Available During</label>
            <div className="flex gap-2 flex-wrap">
              {DAY_PARTS.map((dp) => (
                <button key={dp} type="button" onClick={() => toggleDayPart(dp)}
                  className={clsx('px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                    form.dayParts.includes(dp) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'
                  )}
                >
                  {dp.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-slate-300">Active (visible in POS)</span>
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
