
'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { motion } from 'framer-motion';

const DAY_PARTS = ['ALL_DAY', 'BREAKFAST', 'LUNCH', 'DINNER', 'LATE_NIGHT'];

interface Props {
  item?: any;
  categoryId?: string;
  categories: any[];
  modifierGroups: any[];
  onClose: () => void;
  onSaved: () => void;
}

export function MenuItemForm({ item, categoryId, categories, modifierGroups, onClose, onSaved }: Props) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    name:         item?.name         || '',
    description:  item?.description  || '',
    basePrice:    item?.basePrice    || '',
    categoryId:   item?.categoryId   || categoryId || categories[0]?.id || '',
    stationId:    item?.stationId    || '',
    prepTime:     item?.prepTime     || 10,
    calories:     item?.calories     || '',
    sku:          item?.sku          || '',
    isPopular:    item?.isPopular    || false,
    isFeatured:   item?.isFeatured   || false,
    dayParts:     item?.dayParts     || ['ALL_DAY'],
    allergens:    (item?.allergens   || []).join(', '),
    tags:         (item?.tags        || []).join(', '),
    selectedModGroups: (item?.modifierGroups || []).map((mg: any) => mg.modifierGroupId) as string[],
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      isEdit ? api.updateMenuItem(item.id, payload) : api.createMenuItem(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Item updated!' : 'Item created!');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Save failed'),
  });

  const handleSubmit = () => {
    if (!form.name || !form.basePrice || !form.categoryId) {
      toast.error('Name, price, and category are required');
      return;
    }
    saveMutation.mutate({
      name: form.name,
      description: form.description || undefined,
      basePrice: parseFloat(form.basePrice as string),
      categoryId: form.categoryId,
      stationId: form.stationId || undefined,
      prepTime: parseInt(form.prepTime as string),
      calories: form.calories ? parseInt(form.calories as string) : undefined,
      sku: form.sku || undefined,
      isPopular: form.isPopular,
      isFeatured: form.isFeatured,
      dayParts: form.dayParts,
      allergens: form.allergens ? form.allergens.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      tags: form.tags ? form.tags.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      modifierGroupIds: form.selectedModGroups,
    });
  };

  const toggleDayPart = (dp: string) => {
    setForm((f) => ({
      ...f,
      dayParts: f.dayParts.includes(dp)
        ? f.dayParts.filter((d: string) => d !== dp)
        : [...f.dayParts, dp],
    }));
  };

  const toggleModGroup = (id: string) => {
    setForm((f) => ({
      ...f,
      selectedModGroups: f.selectedModGroups.includes(id)
        ? f.selectedModGroups.filter((x: string) => x !== id)
        : [...f.selectedModGroups, id],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <h2 className="text-lg font-bold text-slate-100">
            {isEdit ? `Edit: ${item.name}` : 'New Menu Item'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Item Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input w-full" placeholder="e.g. Classic Burger" />
            </div>
            <div>
              <label className="label">Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} className="input w-full pl-7" placeholder="0.00" step="0.01" />
              </div>
            </div>
            <div>
              <label className="label">Prep Time (min)</label>
              <input type="number" value={form.prepTime} onChange={(e) => setForm({ ...form, prepTime: e.target.value })} className="input w-full" min="0" />
            </div>
            <div>
              <label className="label">Category *</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="input w-full">
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Calories</label>
              <input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} className="input w-full" placeholder="Optional" />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="input w-full resize-none" placeholder="Short description" />
            </div>
            <div>
              <label className="label">SKU</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input w-full" placeholder="Optional" />
            </div>
            <div>
              <label className="label">Allergens (comma-separated)</label>
              <input value={form.allergens} onChange={(e) => setForm({ ...form, allergens: e.target.value })} className="input w-full" placeholder="dairy, gluten, nuts" />
            </div>
          </div>

          {/* Day Parts */}
          <div>
            <label className="label">Available During</label>
            <div className="flex gap-2 flex-wrap">
              {DAY_PARTS.map((dp) => (
                <button
                  key={dp}
                  type="button"
                  onClick={() => toggleDayPart(dp)}
                  className={clsx('px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                    form.dayParts.includes(dp)
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-300'
                  )}
                >
                  {dp.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Flags */}
          <div className="flex gap-4">
            {[
              { key: 'isPopular',  label: 'â­ Popular' },
              { key: 'isFeatured', label: 'ð Featured' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm text-slate-300">{label}</span>
              </label>
            ))}
          </div>

          {/* Modifier Groups */}
          {modifierGroups.length > 0 && (
            <div>
              <label className="label">Modifier Groups</label>
              <div className="grid grid-cols-2 gap-2">
                {modifierGroups.map((mg: any) => (
                  <button
                    key={mg.id}
                    type="button"
                    onClick={() => toggleModGroup(mg.id)}
                    className={clsx('flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-all',
                      form.selectedModGroups.includes(mg.id)
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-blue-500'
                    )}
                  >
                    <span>{mg.name}</span>
                    <span className={clsx('text-xs', form.selectedModGroups.includes(mg.id) ? 'text-blue-200' : 'text-slate-500')}>
                      {mg.isRequired ? 'Required' : 'Optional'} Â· {mg.modifiers?.length || 0} opts
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-700 shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSubmit} disabled={saveMutation.isPending} className="btn-primary flex-1">
            {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Item'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
