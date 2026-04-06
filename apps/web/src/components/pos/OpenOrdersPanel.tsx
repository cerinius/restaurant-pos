'use client';

import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { ArrowPathIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

import api from '@/lib/api';

interface Props {
  locationId: string;
  onOrderSelect: (order: any) => void;
  initialOrders?: any[];
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'border-slate-600 bg-slate-700/40 text-slate-200',
  SENT: 'border-orange-300/20 bg-orange-500/10 text-orange-100',
  IN_PROGRESS: 'border-cyan-300/20 bg-cyan-400/10 text-cyan-100',
  READY: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100',
};

export function OpenOrdersPanel({ locationId, onOrderSelect, initialOrders = [] }: Props) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['open-orders', locationId],
    queryFn: () => api.getOpenOrders(locationId),
    refetchInterval: 15000,
    enabled: !!locationId,
    initialData: initialOrders.length > 0 ? { success: true, data: initialOrders } : undefined,
  });

  const orders: any[] = data?.data || [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-44 animate-pulse rounded-[28px] bg-white/8" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="ops-toolbar flex items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-3">
          <ClipboardDocumentListIcon className="h-6 w-6 text-slate-300" />
          <div>
            <h2 className="text-xl font-black text-white">Open Orders</h2>
            <p className="text-sm text-slate-400">{orders.length} active checks ready to reopen</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="touch-target inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-slate-200 transition hover:bg-white/10"
        >
          <ArrowPathIcon className="h-5 w-5" />
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {orders.length === 0 ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center text-slate-400">
            <ClipboardDocumentListIcon className="mb-4 h-14 w-14 text-slate-600" />
            <p className="text-xl font-black text-slate-200">No open orders</p>
            <p className="mt-2 text-sm text-slate-500">
              New tickets will appear here as soon as the team starts service.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {orders.map((order: any) => (
              <button
                key={order.id}
                type="button"
                onClick={() => onOrderSelect(order)}
                className="card rounded-[28px] p-5 text-left transition hover:border-cyan-300/20 hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-black text-slate-100">
                      {order.tableName ? `Table ${order.tableName}` : String(order.type || 'Order').replace('_', ' ')}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">{order.serverName || 'Unassigned server'}</p>
                  </div>
                  <span className={clsx('rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]', STATUS_COLORS[order.status] || STATUS_COLORS.OPEN)}>
                    {order.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  {(order.items || []).slice(0, 4).map((item: any) => (
                    <p key={item.id} className="truncate text-sm text-slate-300">
                      <span className="font-bold text-slate-100">{item.quantity}x</span> {item.menuItemName}
                    </p>
                  ))}
                  {(order.items || []).length > 4 && (
                    <p className="text-sm font-semibold text-slate-500">+{order.items.length - 4} more items</p>
                  )}
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <span className="text-2xl font-black text-cyan-300">${Number(order.total || 0).toFixed(2)}</span>
                  <span className="text-sm text-slate-500">
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
