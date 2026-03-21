
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import clsx from 'clsx';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS: Record<string, string> = {
  OPEN:        'bg-slate-700 text-slate-200',
  SENT:        'bg-orange-900/60 text-orange-300',
  IN_PROGRESS: 'bg-blue-900/60 text-blue-300',
  READY:       'bg-cyan-900/60 text-cyan-300',
  SERVED:      'bg-teal-900/60 text-teal-300',
  PAID:        'bg-emerald-900/60 text-emerald-300',
  VOID:        'bg-red-900/60 text-red-300',
  REFUNDED:    'bg-pink-900/60 text-pink-300',
};

export default function OrdersAdminPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom,      setDateFrom]      = useState(today);
  const [dateTo,        setDateTo]        = useState(today);
  const [statusFilter,  setStatusFilter]  = useState('');
  const [typeFilter,    setTypeFilter]    = useState('');
  const [page,          setPage]          = useState(1);
  const [expandedId,    setExpandedId]    = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', dateFrom, dateTo, statusFilter, typeFilter, page],
    queryFn: () => api.getOrders({
      dateFrom, dateTo,
      status: statusFilter || undefined,
      type:   typeFilter   || undefined,
      page:   String(page),
      limit:  '30',
    }),
  });

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.voidOrder(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('Order voided'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to void order'),
  });

  const orders: any[]   = data?.data       || [];
  const pagination: any = data?.pagination  || {};

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filters */}
      <div className="px-6 py-4 border-b border-slate-700 bg-slate-950/50 shrink-0 space-y-3">
        <h1 className="text-xl font-bold text-slate-100">Order Management</h1>
        <div className="flex flex-wrap gap-3 items-end">
          <div><label className="label text-xs">From</label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="input text-sm py-1.5" /></div>
          <div><label className="label text-xs">To</label>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="input text-sm py-1.5" /></div>
          <div><label className="label text-xs">Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input text-sm py-1.5">
              <option value="">All Statuses</option>
              {['OPEN','SENT','IN_PROGRESS','READY','SERVED','PAID','VOID','REFUNDED'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div><label className="label text-xs">Type</label>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="input text-sm py-1.5">
              <option value="">All Types</option>
              {['DINE_IN','TAKEOUT','DELIVERY','BAR'].map((t) => (
                <option key={t} value={t}>{t.replace('_',' ')}</option>
              ))}
            </select>
          </div>
          <div className="text-xs text-slate-400 self-end pb-2">
            {pagination.total || 0} orders
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 sticky top-0 z-10">
            <tr>
              {['Order #','Table/Type','Server','Items','Total','Status','Time','Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="text-center py-12">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </td></tr>
            )}
            {!isLoading && orders.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-slate-500">No orders found for this filter</td></tr>
            )}
            {orders.map((order: any) => (
              <>
                <tr
                  key={order.id}
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  className="border-t border-slate-700/40 hover:bg-slate-800/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">#{order.id.slice(-8).toUpperCase()}</td>
                  <td className="px-4 py-3 font-semibold text-slate-200 whitespace-nowrap">
                    {order.tableName ? `Table ${order.tableName}` : order.type.replace('_',' ')}
                    {order.customerName && <div className="text-xs text-slate-400 font-normal">{order.customerName}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{order.serverName}</td>
                  <td className="px-4 py-3 text-slate-400">{(order.items || []).filter((i: any) => !i.isVoided).length}</td>
                  <td className="px-4 py-3 font-bold text-slate-100">${order.total.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs px-2 py-0.5 rounded font-medium', STATUS_COLORS[order.status] || STATUS_COLORS.OPEN)}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    {!['PAID','VOID','REFUNDED'].includes(order.status) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const reason = prompt('Reason for voiding this order?');
                          if (reason) voidMutation.mutate({ id: order.id, reason });
                        }}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-900/20 transition-all"
                      >
                        Void
                      </button>
                    )}
                  </td>
                </tr>
                {expandedId === order.id && (
                  <tr key={`${order.id}-details`} className="bg-slate-900/50">
                    <td colSpan={8} className="px-6 py-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Items</p>
                          <div className="space-y-1">
                            {(order.items || []).map((item: any) => (
                              <div key={item.id} className={clsx('flex justify-between text-sm', item.isVoided && 'line-through opacity-40')}>
                                <span className="text-slate-300">{item.quantity}Ã {item.menuItemName}</span>
                                <span className="text-slate-400">${item.totalPrice.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Totals</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span className="text-slate-300">${order.subtotal.toFixed(2)}</span></div>
                            {order.discountTotal > 0 && <div className="flex justify-between"><span className="text-emerald-400">Discounts</span><span className="text-emerald-400">-${order.discountTotal.toFixed(2)}</span></div>}
                            <div className="flex justify-between"><span className="text-slate-400">Tax</span><span className="text-slate-300">${order.taxTotal.toFixed(2)}</span></div>
                            {order.tipTotal > 0 && <div className="flex justify-between"><span className="text-slate-400">Tip</span><span className="text-slate-300">${order.tipTotal.toFixed(2)}</span></div>}
                            <div className="flex justify-between font-bold border-t border-slate-700 pt-1"><span className="text-slate-200">Total</span><span className="text-slate-100">${order.total.toFixed(2)}</span></div>
                          </div>
                          {order.notes && (
                            <div className="mt-3 p-2 bg-amber-900/20 border border-amber-700/30 rounded-lg">
                              <p className="text-xs text-amber-300">ð {order.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-700 shrink-0 bg-slate-900">
          <p className="text-xs text-slate-400">Page {pagination.page} of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">â Prev</button>
            <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Next â</button>
          </div>
        </div>
      )}
    </div>
  );
}
