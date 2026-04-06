'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import clsx from 'clsx';
import {
  CalendarDaysIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  FireIcon,
  TableCellsIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

import { KPICard } from '@/components/ui/KPICard';
import { StatusChip } from '@/components/ui/StatusChip';
import api from '@/lib/api';
import {
  getRestaurantAdminPath,
  getRestaurantKDSPath,
  getRestaurantPOSPath,
} from '@/lib/paths';
import { useAuthStore } from '@/store';

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

function getReservationState(reservation: any) {
  return String(reservation.status || reservation.reservationStatus || 'BOOKED').toUpperCase();
}

export default function RestaurantAdminDashboardPage() {
  const { user, locationId } = useAuthStore();
  const today = new Date().toISOString().split('T')[0];
  const restaurantId = user?.restaurantId || '';
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

  const { data: tablesData } = useQuery({
    queryKey: ['dashboard-tables', locationId],
    queryFn: () => api.getTables({ locationId }),
    enabled: !!locationId,
    refetchInterval: 15000,
  });

  const { data: reservationsData } = useQuery({
    queryKey: ['dashboard-reservations', today],
    queryFn: () => api.getReservations({ date: today }),
    refetchInterval: 30000,
  });

  const { data: staffData } = useQuery({
    queryKey: ['dashboard-staff'],
    queryFn: () => api.getStaff(),
    refetchInterval: 60000,
  });

  const sales = salesData?.data;
  const openOrders: any[] = openOrdersData?.data || [];
  const kds = kdsStats?.data || {};
  const lowStock: any[] = lowStockData?.data || [];
  const auditLogs: any[] = auditData?.data || [];
  const tables: any[] = tablesData?.data || [];
  const reservations: any[] = reservationsData?.data || [];
  const staff: any[] = staffData?.data || [];

  const hourlyData =
    sales?.salesByHour
      ?.filter((entry: any) => entry.sales > 0 || entry.orders > 0)
      ?.map((entry: any) => ({
        hour: `${entry.hour}:00`,
        sales: parseFloat(entry.sales.toFixed(2)),
      })) || [];

  const floorCounts = {
    occupied: tables.filter((table) => table.status === 'OCCUPIED').length,
    available: tables.filter((table) => table.status === 'AVAILABLE').length,
    dirty: tables.filter((table) => table.status === 'DIRTY').length,
    reserved: tables.filter((table) => table.status === 'RESERVED').length,
  };

  const reservationCounts = {
    booked: reservations.filter((reservation) => getReservationState(reservation) === 'BOOKED').length,
    seated: reservations.filter((reservation) => getReservationState(reservation) === 'SEATED').length,
    waitlist: reservations.filter((reservation) => getReservationState(reservation) === 'WAITLIST').length,
  };

  const activeStaff = staff.filter((member) => member.isActive);
  const onShiftStaff = activeStaff.filter((member) => member.clockedInAt && !member.clockedOutAt);

  const commandModules = [
    {
      label: 'Floor & reservations',
      description: 'Room state, seating, waitlist',
      href: getRestaurantAdminPath(restaurantId, 'reservations'),
      Icon: CalendarDaysIcon,
    },
    {
      label: 'Live orders',
      description: 'Open checks and service flow',
      href: getRestaurantAdminPath(restaurantId, 'orders'),
      Icon: ClipboardDocumentListIcon,
    },
    {
      label: 'Kitchen throughput',
      description: 'Station load and ticket pace',
      href: getRestaurantKDSPath(restaurantId),
      Icon: FireIcon,
    },
    {
      label: 'Staffing',
      description: 'Roster, shifts, workload',
      href: getRestaurantAdminPath(restaurantId, 'workforce'),
      Icon: UserGroupIcon,
    },
    {
      label: 'Inventory',
      description: 'Low stock and replenishment',
      href: getRestaurantAdminPath(restaurantId, 'inventory'),
      Icon: CubeIcon,
    },
    {
      label: 'Reports',
      description: 'Sales and operational trends',
      href: getRestaurantAdminPath(restaurantId, 'reports'),
      Icon: ChartBarIcon,
    },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/82 px-4 py-3 backdrop-blur xl:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Command center</p>
            <h1 className="mt-1 text-xl font-black text-white xl:text-2xl">Today&apos;s operating picture</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
              {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            {restaurantId && (
              <Link
                href={getRestaurantPOSPath(restaurantId)}
                className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
              >
                Open POS
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4 xl:p-6">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KPICard
            label="Sales Today"
            value={formatCurrency(sales?.totalSales || 0)}
            sub={`${sales?.totalOrders || 0} orders`}
            tone="emerald"
          />
          <KPICard
            label="Open Checks"
            value={openOrders.length}
            sub={`${kds.pending || 0} waiting in kitchen`}
            tone="cyan"
          />
          <KPICard
            label="Avg Check"
            value={formatCurrency(sales?.averageOrderValue || 0)}
            sub="Current day average"
            tone="amber"
          />
          <KPICard
            label="On Shift"
            value={onShiftStaff.length}
            sub={`${activeStaff.length} active staff profiles`}
            tone="rose"
          />
        </section>

        <section className="card p-4 xl:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Priority modules</p>
              <h2 className="mt-1 text-lg font-black text-white">Operational launch points</h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {commandModules.map((module) => (
              <Link
                key={module.label}
                href={module.href}
                className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
              >
                <module.Icon className="h-5 w-5 text-cyan-300" />
                <p className="mt-3 text-sm font-bold text-white">{module.label}</p>
                <p className="mt-1 text-xs text-slate-400">{module.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
          <section className="card p-4 xl:p-6">
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
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12, fontSize: 12 }}
                      formatter={(value: any) => [`$${value}`, 'Revenue']}
                      labelStyle={{ color: '#f8fafc', fontWeight: 700 }}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#22d3ee" strokeWidth={2} fill="url(#salesGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-white/4 text-sm text-slate-500">
                  No sales data yet today.
                </div>
              )}
            </div>
          </section>

          <section className="card p-4 xl:p-6">
            <div className="mb-5">
              <p className="section-kicker">Kitchen throughput</p>
              <h2 className="mt-1 text-xl font-black text-white">Back-of-house snapshot</h2>
            </div>
            <div className="space-y-3">
              {[
                {
                  label: 'Pending tickets',
                  value: String(kds.pending || 0),
                  tone: (kds.pending || 0) > 5 ? 'text-red-300' : 'text-white',
                },
                { label: 'In progress', value: String(kds.inProgress || 0), tone: 'text-cyan-200' },
                {
                  label: 'Average ticket time',
                  value: `${Math.floor((kds.averageTicketSeconds || 0) / 60)}:${String((kds.averageTicketSeconds || 0) % 60).padStart(2, '0')}`,
                  tone: 'text-emerald-200',
                },
              ].map((item) => (
                <div key={item.label} className="soft-panel flex items-center justify-between px-4 py-3">
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className={clsx('text-xl font-black', item.tone)}>{item.value}</p>
                </div>
              ))}
            </div>
            {restaurantId && (
              <div className="mt-4 grid gap-2">
                <Link href={getRestaurantPOSPath(restaurantId)} className="btn-secondary block w-full py-2.5 text-center text-sm">
                  Open POS →
                </Link>
                <Link href={getRestaurantKDSPath(restaurantId)} className="btn-secondary block w-full py-2.5 text-center text-sm">
                  Open KDS →
                </Link>
              </div>
            )}
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <section className="card p-4 xl:p-5">
            <div className="mb-4 flex items-center gap-3">
              <TableCellsIcon className="h-5 w-5 text-cyan-300" />
              <div>
                <p className="section-kicker">Floor</p>
                <h2 className="mt-1 text-lg font-black text-white">Table status</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="soft-panel px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Occupied</p>
                <p className="mt-1 text-2xl font-black text-cyan-100">{floorCounts.occupied}</p>
              </div>
              <div className="soft-panel px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Available</p>
                <p className="mt-1 text-2xl font-black text-emerald-100">{floorCounts.available}</p>
              </div>
              <div className="soft-panel px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Reserved</p>
                <p className="mt-1 text-2xl font-black text-violet-100">{floorCounts.reserved}</p>
              </div>
              <div className="soft-panel px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Dirty</p>
                <p className="mt-1 text-2xl font-black text-amber-100">{floorCounts.dirty}</p>
              </div>
            </div>
          </section>

          <section className="card p-4 xl:p-5">
            <div className="mb-4 flex items-center gap-3">
              <CalendarDaysIcon className="h-5 w-5 text-cyan-300" />
              <div>
                <p className="section-kicker">Reservations</p>
                <h2 className="mt-1 text-lg font-black text-white">Today&apos;s book</h2>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="soft-panel px-3 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Booked</p>
                <p className="mt-1 text-xl font-black text-white">{reservationCounts.booked}</p>
              </div>
              <div className="soft-panel px-3 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Seated</p>
                <p className="mt-1 text-xl font-black text-emerald-100">{reservationCounts.seated}</p>
              </div>
              <div className="soft-panel px-3 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Waitlist</p>
                <p className="mt-1 text-xl font-black text-amber-100">{reservationCounts.waitlist}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {reservations.slice(0, 4).map((reservation) => (
                <div key={reservation.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{reservation.guestName || reservation.name || 'Guest'}</p>
                    <p className="text-xs text-slate-500">
                      {reservation.partySize || reservation.guestCount || 0} guests
                    </p>
                  </div>
                  <StatusChip label={getReservationState(reservation)} size="sm" variant="neutral" />
                </div>
              ))}
              {reservations.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-500">
                  No reservations on the books today.
                </div>
              )}
            </div>
          </section>

          <section className="card p-4 xl:p-5">
            <div className="mb-4 flex items-center gap-3">
              <UserGroupIcon className="h-5 w-5 text-cyan-300" />
              <div>
                <p className="section-kicker">Staffing</p>
                <h2 className="mt-1 text-lg font-black text-white">Shift readiness</h2>
              </div>
            </div>
            <div className="space-y-2">
              <div className="soft-panel flex items-center justify-between px-4 py-3">
                <p className="text-sm text-slate-400">Clocked in</p>
                <p className="text-xl font-black text-white">{onShiftStaff.length}</p>
              </div>
              <div className="soft-panel flex items-center justify-between px-4 py-3">
                <p className="text-sm text-slate-400">Active staff</p>
                <p className="text-xl font-black text-cyan-100">{activeStaff.length}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {staff.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{member.name}</p>
                    <p className="text-xs text-slate-500">{member.role}</p>
                  </div>
                  <StatusChip
                    label={member.clockedInAt && !member.clockedOutAt ? 'On shift' : member.isActive ? 'Available' : 'Offline'}
                    size="sm"
                    variant={member.clockedInAt && !member.clockedOutAt ? 'available' : member.isActive ? 'neutral' : 'warning'}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="card p-4 xl:p-6">
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
                All stock levels are healthy.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {lowStock.map((item: any) => (
                  <StatusChip
                    key={item.id}
                    label={`${item.name} · ${item.currentStock} ${item.unit || ''}`.trim()}
                    variant="warning"
                    dot
                    size="sm"
                  />
                ))}
              </div>
            )}
          </section>

          <section className="card p-4 xl:p-6">
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
                    {String(log.action || '').replace(/_/g, ' ').toLowerCase()}
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
