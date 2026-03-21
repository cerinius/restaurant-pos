
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
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
    item.modifierGroups?.forEach((mg: any) => {
      const group = mg.modifierGroup;
      const defaultMods = group.modifiers.filter((m: any) => m.isDefault);
      if (defaultMods.length > 0) {
        defaults[group.id] = defaultMods.map((m: any) => m.id);
      } else {
        defaults[group.id] = [];
      }
    });
    return defaults;
  });

  const toggleModifier = (groupId: string, modId: string, groupType: string, max: number) => {
    setSelected((prev) => {
      const current = prev[groupId] || [];
      if (groupType === 'SINGLE') {
        return { ...prev, [groupId]: [modId] };
      } else {
        if (current.includes(modId)) {
          return { ...prev, [groupId]: current.filter((id) => id !== modId) };
        }
        if (current.length >= max) {
          return { ...prev, [groupId]: [...current.slice(1), modId] };
        }
        return { ...prev, [groupId]: [...current, modId] };
      }
    });
  };

  const canConfirm = item.modifierGroups?.every((mg: any) => {
    const group = mg.modifierGroup;
    if (!group.isRequired) return true;
    return (selected[group.id] || []).length >= group.minSelections;
  });

  const handleConfirm = () => {
    const modifiers: any[] = [];
    item.modifierGroups?.forEach((mg: any) => {
      const group = mg.modifierGroup;
      const selectedIds = selected[group.id] || [];
      group.modifiers.forEach((mod: any) => {
        if (selectedIds.includes(mod.id)) {
          modifiers.push({
            modifierId: mod.id,
            modifierName: mod.name,
            groupName: group.name,
            priceAdjustment: mod.priceAdjustment,
          });
        }
      });
    });
    onConfirm(item, modifiers, notes, quantity);
    onClose();
  };

  const modifierTotal = Object.values(selected).flat().reduce((sum, modId) => {
    for (const mg of item.modifierGroups || []) {
      const mod = mg.modifierGroup.modifiers.find((m: any) => m.id === modId);
      if (mod) return sum + mod.priceAdjustment;
    }
    return sum;
  }, 0);

  const totalPrice = (item.basePrice + modifierTotal) * quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-100">{item.name}</h2>
            <p className="text-sm text-slate-400 mt-0.5">${item.basePrice.toFixed(2)} base price</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {item.modifierGroups?.map((mg: any) => {
            const group = mg.modifierGroup;
            return (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-slate-200 text-sm">{group.name}</h3>
                  {group.isRequired && (
                    <span className="text-xs px-1.5 py-0.5 bg-red-900/50 text-red-300 rounded-md border border-red-700/50 font-medium">
                      Required
                    </span>
                  )}
                  {group.maxSelections > 1 && (
                    <span className="text-xs text-slate-500">
                      (up to {group.maxSelections})
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {group.modifiers.map((mod: any) => {
                    const isSelected = (selected[group.id] || []).includes(mod.id);
                    return (
                      <button
                        key={mod.id}
                        onClick={() => toggleModifier(group.id, mod.id, group.type, group.maxSelections)}
                        disabled={!mod.isAvailable}
                        className={clsx(
                          'flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                          isSelected
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-blue-500',
                          !mod.isAvailable && 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        <span>{mod.name}</span>
                        {mod.priceAdjustment !== 0 && (
                          <span className={clsx('text-xs', isSelected ? 'text-blue-200' : 'text-slate-400')}>
                            {mod.priceAdjustment > 0 ? `+$${mod.priceAdjustment.toFixed(2)}` : `-$${Math.abs(mod.priceAdjustment).toFixed(2)}`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Notes */}
          <div>
            <label className="label">Special Instructions (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. no onions, extra sauce, allergy note..."
              rows={2}
              className="input w-full resize-none text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-700 space-y-3 shrink-0">
          {/* Quantity */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded-xl flex items-center justify-center transition-all"
              >
                <MinusIcon className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-100 text-lg w-6 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded-xl flex items-center justify-center transition-all"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="btn-primary w-full h-12 text-base"
          >
            Add to Order â ${totalPrice.toFixed(2)}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
