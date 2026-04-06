'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, AreaChart, Area,
} from 'recharts';
import clsx from 'clsx';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BoltIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon,
  CubeIcon,
  EnvelopeIcon,
  FireIcon,
  HeartIcon,
  HomeIcon,
  SparklesIcon,
  TableCellsIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

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

// ─── AI Nudges (simulated — in production these come from PULSE AI engine) ───

const AI_NUDGES = [
  {
    id: 'n1', icon: '⚡', severity: 'warning',
    title: 'High demand predicted Friday 7–9pm',
    body: 'Add 2 servers and 1 bartender based on reservation pace and history.',
    action: 'View SmartSchedule', href: 'workforce',
  },
  {
    id: 'n2', icon: '📈', severity: 'success',
    title: 'Ribeye up 22% this week — feature it',
    body: 'Item velocity is trending well. Mark it featured to capture more upsells.',
    action: 'Edit Menu', href: 'menu',
  },
  {
    id: 'n3', icon: '⚠️', severity: 'alert',
    title: '3 at-risk guests haven\'t visited in 45+ days',
    body: 'These are high-LTV regulars. A targeted re-engagement campaign could recover ~$800.',
    action: 'Launch Campaign', href: 'marketing',
  },
];

const NUDGE_STYLES: Record<string, { bg: string; border: string; badge: string }> = {
  warning: { bg: 'bg-amber-400/6', border: 'border-amber-400/20', badge: 'text-amber-300' },
  success: { bg: 'bg-emerald-400/6', border: 'border-emerald-400/20', badge: 'text-emerald-300' },
  alert:   { bg: 'bg-red-400/6',    border: 'border-red-400/20',    badge: 'text-red-300' },
  info:    { bg: 'bg-blue-400/6',   border: 'border-blue-400/20',   badge: 'text-blue-300' },
};

// ─── Module Shortcut tiles ────────────────────────────────────────────────────

