
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, ArrowUpIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function InventoryPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm]     = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [restockItem, setRestockItem] = useState<any>(null);
  const [restockQty, setRestockQty]   = useState('');
  const [restockNote, setRestockNote] = useState('');

  const { data } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.getInventory(),
    refetchInterval: 60000,
  });

  const items: any[] = data?.data || [];
  const lowStockItems = items.filter((i) => i.currentStock <= i.minimumStock);

  const restockMutation = useMutation({
    mutationFn: ({ id, qty, notes }: any) => api.restockItem(id, qty, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Stock updated!');
      setRestockItem(null);
      setRestockQty('');
      setRestockNote('');
    },
    onError: () => toast.error('Restock failed'),
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-950/50 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Inventory</h1>
          <p className="text-sm text-slate-400">
            {items.length} items
            {lowStockItems.length > 0 && (
              <span className="ml-2 text-amber-400 font-semibold">â ï¸ {lowStockItems.length} low stock</span>
            )}
          </p>
        </div>
        <button onClick={() => { setEditingItem(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Add Item
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Low stock alert banner */}
        {lowStockItems.length > 0 && (
          <div className="mb-4 p-4 bg-amber-900/30 border border-amber-600/50 rounded-2xl">
            <p className="text-amber-300 font-semibold text-sm mb-2">â ï¸ Low Stock Alert</p>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((item: any) => (
                <span key={item.id} className="text-xs bg-amber-900/50 text-amber-200 px-2 py-1 rounded-lg border border-amber-700/50">
                  {item.name}: {item.currentStock} {item.unit} left
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800">
              <tr>
                {['Item','Unit','In Stock','Min Stock','Cost/Unit','Vendor','Status','Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-slate-500">No inventory items. Add your first item to get started.</td></tr>
              )}
              {items.map((item: any) => {
                const isLow = item.currentStock <= item.minimumStock;
                return (
                  <tr key={item.id} className={clsx('border-t border-slate-700/50 hover:bg-slate-800/30 transition-colors', isLow && 'bg-amber-900/10')}>
                    <td className="px-4 py-3 font-semibold text-slate-200">{item.name}</td>
                    <td className="px-4 py-3 text-slate-400">{item.unit}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('font-bold', isLow ? 'text-amber-400' : 'text-slate-100')}>
                        {item.currentStock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{item.minimumStock}</td>
                    <td className="px-4 py-3 text-slate-300">${item.costPerUnit.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{item.vendor?.name || 'â'}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-lg font-medium',
                        isLow ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50' : 'bg-emerald-900/40 text-emerald-300'
                      )}>
                        {isLow ? 'Low Stock' : 'OK'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setRestockItem(item)} className="p-1.5 text-emerald-400 hover:bg-emerald-900/30 rounded-lg transition-all" title="Restock">
                          <ArrowUpIcon className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setEditingItem(item); setShowForm(true); }} className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-all">
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      {restockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} className="card w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-100">Restock: {restockItem.name}</h2>
              <button onClick={() => setRestockItem(null)} className="p-1 text-slate-400 hover:text-slate-200"><XMarkIcon className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-slate-400 mb-4">Current stock: <strong className="text-slate-200">{restockItem.currentStock} {restockItem.unit}</strong></p>
            <div className="space-y-3">
              <div>
                <label className="label">Quantity to Add</label>
                <input type="number" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} className="input w-full" placeholder="0" min="0.1" step="0.1" />
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <input value={restockNote} onChange={(e) => setRestockNote(e.target.value)} className="input w-full" placeholder="Delivery from supplier..." />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setRestockItem(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => restockMutation.mutate({ id: restockItem.id, qty: parseFloat(restockQty), notes: restockNote })}
                disabled={!restockQty || parseFloat(restockQty) <= 0 || restockMutation.isPending}
                className="btn-success flex-1"
              >
                {restockMutation.isPending ? 'Saving...' : 'Add Stock'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
