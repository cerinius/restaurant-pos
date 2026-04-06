'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import clsx from 'clsx';

import { KPICard } from '@/components/ui/KPICard';
import { StatusChip } from '@/components/ui/StatusChip';
import { WSStatusBanner } from '@/components/ui/WSStatusBanner';
import api from '@/lib/api';
import {
  getRestaurantAdminPath,
  getRestaurantKDSPath,
  getRestaurantLoginPath,
  getRestaurantPOSPath,
  getRestaurantPublicPath,
} from '@/lib/paths';
import { useAuthStore } from '@/store';


const ROLE_DEMO_CARDS = [
  {
    title: 'Owner',
    body: 'See URLs, pricing posture, floor strategy, menu setup, reports, and the guest-facing website from one control point.',
  },
  {
    title: 'Manager',
    body: 'Handle assignments, table flow, approvals, discounts, staffing, and live service decisions without getting lost.',
  },
  {
    title: 'Server and Bartender',
    body: 'Fast table access, section ownership, intuitive order entry, and check controls built for the rush.',
  },
  {
    title: 'Host and Front Door',
    body: 'Table status, section awareness, and clear readiness signals help seating stay organized under pressure.',
  },
  {
    title: 'Kitchen and Expo',
    body: 'Station-based KDS views, fire timing, and rush handling keep the back of house aligned with the floor.',
  },
];

