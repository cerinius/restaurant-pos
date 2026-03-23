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
import { LoadingNotice, SkeletonBlock } from '@/components/ui/LoadingState';

function ComboForm({
  combo,
  menuItems,
  onClose,
  onSaved,
}: {
  combo?: any;
  menuItems: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!combo;
  const [itemSearch, setItemSearch] = useState('');
  const [form, setForm] = useState({
    name: combo?.name || '',
    description: combo?.description || '',
    image: combo?.image || '',
    price: combo?.price ?? 0,
    isActive: combo?.isActive ?? true,
    items: (combo?.items || []).map((item: any) => ({
      menuItemId: item.menuItemId || item.menuItem?.id,
      quantity: item.quantity || 1,
      allowSubstitutions: item.allowSubstitutions || false,
    })),
  });

  const filteredItems = useMemo(() => {
    const search = itemSearch.trim().toLowerCase();
    if (!search) return menuItems;
    return menuItems.filter((item) => {
      const name = item.name?.toLowerCase() || '';
      const category = item.category?.name?.toLowerCase() || '';
      return name.includes(search) || category.includes(search);
    });
  }, [itemSearch, menuItems]);

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      isEdit ? api.updateCombo(combo.id, payload) : api.createCombo(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Combo updated' : 'Combo created');
      onSaved();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Unable to save combo'),
  });

  function toggleItem(menuItemId: string) {
    setForm((current) => {
      const exists = current.items.some((item: any) => item.menuItemId === menuItemId);
      return {
        ...current,
        items: exists
          ? current.items.filter((item: any) => item.menuItemId !== menuItemId)
          : [...current.items, { menuItemId, quantity: 1, allowSubstitutions: false }],
      };
    });
  }

  function updateSelectedItem(menuItemId: string, updates: any) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item: any) =>
        item.menuItemId === menuItemId ? { ...item, ...updates } : item
      ),
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card flex max-h-[90vh] w-full max-w-5xl flex-col shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">{isEdit ? 'Edit Combo' : 'New Combo'}</h2>
            <p className="text-sm text-slate-400">Bundle multiple items into a single offer.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-200">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="border-b border-slate-700 p-6 lg:border-b-0 lg:border-r">
            <div className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="input w-full"
                  placeholder="Lunch Duo"
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  className="input min-h-[96px] w-full"
                  placeholder="Entree with side and drink"
                />
              </div>

              <div>
                <label className="label">Image URL</label>
                <input
                  value={form.image}
                  onChange={(event) => setForm({ ...form, image: event.target.value })}
                  className="input w-full"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="label">Combo Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: Number(event.target.value) || 0 })}
                  className="input w-full"
                />
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                  className="h-4 w-4 accent-blue-500"
                />
                <span className="text-sm text-slate-200">Combo is available for sale</span>
              </label>

              <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                <p className="text-sm font-semibold text-slate-100">
                  Selected Items ({form.items.length})
                </p>
                <div className="mt-3 space-y-2">
                  {form.items.length === 0 ? (
                    <p className="text-sm text-slate-500">Choose at least one item from the list.</p>
                  ) : (
                    form.items.map((selection: any) => {
                      const item = menuItems.find((entry) => entry.id === selection.menuItemId);
                      return (
                        <div
                          key={selection.menuItemId}
                          className="rounded-xl border border-slate-700 bg-slate-950/80 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-100">{item?.name || 'Menu Item'}</p>
                              <p className="text-xs text-slate-500">{item?.category?.name || 'Uncategorized'}</p>
                            </div>
                            <button
                              onClick={() => toggleItem(selection.menuItemId)}
                              className="rounded-lg p-1 text-red-400 hover:bg-red-900/30"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="label">Quantity</label>
                              <input
                                type="number"
                                min="1"
                                value={selection.quantity}
                                onChange={(event) =>
                                  updateSelectedItem(selection.menuItemId, {
                                    quantity: Math.max(1, Number(event.target.value) || 1),
                                  })
                                }
                                className="input w-full"
                              />
                            </div>
                            <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selection.allowSubstitutions}
                                onChange={(event) =>
                                  updateSelectedItem(selection.menuItemId, {
                                    allowSubstitutions: event.target.checked,
                                  })
                                }
                                className="h-4 w-4 accent-blue-500"
                              />
                              <span className="text-sm text-slate-200">Allow substitutions</span>
                            </label>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col p-6">
            <div className="mb-4">
              <label className="label">Add Menu Items</label>
              <input
                value={itemSearch}
                onChange={(event) => setItemSearch(event.target.value)}
                className="input w-full"
                placeholder="Search by item or category"
              />
            </div>

            <div className="grid flex-1 gap-3 overflow-y-auto md:grid-cols-2">
              {filteredItems.map((item) => {
                const selected = form.items.some((entry: any) => entry.menuItemId === item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className={clsx(
                      'rounded-2xl border p-4 text-left transition-all',
                      selected
                        ? 'border-blue-500 bg-blue-600/15'
                        : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-100">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.category?.name || 'Uncategorized'}</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-300">
                        ${Number(item.basePrice || 0).toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                      {selected ? 'Included in this combo' : 'Click to include this item'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-700 px-6 py-4">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending || !form.name.trim() || form.items.length === 0}
            className="btn-primary flex-1"
          >
            {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save Combo' : 'Create Combo'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CombosPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCombo, setEditingCombo] = useState<any | null>(null);

  const { data: comboData, isLoading: combosLoading } = useQuery({
    queryKey: ['combos'],
    queryFn: () => api.getCombos(),
  });

  const { data: menuData, isLoading: menuItemsLoading } = useQuery({
    queryKey: ['combo-menu-items'],
    queryFn: () => api.getMenuItems(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCombo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      toast.success('Combo deactivated');
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Unable to deactivate combo'),
  });

  const combos: any[] = comboData?.data || [];
  const menuItems: any[] = menuData?.data || [];

  if ((combosLoading || menuItemsLoading) && combos.length === 0) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-slate-700 bg-slate-950/50 px-6 py-4">
          <SkeletonBlock className="h-7 w-28" />
          <SkeletonBlock className="mt-2 h-4 w-72" />
        </div>
        <div className="space-y-4 p-6">
          <LoadingNotice
            title="Loading combos"
            description="We are preparing bundle offers and available menu items."
          />
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-950/50 px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Combos</h1>
          <p className="text-sm text-slate-400">Build bundled offers from your current menu items.</p>
        </div>
        <button
          onClick={() => {
            setEditingCombo(null);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Add Combo
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {combos.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-semibold text-slate-100">No combos configured</p>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              Create meal bundles, value deals, or preset packages for the POS team to sell quickly.
            </p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-5">
              Create First Combo
            </button>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {combos.map((combo) => (
              <div key={combo.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-100">{combo.name}</h2>
                      <span
                        className={clsx(
                          'rounded-full border px-2 py-0.5 text-xs font-semibold',
                          combo.isActive
                            ? 'border-emerald-700/60 bg-emerald-900/40 text-emerald-200'
                            : 'border-slate-700 bg-slate-900/50 text-slate-400'
                        )}
                      >
                        {combo.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {combo.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-100">${Number(combo.price || 0).toFixed(2)}</p>
                    <p className="text-xs text-slate-500">{combo.items?.length || 0} item(s)</p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {(combo.items || []).map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-100">
                          {item.quantity || 1} x {item.menuItem?.name || 'Menu Item'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.allowSubstitutions ? 'Substitutions allowed' : 'Fixed selection'}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-300">
                        ${Number(item.menuItem?.basePrice || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingCombo(combo);
                      setShowForm(true);
                    }}
                    className="rounded-xl p-2 text-blue-400 transition-colors hover:bg-blue-900/30"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Deactivate combo "${combo.name}"?`)) {
                        deleteMutation.mutate(combo.id);
                      }
                    }}
                    className="rounded-xl p-2 text-red-400 transition-colors hover:bg-red-900/30"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <ComboForm
          combo={editingCombo || undefined}
          menuItems={menuItems}
          onClose={() => {
            setShowForm(false);
            setEditingCombo(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingCombo(null);
            queryClient.invalidateQueries({ queryKey: ['combos'] });
          }}
        />
      )}
    </div>
  );
}
