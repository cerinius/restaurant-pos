'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import api from '@/lib/api';

type Tax = {
  id: string;
  name: string;
  type: 'PERCENTAGE' | 'FLAT';
  rate: number;
  isDefault?: boolean;
  appliesToAll?: boolean;
  createdAt?: string;
};

type TaxPayload = {
  name: string;
  type: 'PERCENTAGE' | 'FLAT';
  rate: number;
  isDefault: boolean;
  appliesToAll: boolean;
};

function TaxForm({
  tax,
  onClose,
  onSaved,
}: {
  tax?: Tax | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!tax;

  const [form, setForm] = useState({
    name: tax?.name || '',
    type: (tax?.type || 'PERCENTAGE') as 'PERCENTAGE' | 'FLAT',
    rate: tax?.rate?.toString() || '',
    isDefault: tax?.isDefault || false,
    appliesToAll: tax?.appliesToAll !== false,
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (payload: TaxPayload) => {
      if (isEdit && tax?.id) {
        return api.updateTax(tax.id, payload);
      }
      return api.createTax(payload);
    },
    onSuccess: async () => {
      toast.success(isEdit ? 'Tax updated' : 'Tax created');
      await queryClient.invalidateQueries({ queryKey: ['taxes'] });
      onSaved();
    },
    onError: () => {
      toast.error('Save failed');
    },
  });

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error('Tax name is required');
      return;
    }

    const parsedRate = Number(form.rate);

    if (Number.isNaN(parsedRate) || parsedRate < 0) {
      toast.error('Enter a valid tax rate');
      return;
    }

    saveMutation.mutate({
      name: form.name.trim(),
      type: form.type,
      rate: parsedRate,
      isDefault: form.isDefault,
      appliesToAll: form.appliesToAll,
    } as TaxPayload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="card w-full max-w-md rounded-2xl p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">
            {isEdit ? 'Edit Tax' : 'New Tax'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 transition hover:text-slate-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input w-full"
              placeholder="Sales Tax"
            />
          </div>

          <div>
            <label className="label">Type</label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as 'PERCENTAGE' | 'FLAT',
                })
              }
              className="input w-full"
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FLAT">Flat Amount ($)</option>
            </select>
          </div>

          <div>
            <label className="label">
              Rate ({form.type === 'PERCENTAGE' ? '%' : '$'})
            </label>
            <input
              type="number"
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: e.target.value })}
              className="input w-full"
              step="0.001"
              min="0"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) =>
                setForm({ ...form, isDefault: e.target.checked })
              }
              className="h-4 w-4 accent-blue-600"
            />
            <span className="text-sm text-slate-300">
              Default tax (auto-applied)
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.appliesToAll}
              onChange={(e) =>
                setForm({ ...form, appliesToAll: e.target.checked })
              }
              className="h-4 w-4 accent-blue-600"
            />
            <span className="text-sm text-slate-300">
              Applies to all items
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saveMutation.isPending}
              className="btn-primary"
            >
              {saveMutation.isPending
                ? 'Saving...'
                : isEdit
                  ? 'Save Changes'
                  : 'Create Tax'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function TaxesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['taxes'],
    queryFn: () => api.getTaxes(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTax(id),
    onSuccess: async () => {
      toast.success('Tax deleted');
      await queryClient.invalidateQueries({ queryKey: ['taxes'] });
    },
    onError: () => toast.error('Failed to delete tax'),
  });

  const taxes: Tax[] = useMemo(() => data?.data || [], [data]);

  const handleCreate = () => {
    setEditingTax(null);
    setShowForm(true);
  };

  const handleEdit = (tax: Tax) => {
    setEditingTax(tax);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingTax(null);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingTax(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Taxes</h1>
          <p className="text-sm text-slate-400">
            Manage tax rules for your restaurant
          </p>
        </div>

        <button onClick={handleCreate} className="btn-primary inline-flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          New Tax
        </button>
      </div>

      {isLoading ? (
        <div className="card rounded-2xl p-6 text-slate-300">Loading taxes...</div>
      ) : taxes.length === 0 ? (
        <div className="card rounded-2xl p-10 text-center">
          <div className="text-lg font-semibold text-slate-100">No taxes yet</div>
          <p className="mt-2 text-sm text-slate-400">
            Create your first tax rule to start applying taxes to orders.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {taxes.map((tax) => (
            <div
              key={tax.id}
              className="card flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-100">{tax.name}</h2>

                  {tax.isDefault && (
                    <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-300">
                      Default
                    </span>
                  )}

                  {tax.appliesToAll && (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-300">
                      All Items
                    </span>
                  )}
                </div>

                <div className="mt-1 text-sm text-slate-400">
                  {tax.type === 'PERCENTAGE' ? `${tax.rate}%` : `$${Number(tax.rate).toFixed(2)}`}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(tax)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit
                </button>

                <button
                  onClick={() => deleteMutation.mutate(tax.id)}
                  disabled={deleteMutation.isPending}
                  className="rounded-xl border border-red-500/30 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <TaxForm
            tax={editingTax}
            onClose={handleClose}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}