'use client';

import { useState } from 'react';
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
import { LoadingNotice, SkeletonBlock } from '@/components/ui/LoadingState';

function formatPriceAdjustment(value: number) {
  if (!value) return 'No price change';
  return `${value > 0 ? '+' : '-'}$${Math.abs(value).toFixed(2)}`;
}

function ModifierGroupForm({
  group,
  onClose,
  onSaved,
}: {
  group?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!group;
  const [form, setForm] = useState({
    name: group?.name || '',
    description: group?.description || '',
    type: group?.type || 'SINGLE',
    isRequired: group?.isRequired || false,
    minSelections: group?.minSelections ?? 0,
    maxSelections: group?.maxSelections ?? 1,
    sortOrder: group?.sortOrder ?? 0,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      isEdit ? api.updateModifierGroup(group.id, payload) : api.createModifierGroup(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Modifier group updated' : 'Modifier group created');
      onSaved();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Unable to save group'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              {isEdit ? 'Edit Modifier Group' : 'New Modifier Group'}
            </h2>
            <p className="text-sm text-slate-400">Configure how guests choose add-ons.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-200">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="label">Name</label>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="input w-full"
              placeholder="Choose a side"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="input min-h-[90px] w-full"
              placeholder="Optional notes for staff"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Selection Type</label>
              <select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
                className="input w-full"
              >
                <option value="SINGLE">Single choice</option>
                <option value="MULTIPLE">Multiple choice</option>
              </select>
            </div>

            <div>
              <label className="label">Sort Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) || 0 })}
                className="input w-full"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Minimum Selections</label>
              <input
                type="number"
                min="0"
                value={form.minSelections}
                onChange={(event) => setForm({ ...form, minSelections: Number(event.target.value) || 0 })}
                className="input w-full"
              />
            </div>

            <div>
              <label className="label">Maximum Selections</label>
              <input
                type="number"
                min="1"
                value={form.maxSelections}
                onChange={(event) => setForm({ ...form, maxSelections: Number(event.target.value) || 1 })}
                className="input w-full"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3">
            <input
              type="checkbox"
              checked={form.isRequired}
              onChange={(event) => setForm({ ...form, isRequired: event.target.checked })}
              className="h-4 w-4 accent-blue-500"
            />
            <span className="text-sm text-slate-200">Guests must choose from this group</span>
          </label>
        </div>

        <div className="flex gap-3 border-t border-slate-700 px-6 py-4">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending || !form.name.trim()}
            className="btn-primary flex-1"
          >
            {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModifierForm({
  groupId,
  modifier,
  onClose,
  onSaved,
}: {
  groupId: string;
  modifier?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!modifier;
  const [form, setForm] = useState({
    name: modifier?.name || '',
    priceAdjustment: modifier?.priceAdjustment ?? 0,
    isDefault: modifier?.isDefault || false,
    isAvailable: modifier?.isAvailable ?? true,
    sortOrder: modifier?.sortOrder ?? 0,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      isEdit ? api.updateModifier(modifier.id, payload) : api.addModifier(groupId, payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Modifier updated' : 'Modifier added');
      onSaved();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Unable to save modifier'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-100">
            {isEdit ? 'Edit Modifier' : 'Add Modifier'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-200">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="label">Name</label>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="input w-full"
              placeholder="Extra cheese"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Price Adjustment</label>
              <input
                type="number"
                step="0.01"
                value={form.priceAdjustment}
                onChange={(event) =>
                  setForm({ ...form, priceAdjustment: Number(event.target.value) || 0 })
                }
                className="input w-full"
              />
            </div>

            <div>
              <label className="label">Sort Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) || 0 })}
                className="input w-full"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(event) => setForm({ ...form, isDefault: event.target.checked })}
                className="h-4 w-4 accent-blue-500"
              />
              <span className="text-sm text-slate-200">Default selection</span>
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(event) => setForm({ ...form, isAvailable: event.target.checked })}
                className="h-4 w-4 accent-blue-500"
              />
              <span className="text-sm text-slate-200">Available for ordering</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-700 px-6 py-4">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending || !form.name.trim()}
            className="btn-primary flex-1"
          >
            {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save Modifier' : 'Add Modifier'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ModifiersPage() {
  const queryClient = useQueryClient();
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [editingModifier, setEditingModifier] = useState<any | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showModifierForm, setShowModifierForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['modifier-groups'],
    queryFn: () => api.getModifierGroups(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteModifier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modifier-groups'] });
      toast.success('Modifier deleted');
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Unable to delete modifier'),
  });

  const groups: any[] = data?.data || [];
  const showModifierSkeleton = isLoading && groups.length === 0;

  if (showModifierSkeleton) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-slate-700 bg-slate-950/50 px-6 py-4">
          <SkeletonBlock className="h-7 w-36" />
          <SkeletonBlock className="mt-2 h-4 w-64" />
        </div>

        <div className="space-y-4 p-6">
          <LoadingNotice
            title="Loading modifiers"
            description="We are preparing option groups and add-ons for the POS."
          />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card p-5">
              <SkeletonBlock className="h-6 w-44" />
              <SkeletonBlock className="mt-3 h-4 w-72" />
              <div className="mt-5 space-y-2">
                {Array.from({ length: 3 }).map((__, rowIndex) => (
                  <SkeletonBlock key={rowIndex} className="h-16 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-950/50 px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Modifiers</h1>
          <p className="text-sm text-slate-400">Manage option groups and individual add-ons.</p>
        </div>
        <button
          onClick={() => {
            setEditingGroup(null);
            setShowGroupForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Add Group
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {groups.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-semibold text-slate-100">No modifier groups yet</p>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              Create groups like sizes, sides, or toppings so the POS and KDS can capture order
              options correctly.
            </p>
            <button onClick={() => setShowGroupForm(true)} className="btn-primary mt-5">
              Create First Group
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.id} className="card p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-100">{group.name}</h2>
                      <span
                        className={clsx(
                          'rounded-full border px-2 py-1 text-xs font-semibold',
                          group.type === 'MULTIPLE'
                            ? 'border-cyan-700/60 bg-cyan-900/40 text-cyan-200'
                            : 'border-blue-700/60 bg-blue-900/40 text-blue-200'
                        )}
                      >
                        {group.type === 'MULTIPLE' ? 'Multiple Choice' : 'Single Choice'}
                      </span>
                      {group.isRequired && (
                        <span className="rounded-full border border-amber-700/60 bg-amber-900/40 px-2 py-1 text-xs font-semibold text-amber-200">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {group.description || 'No description provided.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>
                        Selection rule: {group.minSelections} min / {group.maxSelections} max
                      </span>
                      <span>{group.modifiers?.length || 0} modifier(s)</span>
                      <span>Sort order {group.sortOrder ?? 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveGroupId(group.id);
                        setEditingModifier(null);
                        setShowModifierForm(true);
                      }}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add Modifier
                    </button>
                    <button
                      onClick={() => {
                        setEditingGroup(group);
                        setShowGroupForm(true);
                      }}
                      className="rounded-xl p-2 text-blue-400 transition-colors hover:bg-blue-900/30"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-2">
                  {(group.modifiers || []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-5 text-sm text-slate-500">
                      No modifiers added yet.
                    </div>
                  ) : (
                    group.modifiers.map((modifier: any) => (
                      <div
                        key={modifier.id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-100">{modifier.name}</p>
                            {modifier.isDefault && (
                              <span className="rounded-full border border-emerald-700/60 bg-emerald-900/40 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                                Default
                              </span>
                            )}
                            {!modifier.isAvailable && (
                              <span className="rounded-full border border-red-700/60 bg-red-900/40 px-2 py-0.5 text-xs font-semibold text-red-200">
                                Unavailable
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-500">
                            <span>{formatPriceAdjustment(Number(modifier.priceAdjustment || 0))}</span>
                            <span>Sort order {modifier.sortOrder ?? 0}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setActiveGroupId(group.id);
                              setEditingModifier(modifier);
                              setShowModifierForm(true);
                            }}
                            className="rounded-xl p-2 text-blue-400 transition-colors hover:bg-blue-900/30"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete modifier "${modifier.name}"?`)) {
                                deleteMutation.mutate(modifier.id);
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

      {showGroupForm && (
        <ModifierGroupForm
          group={editingGroup || undefined}
          onClose={() => {
            setShowGroupForm(false);
            setEditingGroup(null);
          }}
          onSaved={() => {
            setShowGroupForm(false);
            setEditingGroup(null);
            queryClient.invalidateQueries({ queryKey: ['modifier-groups'] });
          }}
        />
      )}

      {showModifierForm && activeGroupId && (
        <ModifierForm
          groupId={activeGroupId}
          modifier={editingModifier || undefined}
          onClose={() => {
            setShowModifierForm(false);
            setEditingModifier(null);
            setActiveGroupId(null);
          }}
          onSaved={() => {
            setShowModifierForm(false);
            setEditingModifier(null);
            setActiveGroupId(null);
            queryClient.invalidateQueries({ queryKey: ['modifier-groups'] });
          }}
        />
      )}
    </div>
  );
}
