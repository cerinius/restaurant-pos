'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import api from '@/lib/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function PricingOverrideForm({
  item,
  override,
  onClose,
  onSaved,
}: {
  item: any;
  override?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!override;
  const [form, setForm] = useState({
    name: override?.name || '',
    price: override?.price ?? item?.basePrice ?? 0,
    startTime: override?.startTime || '16:00',
    endTime: override?.endTime || '18:00',
    daysOfWeek: override?.daysOfWeek || [1, 2, 3, 4, 5],
    isActive: override?.isActive ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      isEdit
        ? api.updatePricingOverride(override.id, payload)
        : api.createPricingOverride(item.id, payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Pricing override updated' : 'Pricing override created');
      onSaved();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Unable to save override'),
  });

  function toggleDay(day: number) {
    setForm((current) => ({
      ...current,
      daysOfWeek: current.daysOfWeek.includes(day)
        ? current.daysOfWeek.filter((value: number) => value !== day)
        : [...current.daysOfWeek, day].sort(),
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              {isEdit ? 'Edit Pricing Override' : 'New Pricing Override'}
            </h2>
            <p className="text-sm text-slate-400">
              {item.name} · Base price ${Number(item.basePrice || 0).toFixed(2)}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-200">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="label">Override Name</label>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="input w-full"
              placeholder="Weekday happy hour"
            />
          </div>

          <div>
            <label className="label">Override Price</label>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: Number(event.target.value) || 0 })}
              className="input w-full"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Start Time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(event) => setForm({ ...form, startTime: event.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="label">End Time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(event) => setForm({ ...form, endTime: event.target.value })}
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="label">Active Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((dayLabel, index) => (
                <button
                  key={dayLabel}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={clsx(
                    'rounded-xl border px-3 py-2 text-xs font-semibold transition-all',
                    form.daysOfWeek.includes(index)
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-slate-700 bg-slate-900 text-slate-300'
                  )}
                >
                  {dayLabel}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              className="h-4 w-4 accent-blue-500"
            />
            <span className="text-sm text-slate-200">Override is active</span>
          </label>
        </div>

        <div className="flex gap-3 border-t border-slate-700 px-6 py-4">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending || !form.name.trim() || form.daysOfWeek.length === 0}
            className="btn-primary flex-1"
          >
            {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save Override' : 'Create Override'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [editingOverride, setEditingOverride] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data } = useQuery({
    queryKey: ['pricing-menu-items'],
    queryFn: () => api.getMenuItems({ includeInactivePricing: true }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePricingOverride(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-menu-items'] });
      toast.success('Pricing override deleted');
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Unable to delete override'),
  });

  const items: any[] = data?.data || [];

  const filteredItems = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return items;
    return items.filter((item) => {
      const name = item.name?.toLowerCase() || '';
      const category = item.category?.name?.toLowerCase() || '';
      return name.includes(value) || category.includes(value);
    });
  }, [items, search]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-slate-700 bg-slate-950/50 px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Pricing</h1>
            <p className="text-sm text-slate-400">Manage time-based or channel-specific item pricing.</p>
          </div>

          <div className="w-full lg:max-w-sm">
            <label className="label">Search Menu Items</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input w-full"
              placeholder="Search by item or category"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {filteredItems.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-semibold text-slate-100">No matching menu items</p>
            <p className="mt-2 text-sm text-slate-400">
              Try a different search or create menu items first.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="card p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-100">{item.name}</h2>
                      <span className="rounded-full border border-slate-700 bg-slate-900/50 px-2 py-1 text-xs font-semibold text-slate-300">
                        {item.category?.name || 'Uncategorized'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      Base price ${Number(item.basePrice || 0).toFixed(2)}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setEditingOverride(null);
                      setShowForm(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Override
                  </button>
                </div>

                <div className="mt-5 space-y-2">
                  {(item.pricingOverrides || []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-5 text-sm text-slate-500">
                      No pricing overrides for this item.
                    </div>
                  ) : (
                    item.pricingOverrides.map((override: any) => (
                      <div
                        key={override.id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-100">{override.name}</p>
                            <span
                              className={clsx(
                                'rounded-full border px-2 py-0.5 text-xs font-semibold',
                                override.isActive
                                  ? 'border-emerald-700/60 bg-emerald-900/40 text-emerald-200'
                                  : 'border-slate-700 bg-slate-900/50 text-slate-400'
                              )}
                            >
                              {override.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-500">
                            <span>${Number(override.price || 0).toFixed(2)}</span>
                            <span>
                              {override.startTime} - {override.endTime}
                            </span>
                            <span>
                              {Array.isArray(override.daysOfWeek) && override.daysOfWeek.length > 0
                                ? override.daysOfWeek.map((day: number) => DAYS[day]).join(', ')
                                : 'No days selected'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setEditingOverride(override);
                              setShowForm(true);
                            }}
                            className="rounded-xl p-2 text-blue-400 transition-colors hover:bg-blue-900/30"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete pricing override "${override.name}"?`)) {
                                deleteMutation.mutate(override.id);
                              }
                            }}
                            className="rounded-xl p-2 text-red-400 transition-colors hover:bg-red-900/30"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && selectedItem && (
        <PricingOverrideForm
          item={selectedItem}
          override={editingOverride || undefined}
          onClose={() => {
            setShowForm(false);
            setSelectedItem(null);
            setEditingOverride(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setSelectedItem(null);
            setEditingOverride(null);
            queryClient.invalidateQueries({ queryKey: ['pricing-menu-items'] });
          }}
        />
      )}
    </div>
  );
}
