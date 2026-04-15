'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';

import api from '@/lib/api';
import { getRestaurantPOSPath, getRestaurantTeamPath } from '@/lib/paths';
import {
  formatCurrency,
  formatHoursFromMinutes,
  formatShiftRange,
  getWeekStartValue,
  groupShiftsByDate,
  type WorkforceOverviewPayload,
} from '@/lib/workforce';
import { useAuthStore } from '@/store';
import { LoadingNotice } from '@/components/ui/LoadingState';

type Tab = 'schedule' | 'timesheet' | 'paycheck';

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${
        active
          ? 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/30'
          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatusChip({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    published: 'bg-emerald-400/10 text-emerald-200',
    in_progress: 'bg-cyan-400/10 text-cyan-200',
    completed: 'bg-slate-700 text-slate-400',
    draft: 'bg-amber-400/10 text-amber-200',
    open: 'bg-violet-400/10 text-violet-200',
    cancelled: 'bg-red-400/10 text-red-300',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${colorMap[status] ?? 'bg-slate-700 text-slate-400'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────

function ScheduleTab({
  overview,
  weekStart,
  setWeekStart,
  currentUserId,
  restaurantId,
}: {
  overview: WorkforceOverviewPayload;
  weekStart: string;
  setWeekStart: (v: string) => void;
  currentUserId: string;
  restaurantId: string;
}) {
  const myShifts = useMemo(
    () => (overview.schedule.shifts || []).filter((shift) => shift.userId === currentUserId),
    [currentUserId, overview.schedule.shifts]
  );
  const grouped = useMemo(() => groupShiftsByDate(myShifts), [myShifts]);

  const scheduledHours = myShifts.reduce((total, shift) => {
    const ms = new Date(shift.endsAt).getTime() - new Date(shift.startsAt).getTime();
    return total + Math.max(0, Math.round(ms / 60000));
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">My Schedule</h2>
          <p className="mt-1 text-sm text-slate-400">
            {myShifts.length} shift{myShifts.length !== 1 ? 's' : ''} · {formatHoursFromMinutes(scheduledHours)} scheduled this week
          </p>
        </div>
        <input
          type="date"
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
          className="input min-w-[170px]"
        />
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-700 px-6 py-14 text-center">
          <CalendarDaysIcon className="mx-auto mb-3 h-10 w-10 text-slate-600" />
          <p className="text-sm text-slate-500">No shifts scheduled for this week.</p>
          <p className="mt-1 text-xs text-slate-600">Check back after your manager publishes the schedule.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([dateKey, shifts]) => (
          <div key={dateKey} className="card overflow-hidden">
            <div className="border-b border-slate-700 bg-slate-800/50 px-5 py-3">
              <p className="text-sm font-semibold text-slate-100">
                {format(parseISO(shifts[0].startsAt), 'EEEE, MMMM d')}
              </p>
            </div>
            <div className="divide-y divide-slate-800">
              {shifts.map((shift) => (
                <div key={shift.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-semibold text-slate-100">{shift.shiftLabel}</p>
                    <p className="mt-0.5 text-sm text-slate-400">{formatShiftRange(shift.startsAt, shift.endsAt)}</p>
                    {shift.roomName && <p className="mt-0.5 text-xs text-slate-500">Room: {shift.roomName}</p>}
                  </div>
                  <StatusChip status={shift.status} />
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Open shifts available to pick up */}
      {(() => {
        const openShifts = (overview.schedule.shifts || []).filter((s) => s.status === 'open');
        if (openShifts.length === 0) return null;
        return (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Open shifts — available to pick up</p>
            <div className="space-y-2">
              {openShifts.slice(0, 5).map((shift) => (
                <div key={shift.id} className="flex items-center justify-between gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-violet-100">{shift.shiftLabel}</p>
                    <p className="text-xs text-slate-400">{formatShiftRange(shift.startsAt, shift.endsAt)}</p>
                  </div>
                  <Link
                    href={getRestaurantTeamPath(restaurantId)}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    Request pickup
                  </Link>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Timesheet Tab ────────────────────────────────────────────────────────────

function TimesheetTab({
  locationId,
  weekStart,
  setWeekStart,
}: {
  locationId: string;
  weekStart: string;
  setWeekStart: (v: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['my-timesheet', locationId, weekStart],
    queryFn: () => api.getMyTimesheet({ locationId, weekStart }),
    enabled: !!locationId,
  });

  const ts = data?.data;

  if (isLoading || !ts) {
    return (
      <div className="flex h-48 items-center justify-center">
        <LoadingNotice title="Loading timesheet" description="Fetching your clock-in records." />
      </div>
    );
  }

  const entries: Array<{
    date: string;
    clockIn: string;
    clockOut: string | null;
    durationMinutes: number;
    notes: string | null;
    source: string;
  }> = ts.entries || [];

  // Group by date
  const byDate = entries.reduce<Record<string, typeof entries>>((groups, entry) => {
    if (!groups[entry.date]) groups[entry.date] = [];
    groups[entry.date].push(entry);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">My Timesheet</h2>
          <p className="mt-1 text-sm text-slate-400">
            {formatHoursFromMinutes(ts.summary.totalMinutes)} worked this week
            {ts.summary.overtimeMinutes > 0 && ` · ${formatHoursFromMinutes(ts.summary.overtimeMinutes)} overtime`}
          </p>
        </div>
        <input
          type="date"
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
          className="input min-w-[170px]"
        />
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[24px] border border-slate-700 bg-slate-900/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Regular</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">{formatHoursFromMinutes(ts.summary.regularMinutes)}</p>
          <p className="text-xs text-slate-500">up to 40h/week</p>
        </div>
        <div className="rounded-[24px] border border-slate-700 bg-slate-900/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Overtime</p>
          <p className="mt-2 text-2xl font-bold text-amber-300">{formatHoursFromMinutes(ts.summary.overtimeMinutes)}</p>
          <p className="text-xs text-slate-500">hours over 40h</p>
        </div>
        <div className="rounded-[24px] border border-slate-700 bg-slate-900/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Clock-ins</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">{entries.length}</p>
          <p className="text-xs text-slate-500">sessions this week</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-700 px-6 py-14 text-center">
          <ClockIcon className="mx-auto mb-3 h-10 w-10 text-slate-600" />
          <p className="text-sm text-slate-500">No timesheet entries for this week.</p>
          <p className="mt-1 text-xs text-slate-600">Clock in on the Team Hub to record your hours.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byDate).map(([date, dayEntries]) => {
            const dayMinutes = dayEntries.reduce((sum, e) => sum + e.durationMinutes, 0);
            return (
              <div key={date} className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/50 px-5 py-3">
                  <p className="text-sm font-semibold text-slate-100">
                    {format(parseISO(date), 'EEEE, MMMM d')}
                  </p>
                  <p className="text-sm font-semibold text-amber-300">{formatHoursFromMinutes(dayMinutes)}</p>
                </div>
                <div className="divide-y divide-slate-800">
                  {dayEntries.map((entry, idx) => {
                    const clockInTime = format(parseISO(entry.clockIn), 'h:mm a');
                    const clockOutTime = entry.clockOut
                      ? format(parseISO(entry.clockOut), 'h:mm a')
                      : null;
                    return (
                      <div key={idx} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-100">
                              {clockInTime}
                              {clockOutTime ? ` → ${clockOutTime}` : ' → In progress'}
                            </span>
                            {!entry.clockOut && (
                              <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          {entry.notes && (
                            <p className="mt-0.5 text-xs text-slate-500">{entry.notes}</p>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-300">
                          {formatHoursFromMinutes(entry.durationMinutes)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Paycheck Tab ─────────────────────────────────────────────────────────────

function PaycheckTab({
  locationId,
  weekStart,
  setWeekStart,
}: {
  locationId: string;
  weekStart: string;
  setWeekStart: (v: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['my-timesheet', locationId, weekStart],
    queryFn: () => api.getMyTimesheet({ locationId, weekStart }),
    enabled: !!locationId,
    staleTime: 30_000,
  });

  const ts = data?.data;

  if (isLoading || !ts) {
    return (
      <div className="flex h-48 items-center justify-center">
        <LoadingNotice title="Loading paycheck" description="Fetching your earnings for this week." />
      </div>
    );
  }

  const { summary } = ts;
  const hasRateSet = summary.hourlyRate > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Paycheck Estimate</h2>
          <p className="mt-1 text-sm text-slate-400">
            Based on hours recorded this week. Final amounts may differ.
          </p>
        </div>
        <input
          type="date"
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
          className="input min-w-[170px]"
        />
      </div>

      {!hasRateSet ? (
        <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/5 px-6 py-10 text-center">
          <BanknotesIcon className="mx-auto mb-3 h-10 w-10 text-amber-500/50" />
          <p className="text-sm text-amber-200">Pay rate not configured</p>
          <p className="mt-1 text-xs text-slate-500">
            Ask your manager to set your hourly rate in the Workforce Admin panel.
          </p>
        </div>
      ) : (
        <>
          {/* Big total */}
          <div className="rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-emerald-900/30 to-slate-900/60 p-6 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Estimated Gross Pay</p>
            <p className="mt-3 text-5xl font-black text-white">{formatCurrency(summary.estimatedGrossPay)}</p>
            <p className="mt-2 text-sm text-slate-400">
              Week of {format(parseISO(ts.weekStart.slice(0, 10)), 'MMMM d, yyyy')}
            </p>
          </div>

          {/* Pay breakdown */}
          <div className="card overflow-hidden">
            <div className="border-b border-slate-700 bg-slate-800/50 px-5 py-3">
              <p className="text-sm font-semibold text-slate-100">Earnings Breakdown</p>
            </div>
            <div className="divide-y divide-slate-800">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-100">Regular Pay</p>
                  <p className="text-xs text-slate-500">
                    {formatHoursFromMinutes(summary.regularMinutes)} × {formatCurrency(summary.hourlyRate)}/hr
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-100">{formatCurrency(summary.regularPay)}</p>
              </div>
              {summary.overtimeMinutes > 0 && (
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-amber-200">Overtime Pay</p>
                    <p className="text-xs text-slate-500">
                      {formatHoursFromMinutes(summary.overtimeMinutes)} × {formatCurrency(summary.overtimeRate)}/hr
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-amber-200">{formatCurrency(summary.overtimePay)}</p>
                </div>
              )}
              <div className="flex items-center justify-between bg-slate-800/30 px-5 py-4">
                <p className="text-sm font-bold text-slate-100">Estimated Gross</p>
                <p className="text-sm font-bold text-emerald-300">{formatCurrency(summary.estimatedGrossPay)}</p>
              </div>
            </div>
          </div>

          {/* Rate info */}
          <div className="rounded-[24px] border border-slate-700 bg-slate-900/50 p-4">
            <p className="text-xs font-semibold text-slate-400">Your Pay Rates</p>
            <div className="mt-2 flex flex-wrap gap-4">
              <div>
                <p className="text-xs text-slate-500">Regular</p>
                <p className="text-sm font-semibold text-slate-100">{formatCurrency(summary.hourlyRate)}/hr</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Overtime</p>
                <p className="text-sm font-semibold text-slate-100">{formatCurrency(summary.overtimeRate)}/hr</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Hours this week</p>
                <p className="text-sm font-semibold text-slate-100">{formatHoursFromMinutes(summary.totalMinutes)}</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-600">
              This is an estimate. Tips and deductions are processed separately by your manager. Contact HR for your official pay statement.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StaffPortalPage({
  restaurantId,
  initialLocationId,
}: {
  restaurantId: string;
  initialLocationId?: string | null;
}) {
  const { user, locationId } = useAuthStore();
  const [tab, setTab] = useState<Tab>('schedule');
  const [weekStart, setWeekStart] = useState(getWeekStartValue());

  const activeLocationId = locationId || initialLocationId || user?.locationId || user?.locationIds?.[0] || '';

  const { data, isLoading } = useQuery({
    queryKey: ['workforce', activeLocationId, weekStart, 'portal'],
    queryFn: () => api.getWorkforceOverview({ locationId: activeLocationId, weekStart }),
    enabled: !!activeLocationId,
  });

  const overview = data?.data as WorkforceOverviewPayload | undefined;
  const currentUserId = user?.id || '';
  const currentMember = overview?.staff?.find((m: any) => m.id === currentUserId) || user;

  if (!activeLocationId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-400">
        Select a location first.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#07111f_0%,#0c1728_50%,#020617_100%)]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">My Portal</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-100">
              {currentMember?.name || 'Staff'}&apos;s Dayforce
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {currentMember?.role ? `${currentMember.role.charAt(0) + currentMember.role.slice(1).toLowerCase()} · ` : ''}
              Schedule, timesheet, and pay — all in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={getRestaurantPOSPath(restaurantId)} className="btn-secondary">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to POS
            </Link>
            <Link href={getRestaurantTeamPath(restaurantId)} className="btn-secondary">
              Team Hub
            </Link>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mt-6 flex flex-wrap gap-2 rounded-[28px] border border-slate-700 bg-slate-900/60 p-1.5">
          <TabButton
            active={tab === 'schedule'}
            onClick={() => setTab('schedule')}
            icon={<CalendarDaysIcon className="h-4 w-4" />}
            label="My Schedule"
          />
          <TabButton
            active={tab === 'timesheet'}
            onClick={() => setTab('timesheet')}
            icon={<ClockIcon className="h-4 w-4" />}
            label="Timesheet"
          />
          <TabButton
            active={tab === 'paycheck'}
            onClick={() => setTab('paycheck')}
            icon={<BanknotesIcon className="h-4 w-4" />}
            label="Paycheck"
          />
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {(isLoading || !overview) && tab === 'schedule' ? (
            <div className="flex h-48 items-center justify-center">
              <LoadingNotice title="Loading your portal" description="Syncing schedule and shift data." />
            </div>
          ) : null}

          {tab === 'schedule' && overview && (
            <ScheduleTab
              overview={overview}
              weekStart={weekStart}
              setWeekStart={setWeekStart}
              currentUserId={currentUserId}
              restaurantId={restaurantId}
            />
          )}
          {tab === 'timesheet' && (
            <TimesheetTab
              locationId={activeLocationId}
              weekStart={weekStart}
              setWeekStart={setWeekStart}
            />
          )}
          {tab === 'paycheck' && (
            <PaycheckTab
              locationId={activeLocationId}
              weekStart={weekStart}
              setWeekStart={setWeekStart}
            />
          )}
        </div>
      </div>
    </div>
  );
}