export default function RestaurantAdminDashboardPage() {
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

  const hourlyData =
    sales?.salesByHour
      ?.filter((hour: any) => hour.sales > 0 || hour.orders > 0)
      ?.map((hour: any) => ({
        hour: `${hour.hour}:00`,
        sales: parseFloat(hour.sales.toFixed(2)),
        orders: hour.orders,
      })) || [];

  const restaurantId = user?.restaurantId || '';
  const quickLinks = restaurantId
    ? [
        { label: 'Staff Login', href: getRestaurantLoginPath(restaurantId) },
        { label: 'POS', href: getRestaurantPOSPath(restaurantId) },
        { label: 'Admin', href: getRestaurantAdminPath(restaurantId) },
        { label: 'KDS', href: getRestaurantKDSPath(restaurantId) },
        { label: 'Public Site', href: getRestaurantPublicPath(restaurantId) },
      ]
    : [];

  return (
    <div className="flex-1 overflow-auto">
      {/* WS reconnecting/offline warning bar */}
      <WSStatusBanner bar />

      <div className="border-b border-white/10 bg-slate-950/55 px-6 py-5 backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="section-kicker">Restaurant command center</p>
            <h1 className="mt-2 text-4xl font-black text-white">Run the restaurant, then show the whole story.</h1>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              This dashboard is designed to work in a live operation and in a client demo. It gives owners a clean view of performance, quick launch paths into every role-specific surface, and the exact links that make the multi-tenant story obvious.
            </p>
          </div>

          <StatusChip
            label={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            variant="info"
            dot
          />
        </div>
      </div>

      <div className="space-y-6 p-6">
        {quickLinks.length > 0 && (
          <section className="glass-panel p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="section-kicker">Tenant quick launch</p>
                <h2 className="mt-2 text-2xl font-black text-white">Every live surface for this restaurant</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Use these in the demo to move from owner setup to staff login, service, kitchen, and the branded public homepage without breaking the flow.
                </p>
              </div>
              <div className="soft-panel px-4 py-3 text-sm text-slate-300">
                Restaurant ID: <span className="font-semibold text-white">{restaurantId}</span>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {quickLinks.map((item) => (
                <Link key={item.label} href={item.href} className="soft-panel px-4 py-4 transition hover:bg-white/10">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                  <p className="mt-2 break-all text-sm font-semibold text-white">{item.href}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICard
            label="Today's Sales"
            value={`$${(sales?.totalSales || 0).toFixed(2)}`}
            sub={`${sales?.totalOrders || 0} orders so far`}
            tone="emerald"
          />
          <KPICard
            label="Open Orders"
            value={openOrders.length}
            sub={`${kds?.pending || 0} waiting in kitchen`}
            tone="cyan"
          />
          <KPICard
            label="Average Check"
            value={`$${(sales?.averageOrderValue || 0).toFixed(2)}`}
            sub="Current day average"
            tone="amber"
          />
          <KPICard
            label="Tips Collected"
            value={`$${(sales?.totalTips || 0).toFixed(2)}`}
            sub="Captured today"
            tone="rose"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-kicker">Service momentum</p>
                <h2 className="mt-2 text-2xl font-black text-white">Sales by hour</h2>
              </div>
              <span className="status-chip">Live refresh</span>
            </div>

            <div className="mt-6 h-[260px]">
              {hourlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} barSize={24}>
                    <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: '#020617',
                        border: '1px solid rgba(148,163,184,0.18)',
                        borderRadius: 16,
                      }}
                      labelStyle={{ color: '#f8fafc' }}
                    />
                    <Bar dataKey="sales" fill="#67e8f9" radius={[8, 8, 0, 0]} name="Sales ($)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/5 text-sm text-slate-500">
                  No sales data yet today.
                </div>
              )}
            </div>
          </section>

          <section className="card p-6">
            <p className="section-kicker">Kitchen pulse</p>
            <h2 className="mt-2 text-2xl font-black text-white">Back-of-house snapshot</h2>

            <div className="mt-6 space-y-3">
              {[
                {
                  label: 'Pending tickets',
                  value: String(kds?.pending || 0),
                  tone: (kds?.pending || 0) > 5 ? 'text-rose-200' : 'text-white',
                },
                {
                  label: 'In progress',
                  value: String(kds?.inProgress || 0),
                  tone: 'text-cyan-200',
                },
                {
                  label: 'Average ticket time',
                  value: `${Math.floor((kds?.averageTicketSeconds || 0) / 60)}:${String(
                    (kds?.averageTicketSeconds || 0) % 60
                  ).padStart(2, '0')}`,
                  tone: 'text-emerald-200',
                },
              ].map((item) => (
                <div key={item.label} className="soft-panel flex items-center justify-between px-4 py-4">
                  <p className="text-sm text-slate-300">{item.label}</p>
                  <p className={clsx('text-xl font-black', item.tone)}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 soft-panel p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Demo note</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                This is a great point in the walkthrough to switch from owner mode into KDS and show how stations, rush priorities, and bump flow work in real time.
              </p>
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-kicker">Live floor activity</p>
                <h2 className="mt-2 text-2xl font-black text-white">Open orders</h2>
              </div>
              <span className="status-chip">{openOrders.length} active</span>
            </div>

            <div className="mt-6 max-h-[420px] space-y-3 overflow-y-auto">
              {openOrders.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-slate-500">
                  No open orders right now.
                </div>
              )}
              {openOrders.map((order: any) => (
                <div key={order.id} className="soft-panel px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-white">
                        {order.tableName ? `Table ${order.tableName}` : order.type}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {order.serverName} / {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-white">${order.total.toFixed(2)}</p>
                      <span
                        className={clsx(
                          'mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em]',
                          order.status === 'READY'
                            ? 'bg-emerald-400/12 text-emerald-100'
                            : order.status === 'IN_PROGRESS'
                              ? 'bg-cyan-400/12 text-cyan-100'
                              : order.status === 'SENT'
                                ? 'bg-amber-400/12 text-amber-100'
                                : 'bg-white/10 text-slate-200'
                        )}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <p className="section-kicker">Client demo flow</p>
            <h2 className="mt-2 text-2xl font-black text-white">How to walk each role through the platform</h2>
            <div className="mt-6 space-y-3">
              {ROLE_DEMO_CARDS.map((item) => (
                <div key={item.title} className="soft-panel px-4 py-4">
                  <p className="text-base font-bold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{item.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="card p-6">
            <p className="section-kicker">Revenue mix</p>
            <h2 className="mt-2 text-2xl font-black text-white">Today's payment breakdown</h2>
            <div className="mt-6 space-y-4">
              {(sales?.paymentBreakdown || []).length > 0 ? (
                sales.paymentBreakdown.map((payment: any) => {
                  const percent =
                    sales.totalSales > 0 ? Math.round((payment.amount / sales.totalSales) * 100) : 0;

                  return (
                    <div key={payment.method}>
                      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                        <span className="font-semibold text-slate-200">
                          {payment.method.replace('_', ' ')}
                        </span>
                        <span className="text-slate-400">
                          ${payment.amount.toFixed(2)} ({percent}%)
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full bg-cyan-300 transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-slate-500">
                  No payment mix yet today.
                </div>
              )}
            </div>
          </section>

          <section className="card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-kicker">Risk and housekeeping</p>
                <h2 className="mt-2 text-2xl font-black text-white">Low stock and recent activity</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="soft-panel p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Low stock alerts</p>
                  {lowStock.length > 0 && (
                    <Link
                      href={getRestaurantAdminPath(restaurantId, 'inventory')}
                      className="text-[11px] font-semibold text-cyan-400 hover:underline"
                    >
                      View all →
                    </Link>
                  )}
                </div>
                {lowStock.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">Nothing urgent right now.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {lowStock.slice(0, 8).map((item: any) => (
                      <StatusChip
                        key={item.id}
                        label={`${item.name} · ${item.currentStock} ${item.unit || ''}`}
                        variant="warning"
                        dot
                        size="sm"
                      />
                    ))}
                    {lowStock.length > 8 && (
                      <StatusChip label={`+${lowStock.length - 8} more`} variant="neutral" size="sm" />
                    )}
                  </div>
                )}
              </div>

              <div className="soft-panel p-4">
                <p className="text-sm font-semibold text-white">Recent activity</p>
                <div className="mt-3 space-y-2">
                  {auditLogs.length === 0 && <p className="text-sm text-slate-500">No recent audit events.</p>}
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between gap-4 text-sm">
                      <span className="truncate text-slate-300">
                        {log.userName} / {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="shrink-0 text-slate-500">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
