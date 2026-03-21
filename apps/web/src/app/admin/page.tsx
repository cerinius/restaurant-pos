
'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import clsx from 'clsx';

function StatCard({ label, value, sub, color = 'blue' }: any) {
  const colors: Record<string, string> = {
    blue:    'from-blue-600/20 to-blue-600/5 border-blue-600/30',
    emerald: 'from-emerald-600/20 to-emerald-600/5 border-emerald-600/30',
    amber:   'from-amber-600/20 to-amber-600/5 border-amber-600/30',
    red:     'from-red-600/20 to-red-600/5 border-red-600/30',
  };
  return (
    <div className={clsx('card bg-gradient-to-br p-5 border', colors[color] || colors.blue)}>
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, locationId } = useAuthStore();

  const today = new Date().toISOString().split('T')[0];

  const { data: salesData } = useQuery({
    queryKey: ['sales-report', today],
    queryFn: () => api.getSalesReport({ dateFrom: today, dateTo: today }),
    refetchInterval: 60000,
  });

  const { data: openOrdersData } = useQuery({
    queryKey: ['open-orders-count', locationId],
    queryFn: () => api.getOpenOrders(locationId || undefined),
    refetchInterval: 15000,
  });

  const { data: kdsStats } = useQuery({
    queryKey: ['kds-stats-dash', locationId],
    queryFn: () => api.getKDSStats(locationId || undefined),
    refetchInterval: 15000,
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => api.getLowStockAlerts(),
    refetchInterval: 300000,
  });

  const { data: auditData } = useQuery({
    queryKey: ['recent-audit'],
    queryFn: () => api.getAuditLogs({ limit: '10' }),
  });

  const sales = salesData?.data;
  const openOrders: any[] = openOrdersData?.data || [];
  const kds = kdsStats?.data;
  const lowStock: any[] = lowStockData?.data || [];
  const auditLogs: any[] = auditData?.data || [];

  const hourlyData = sales?.salesByHour
    ?.filter((h: any) => h.sales > 0 || h.orders > 0)
    ?.map((h: any) => ({
      hour: `${h.hour}:00`,
      sales: parseFloat(h.sales.toFixed(2)),
      orders: h.orders,
    })) || [];

  return (
    <div className="flex-1 overflow-auto">
      {/* Page Header */}
      <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur border-b border-slate-700 px-6 py-4">
        <h1 className="text-xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Today's Sales"
            value={`$${(sales?.totalSales || 0).toFixed(2)}`}
            sub={`${sales?.totalOrders || 0} orders`}
            color="emerald"
          />
          <StatCard
            label="Open Orders"
            value={openOrders.length}
            sub={`${kds?.pending || 0} pending in kitchen`}
            color="blue"
          />
          <StatCard
            label="Avg Order Value"
            value={`$${(sales?.averageOrderValue || 0).toFixed(2)}`}
            sub="Today"
            color="amber"
          />
          <StatCard
            label="Tips Collected"
            value={`$${(sales?.totalTips || 0).toFixed(2)}`}
            sub="Today"
            color="blue"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hourly Sales Chart */}
          <div className="lg:col-span-2 card p-5">
            <h2 className="font-bold text-slate-100 mb-4">Sales by Hour â Today</h2>
            {hourlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlyData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Sales ($)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500">
                No sales data yet today
              </div>
            )}
          </div>

          {/* KDS Status + Low Stock */}
          <div className="space-y-4">
            {/* KDS */}
            <div className="card p-4">
              <h3 className="font-bold text-slate-200 text-sm mb-3">Kitchen Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Pending Tickets</span>
                  <span className={clsx('font-bold text-sm', (kds?.pending || 0) > 5 ? 'text-red-400' : 'text-slate-200')}>
                    {kds?.pending || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">In Progress</span>
                  <span className="font-bold text-sm text-blue-400">{kds?.inProgress || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Avg Ticket Time</span>
                  <span className="font-mono font-bold text-sm text-slate-200">
                    {Math.floor((kds?.averageTicketSeconds || 0) / 60)}:{((kds?.averageTicketSeconds || 0) % 60).toString().padStart(2,'0')}
                  </span>
                </div>
              </div>
            </div>

            {/* Low Stock */}
            {lowStock.length > 0 && (
              <div className="card p-4 border-amber-700/50">
                <h3 className="font-bold text-amber-300 text-sm mb-3">â ï¸ Low Stock ({lowStock.length})</h3>
                <div className="space-y-1.5">
                  {lowStock.slice(0, 5).map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <span className="text-xs text-slate-300 truncate">{item.name}</span>
                      <span className="text-xs font-bold text-amber-400 shrink-0 ml-2">
                        {item.currentStock} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Open Orders + Payment breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Orders */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-100 mb-4">Active Orders ({openOrders.length})</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {openOrders.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No open orders</p>
              )}
              {openOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      {order.tableName ? `Table ${order.tableName}` : order.type}
                    </p>
                    <p className="text-xs text-slate-500">
                      {order.serverName} Â· {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-100">${order.total.toFixed(2)}</p>
                    <span className={clsx('text-xs px-1.5 py-0.5 rounded font-medium',
                      order.status === 'READY'       ? 'text-emerald-300 bg-emerald-900/40' :
                      order.status === 'IN_PROGRESS' ? 'text-blue-300 bg-blue-900/40' :
                      order.status === 'SENT'        ? 'text-orange-300 bg-orange-900/40' :
                      'text-slate-300 bg-slate-700'
                    )}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-100 mb-4">Today's Payment Mix</h2>
            {(sales?.paymentBreakdown || []).length > 0 ? (
              <div className="space-y-3">
                {sales.paymentBreakdown.map((p: any) => {
                  const pct = sales.totalSales > 0
                    ? Math.round((p.amount / sales.totalSales) * 100)
                    : 0;
                  return (
                    <div key={p.method}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 font-medium">{p.method.replace('_', ' ')}</span>
                        <span className="text-slate-400">${p.amount.toFixed(2)} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">No payments today</p>
            )}

            {/* Recent Audit */}
            <h3 className="font-bold text-slate-300 text-sm mt-5 mb-3">Recent Activity</h3>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 truncate">{log.userName} â {log.action.replace(/_/g,' ')}</span>
                  <span className="text-slate-600 shrink-0 ml-2">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
