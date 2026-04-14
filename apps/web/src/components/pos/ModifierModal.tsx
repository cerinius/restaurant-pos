'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MinusIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface Props {
  item: any;
  onConfirm: (item: any, modifiers: any[], notes: string, quantity: number) => void;
  onClose: () => void;
}

export function ModifierModal({ item, onConfirm, onClose }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const defaults: Record<string, string[]> = {};

    item.modifierGroups?.forEach((entry: any) => {
      const group = entry.modifierGroup;
      const defaultMods = group.modifiers.filter((modifier: any) => modifier.isDefault);
      defaults[group.id] = defaultMods.map((modifier: any) => modifier.id);
    });

    return defaults;
  });

  const toggleModifier = (groupId: string, modifierId: string, groupType: string, max: number) => {
    setSelected((current) => {
      const currentSelection = current[groupId] || [];

      if (groupType === 'SINGLE') {
        return { ...current, [groupId]: [modifierId] };
      }

      if (currentSelection.includes(modifierId)) {
        return { ...current, [groupId]: currentSelection.filter((id) => id !== modifierId) };
      }

      if (currentSelection.length >= max) {
        return { ...current, [groupId]: [...currentSelection.slice(1), modifierId] };
      }

      return { ...current, [groupId]: [...currentSelection, modifierId] };
    });
  };

  const canConfirm = item.modifierGroups?.every((entry: any) => {
    const group = entry.modifierGroup;
    if (!group.isRequired) return true;
    return (selected[group.id] || []).length >= group.minSelections;
  });

  const handleConfirm = () => {
    const modifiers: any[] = [];

    item.modifierGroups?.forEach((entry: any) => {
      const group = entry.modifierGroup;
      const selectedIds = selected[group.id] || [];

      group.modifiers.forEach((modifier: any) => {
        if (selectedIds.includes(modifier.id)) {
          modifiers.push({
            modifierId: modifier.id,
            modifierName: modifier.name,
            groupName: group.name,
            priceAdjustment: modifier.priceAdjustment,
          });
        }
      });
    });

    onConfirm(item, modifiers, notes, quantity);
    onClose();
  };

  const modifierTotal = Object.values(selected).flat().reduce((sum, modifierId) => {
    for (const entry of item.modifierGroups || []) {
      const modifier = entry.modifierGroup.modifiers.find((candidate: any) => candidate.id === modifierId);
      if (modifier) return sum + Number(modifier.priceAdjustment || 0);
    }
    return sum;
  }, 0);

  const totalPrice = (Number(item.basePrice || 0) + modifierTotal) * quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm md:items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="card flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden"
      >
        <div className="ops-toolbar flex items-start justify-between gap-3 px-5 py-5">
          <div>
            <p className="section-kicker">Customize item</p>
            <h2 className="mt-1 text-2xl font-black text-white">{item.name}</h2>
            <p className="mt-1 text-base font-semibold text-amber-300">${Number(item.basePrice || 0).toFixed(2)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-0 overflow-y-auto px-5 py-5">
            <div className="space-y-6">
              {item.modifierGroups?.map((entry: any) => {
                const group = entry.modifierGroup;

                return (
                  <section key={group.id} className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-100">{group.name}</h3>
                      {group.isRequired && (
                        <span className="rounded-full border border-red-300/20 bg-red-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-red-100">
                          Required
                        </span>
                      )}
                      {group.maxSelections > 1 && (
                        <span className="text-sm text-slate-500">Choose up to {group.maxSelections}</span>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {group.modifiers.map((modifier: any) => {
                        const isSelected = (selected[group.id] || []).includes(modifier.id);

                        return (
                          <button
                            key={modifier.id}
                            type="button"
                            onClick={() => toggleModifier(group.id, modifier.id, group.type, group.maxSelections)}
                            disabled={!modifier.isAvailable}
                            className={clsx(
                              'touch-target flex min-h-[72px] items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all',
                              isSelected
                                ? 'border-amber-300/30 bg-amber-300 text-slate-950'
                                : 'border-white/10 bg-white/[0.03] text-slate-100 hover:bg-white/[0.08]',
                              !modifier.isAvailable && 'cursor-not-allowed opacity-45',
                            )}
                          >
                            <span className="text-sm font-bold">{modifier.name}</span>
                            {Number(modifier.priceAdjustment || 0) !== 0 && (
                              <span className={clsx('text-sm font-semibold', isSelected ? 'text-slate-950/70' : 'text-slate-400')}>
                                {Number(modifier.priceAdjustment) > 0
                                  ? `+$${Number(modifier.priceAdjustment).toFixed(2)}`
                                  : `-$${Math.abs(Number(modifier.priceAdjustment)).toFixed(2)}`}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              <section className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                <label className="label">Special instructions</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="No onions, extra sauce, allergy note..."
                  rows={4}
                  className="input w-full resize-none rounded-2xl text-base"
                />
              </section>
            </div>
          </div>

          <aside className="border-t border-white/10 bg-slate-950/45 p-5 lg:border-l lg:border-t-0">
            <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Quantity</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="touch-target inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10"
                >
                  <MinusIcon className="h-6 w-6" />
                </button>
                <span className="min-w-[3rem] text-center text-3xl font-black text-white">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="touch-target inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10"
                >
                  <PlusIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Total</p>
              <p className="mt-2 text-3xl font-black text-amber-300">${totalPrice.toFixed(2)}</p>
              <p className="mt-2 text-sm text-slate-500">Includes modifiers and quantity.</p>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="touch-target mt-4 flex w-full items-center justify-center rounded-2xl bg-emerald-400 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
            >
              Add to Order
            </button>
          </aside>
        </div>
      </motion.div>
    </div>
  );
}