function ModuleGrid({ restaurantId }: { restaurantId: string }) {
  const modules = [
    {
      icon: CpuChipIcon, label: 'PULSE AI™', sub: 'Intelligence', href: getRestaurantAdminPath(restaurantId, 'intelligence'),
      color: 'from-cyan-400/15 border-cyan-400/20', badge: 'New',
    },
    {
      icon: CalendarDaysIcon, label: 'Reservations', sub: 'Bookings & waitlist', href: getRestaurantAdminPath(restaurantId, 'reservations'),
      color: 'from-violet-400/10 border-violet-400/15', badge: 'New',
    },
    {
      icon: HeartIcon, label: 'Guest Intelligence', sub: 'CRM & loyalty', href: getRestaurantAdminPath(restaurantId, 'guests'),
      color: 'from-pink-400/10 border-pink-400/15', badge: 'New',
    },
    {
      icon: EnvelopeIcon, label: 'Marketing', sub: 'Campaigns & promos', href: getRestaurantAdminPath(restaurantId, 'marketing'),
      color: 'from-amber-400/10 border-amber-400/15', badge: 'New',
    },
    {
      icon: TableCellsIcon, label: 'Floor Plan', sub: 'Rooms & tables', href: getRestaurantAdminPath(restaurantId, 'floor'),
      color: 'from-emerald-400/10 border-emerald-400/15',
    },
    {
      icon: UserGroupIcon, label: 'Workforce', sub: 'Schedule & time', href: getRestaurantAdminPath(restaurantId, 'workforce'),
      color: 'from-blue-400/10 border-blue-400/15',
    },
    {
      icon: ChartBarIcon, label: 'Reports', sub: 'Analytics', href: getRestaurantAdminPath(restaurantId, 'reports'),
      color: 'from-teal-400/10 border-teal-400/15',
    },
    {
      icon: CubeIcon, label: 'Inventory', sub: 'Stock levels', href: getRestaurantAdminPath(restaurantId, 'inventory'),
      color: 'from-orange-400/10 border-orange-400/15',
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8">
      {modules.map((mod) => (
        <Link
          key={mod.label}
          href={mod.href}
          className={clsx(
            'group relative rounded-[20px] border bg-gradient-to-b to-transparent p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
            mod.color,
          )}
        >
          {mod.badge && (
            <span className="absolute right-2 top-2 rounded-full bg-cyan-300 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-950">
              {mod.badge}
            </span>
          )}
          <mod.icon className="mb-3 h-6 w-6 text-slate-300 group-hover:text-white transition-colors" />
          <p className="text-sm font-bold text-white">{mod.label}</p>
          <p className="text-[11px] text-slate-500">{mod.sub}</p>
        </Link>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function RestaurantAdminDashboardPage() {
  const { user, locationId } = useAuthStore();
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

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
      ?.filter((h: any) => h.sales > 0 || h.orders > 0)
      ?.map((h: any) => ({
        hour: `${h.hour}:00`,
        sales: parseFloat(h.sales.toFixed(2)),
        orders: h.orders,
      })) || [];

  const restaurantId = user?.restaurantId || '';

  const quickLinks = restaurantId
    ? [
        { label: 'POS Terminal', href: getRestaurantPOSPath(restaurantId), desc: 'Order entry & payments' },
        { label: 'KDS View', href: getRestaurantKDSPath(restaurantId), desc: 'Kitchen display system' },
        { label: 'Staff Login', href: getRestaurantLoginPath(restaurantId), desc: 'Staff PIN access' },
        { label: 'Public Site', href: getRestaurantPublicPath(restaurantId), desc: 'Guest-facing homepage' },
      ]
    : [];

  const todaySales = sales?.totalSales || 0;
  const todayOrders = sales?.totalOrders || 0;
  const avgCheck = sales?.averageOrderValue || 0;
  const totalTips = sales?.totalTips || 0;

  return (
    <div className="flex-1 overflow-auto">
      <WSStatusBanner bar />

      {/* ── Top header bar ─────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/80 px-6 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Command Center</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Live AI status */}
            <div className="hidden md:flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 py-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-300" />
              </span>
              <span className="text-xs font-bold text-cyan-300">PULSE AI™ Active</span>
            </div>
            {restaurantId && (
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-semibold text-slate-400">
                ID: {restaurantId}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">

        {/* ── Module shortcuts ───────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Platform modules</p>
          </div>
          <ModuleGrid restaurantId={restaurantId} />
        </section>

        {/* ── AI Nudges ──────────────────────────────────────── */}
        <section className="rounded-[24px] border border-cyan-400/15 bg-gradient-to-br from-cyan-400/5 to-transparent p-5">
          <div className="mb-4 flex items-center gap-2">
            <CpuChipIcon className="h-4 w-4 text-cyan-400" />
            <p className="text-sm font-bold text-cyan-300">PULSE AI™ — 3 insights need your attention</p>
            <Link
              href={restaurantId ? getRestaurantAdminPath(restaurantId, 'intelligence') : '#'}
              className="ml-auto text-xs font-semibold text-cyan-400 hover:text-cyan-300"
            >
              View all 18 →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {AI_NUDGES.map((nudge) => {
              const style = NUDGE_STYLES[nudge.severity];
              return (
                <div key={nudge.id} className={clsx('rounded-[16px] border p-4', style.bg, style.border)}>
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg">{nudge.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white leading-tight">{nudge.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{nudge.body}</p>
                      {nudge.action && restaurantId && (
                        <Link
                          href={getRestaurantAdminPath(restaurantId, nudge.href)}
                          className={clsx('mt-2 inline-block text-xs font-bold', style.badge)}
                        >
                          {nudge.action} →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Live KPIs ──────────────────────────────────────── */}
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Today's performance</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KPICard
              label="Sales Today"
              value={`$${todaySales.toFixed(2)}`}
              sub={`${todayOrders} orders`}
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
              value={`$${avgCheck.toFixed(2)}`}
              sub="Current day average"
              tone="amber"
            />
            <KPICard
              label="Tips Collected"
              value={`$${totalTips.toFixed(2)}`}
              sub="Captured today"
              tone="rose"
            />
          </div>
        </section>

        {/* ── Sales Chart + Kitchen Pulse ───────────────────── */}
        <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
          <section className="card p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="section-kicker">Revenue momentum</p>
                <h2 className="mt-1 text-xl font-black text-white">Sales by hour</h2>
              </div>
              <span className="status-chip">Live</span>
            </div>
            <div className="h-[220px]">
              {hourlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,0.1)" strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12, fontSize: 12 }}
                      formatter={(v: any) => [`$${v}`, 'Revenue']}
                      labelStyle={{ color: '#f8fafc', fontWeight: 700 }}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#22d3ee" strokeWidth={2} fill="url(#salesGrad)" name="Sales ($)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-white/4 text-sm text-slate-500">
                  No sales data yet today.
                </div>
              )}
            </div>
          </section>

          <section className="card p-6">
            <div className="mb-5">
              <p className="section-kicker">Kitchen pulse</p>
              <h2 className="mt-1 text-xl font-black text-white">BOH snapshot</h2>
            </div>
            <div className="space-y-3">
              {[
                {
                  label: 'Pending tickets',
                  value: String(kds?.pending || 0),
                  tone: (kds?.pending || 0) > 5 ? 'text-red-300' : 'text-white',
                },
                { label: 'In progress', value: String(kds?.inProgress || 0), tone: 'text-cyan-200' },
                {
                  label: 'Avg ticket time',
                  value: `${Math.floor((kds?.averageTicketSeconds || 0) / 60)}:${String((kds?.averageTicketSeconds || 0) % 60).padStart(2, '0')}`,
                  tone: 'text-emerald-200',
                },
              ].map((item) => (
                <div key={item.label} className="soft-panel flex items-center justify-between px-4 py-3">
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className={clsx('text-xl font-black', item.tone)}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {restaurantId && (
                <>
                  <Link href={getRestaurantPOSPath(restaurantId)} className="btn-secondary block w-full py-2.5 text-center text-sm">
                    Open POS →
                  </Link>
                  <Link href={getRestaurantKDSPath(restaurantId)} className="btn-secondary block w-full py-2.5 text-center text-sm">
                    Open KDS →
                  </Link>
                </>
              )}
            </div>
          </section>
        </div>

        {/* ── Open Orders + Payment Mix ─────────────────────── */}
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="card p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="section-kicker">Live floor activity</p>
                <h2 className="mt-1 text-xl font-black text-white">Open orders</h2>
              </div>
              <span className="status-chip">{openOrders.length} active</span>
            </div>

            <div className="max-h-[320px] space-y-2 overflow-y-auto">
              {openOrders.length === 0 && (
                <div className="rounded-[20px] border border-dashed border-white/10 bg-white/4 px-6 py-10 text-center text-sm text-slate-500">
                  No open orders right now.
                </div>
              )}
              {openOrders.map((order: any) => (
                <div key={order.id} className="soft-panel px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {order.tableName ? `Table ${order.tableName}` : order.type}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.serverName} · {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={clsx(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                          order.status === 'READY' ? 'bg-emerald-400/15 text-emerald-300' :
                          order.status === 'IN_PROGRESS' ? 'bg-cyan-400/15 text-cyan-300' :
                          order.status === 'SENT' ? 'bg-amber-400/15 text-amber-300' : 'bg-white/10 text-slate-300',
                        )}
                      >
                        {order.status}
                      </span>
                      <p className="text-base font-black text-white">${order.total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <p className="section-kicker">Revenue mix</p>
            <h2 className="mt-1 mb-5 text-xl font-black text-white">Payment breakdown</h2>

            {(sales?.paymentBreakdown || []).length > 0 ? (
              <div className="space-y-4">
                {sales.paymentBreakdown.map((payment: any) => {
                  const pct = sales.totalSales > 0 ? Math.round((payment.amount / sales.totalSales) * 100) : 0;
                  return (
                    <div key={payment.method}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="font-semibold text-slate-200">{payment.method.replace('_', ' ')}</span>
                        <span className="text-slate-400">${payment.amount.toFixed(2)} ({pct}%)</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/8">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-300 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-white/4 px-6 py-10 text-center text-sm text-slate-500">
                No payment data yet.
              </div>
            )}

            {/* Quick launch strip */}
            {quickLinks.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-2">
                {quickLinks.map((link) => (
                  <Link key={link.label} href={link.href} className="rounded-[14px] border border-white/8 bg-white/4 px-3 py-3 transition hover:bg-white/8">
                    <p className="text-xs font-bold text-white">{link.label}</p>
                    <p className="text-[10px] text-slate-500">{link.desc}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Inventory alerts + Audit log ──────────────────── */}
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="card p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="section-kicker">Risk signals</p>
                <h2 className="mt-1 text-xl font-black text-white">Low stock alerts</h2>
              </div>
              {lowStock.length > 0 && restaurantId && (
                <Link href={getRestaurantAdminPath(restaurantId, 'inventory')} className="text-xs font-semibold text-cyan-400 hover:underline">
                  View inventory →
                </Link>
              )}
            </div>
            {lowStock.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-white/10 bg-white/4 py-10 text-center text-sm text-slate-500">
                ✓ All stock levels are healthy.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {lowStock.map((item: any) => (
                  <StatusChip
                    key={item.id}
                    label={`${item.name} · ${item.currentStock} ${item.unit || ''}`}
                    variant="warning"
                    dot
                    size="sm"
                  />
                ))}
              </div>
            )}
          </section>

          <section className="card p-6">
            <div className="mb-5">
              <p className="section-kicker">Transparency</p>
              <h2 className="mt-1 text-xl font-black text-white">Recent activity</h2>
            </div>
            <div className="space-y-2">
              {auditLogs.length === 0 && (
                <p className="text-sm text-slate-500">No recent audit events.</p>
              )}
              {auditLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between gap-4 rounded-xl bg-white/4 px-3 py-2.5 text-sm">
                  <span className="truncate text-slate-300">
                    <span className="font-semibold text-white">{log.userName}</span>
                    {' · '}
                    {log.action.replace(/_/g, ' ').toLowerCase()}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
