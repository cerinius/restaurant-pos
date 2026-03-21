
'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

interface Props {
  locationId: string;
  onOrderSelect: (order: any) => void;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN:        'bg-slate-700 text-slate-300 border-slate-600',
  SENT:        'bg-orange-900/50 text-orange-300 border-orange-700/50',
  IN_PROGRESS: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  READY:       'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
};

export function OpenOrdersPanel({ locationId, onOrderSelect }: Props) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['open-orders', locationId],
    queryFn: () => api.getOpenOrders(locationId),
    refetchInterval: 15000,
  });

  const orders: any[] = data?.data || [];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900 shrink-0">
        <h2 className="font-bold text-slate-100">Open Orders</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{orders.length} active</span>
          <button onClick={() => refetch()} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <span className="text-4xl mb-3">â</span>
            <p className="font-medium">No open orders</p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {orders.map((order: any) => (
              <button
                key={order.id}
                onClick={() => onOrderSelect(order)}
                className="card p-4 text-left hover:border-blue-500 hover:bg-slate-700/50 transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-slate-100 text-sm">
                      {order.tableName ? `Table ${order.tableName}` : order.type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-slate-400">{order.serverName}</p>
                  </div>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-lg border font-medium', STATUS_COLORS[order.status] || STATUS_COLORS.OPEN)}>
                    {order.status}
                  </span>
                </div>

                <div className="space-y-0.5 mb-3">
                  {(order.items || []).slice(0, 3).map((item: any) => (
                    <p key={item.id} className="text-xs text-slate-400 truncate">
                      {item.quantity}Ã {item.menuItemName}
                    </p>
                  ))}
                  {(order.items || []).length > 3 && (
                    <p className="text-xs text-slate-500">+{order.items.length - 3} more items</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 text-base">
                    ${order.total.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500">
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
