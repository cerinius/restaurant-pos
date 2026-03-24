'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ClockIcon,
  SparklesIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { getRestaurantAdminPath, getRestaurantPOSPath } from '@/lib/paths';
import {
  DAYS_OF_WEEK,
  formatCurrency,
  formatHoursFromMinutes,
  formatShiftDate,
  formatShiftRange,
  getWeekStartValue,
  groupShiftsByDate,
  isShiftForToday,
  type WorkforceOverviewPayload,
} from '@/lib/workforce';
import { useAuthStore } from '@/store';
import { LoadingNotice, SkeletonBlock } from '@/components/ui/LoadingState';

type AvailabilityFormState = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  temporaryDate: string;
  notes: string;
};

function createAvailabilityForm(): AvailabilityFormState {
  return {
    dayOfWeek: String(new Date().getDay()),
    startTime: '09:00',
    endTime: '17:00',
    temporaryDate: '',
    notes: '',
  };
}

function canOpenAdmin(role?: string) {
  return ['OWNER', 'MANAGER'].includes(String(role || '').toUpperCase());
}

export default function TeamHubPage({
  restaurantId,
  initialLocationId,
}: {
  restaurantId: string;
  initialLocationId?: string | null;
}) {
  const qc = useQueryClient();
  const { user, locationId } = useAuthStore();
  const [weekStart, setWeekStart] = useState(getWeekStartValue());
  const [managerPin, setManagerPin] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityFormState>(createAvailabilityForm());
  const [requestNotes, setRequestNotes] = useState<Record<string, string>>({});

  const activeLocationId = locationId || initialLocationId || user?.locationId || user?.locationIds?.[0] || '';

  const { data, isLoading } = useQuery({
    queryKey: ['workforce', activeLocationId, weekStart, 'team'],
    queryFn: () => api.getWorkforceOverview({ locationId: activeLocationId, weekStart }),
    enabled: !!activeLocationId,
  });

  const overview = data?.data as WorkforceOverviewPayload | undefined;

  const currentMember = useMemo(() => {
    if (!overview) return user || null;
    if (user?.id) {
      return overview.staff.find((entry: any) => entry.id === user.id) || user;
    }
    return overview.staff.length === 1 ? overview.staff[0] : user || null;
  }, [overview, user]);

  const currentUserId = currentMember?.id || user?.id || '';
  const myShifts = useMemo(
    () => (overview?.schedule.shifts || []).filter((shift) => shift.userId === currentUserId),
    [currentUserId, overview?.schedule.shifts]
  );
  const openShifts = useMemo(
    () => (overview?.schedule.shifts || []).filter((shift) => shift.status === 'open'),
    [overview?.schedule.shifts]
  );
  const groupedMyShifts = useMemo(() => groupShiftsByDate(myShifts), [myShifts]);
  const myAvailability = useMemo(
    () => (overview?.workforce.availability || []).filter((entry) => entry.userId === currentUserId),
    [currentUserId, overview?.workforce.availability]
  );
  const myRequests = useMemo(
    () =>
      (overview?.workforce.requests || []).filter(
        (entry) => entry.requestedByUserId === currentUserId || entry.targetUserId === currentUserId
      ),
    [currentUserId, overview?.workforce.requests]
  );
  const myAssignments = useMemo(
    () => (overview?.workforce.sectionAssignments || []).filter((entry) => entry.serverId === currentUserId),
    [currentUserId, overview?.workforce.sectionAssignments]
  );
  const activeSession = useMemo(
    () => overview?.labor.activeSessions.find((entry) => entry.userId === currentUserId) || null,
    [currentUserId, overview?.labor.activeSessions]
  );
  const myTimesheet = useMemo(
    () => overview?.timesheets.find((entry) => entry.userId === currentUserId) || null,
    [currentUserId, overview?.timesheets]
  );
  const todayShift = useMemo(
    () =>
      myShifts.find((shift) => isShiftForToday(shift) && ['draft', 'published', 'in_progress'].includes(shift.status)) ||
      myShifts.find((shift) => shift.status !== 'completed' && shift.status !== 'cancelled') ||
      null,
    [myShifts]
  );
  const pendingRequestIds = useMemo(
    () => new Set(myRequests.filter((entry) => entry.status === 'pending').map((entry) => entry.shiftId)),
    [myRequests]
  );

  useEffect(() => {
    if (!myAvailability.length) return;
    setAvailabilityForm((current) => ({ ...current, dayOfWeek: String(myAvailability[0].dayOfWeek) }));
  }, [myAvailability]);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['workforce'] });
  };

  const startShiftMutation = useMutation({
    mutationFn: (shiftId?: string | null) =>
      api.startWorkforceShift({
        locationId: activeLocationId,
        shiftId: shiftId || undefined,
        managerPin,
        notes: shiftNotes || undefined,
      }),
    onSuccess: async () => {
      toast.success('Shift started');
      setManagerPin('');
      setShiftNotes('');
      await refresh();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Could not start shift'),
  });

  const endShiftMutation = useMutation({
    mutationFn: () =>
      api.endWorkforceShift({
        locationId: activeLocationId,
        notes: shiftNotes || undefined,
      }),
    onSuccess: async () => {
      toast.success('Shift ended');
      setShiftNotes('');
      await refresh();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Could not end shift'),
  });

  const saveAvailabilityMutation = useMutation({
    mutationFn: () =>
      api.saveWorkforceAvailability({
        locationId: activeLocationId,
        dayOfWeek: Number(availabilityForm.dayOfWeek),
        startTime: availabilityForm.startTime,
        endTime: availabilityForm.endTime,
        temporaryDate: availabilityForm.temporaryDate || undefined,
        notes: availabilityForm.notes || undefined,
      }),
    onSuccess: async () => {
      toast.success('Availability saved');
      setAvailabilityForm(createAvailabilityForm());
      await refresh();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Could not save availability'),
  });

  const deleteAvailabilityMutation = useMutation({
    mutationFn: (id: string) => api.deleteWorkforceAvailability(id, activeLocationId || undefined),
    onSuccess: async () => {
      toast.success('Availability removed');
      await refresh();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Could not remove availability'),
  });

  const requestMutation = useMutation({
    mutationFn: ({ shiftId, type }: { shiftId: string; type: 'give-up' | 'pickup' }) =>
      api.createShiftRequest({
        locationId: activeLocationId,
        shiftId,
        type,
        notes: requestNotes[shiftId] || undefined,
      }),
    onSuccess: async (_result, variables) => {
      toast.success(variables.type === 'pickup' ? 'Pickup request sent' : 'Shift release request sent');
      setRequestNotes((current) => ({ ...current, [variables.shiftId]: '' }));
      await refresh();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Could not submit request'),
  });

  if (!activeLocationId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-400">
        Select a location first.
      </div>
    );
  }

  if (isLoading || !overview) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#07111f_0%,#0c1728_50%,#020617_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <SkeletonBlock className="h-8 w-52" />
          <SkeletonBlock className="mt-2 h-4 w-64" />
          <div className="mt-6">
            <LoadingNotice
              title="Loading your team hub"
              description="We are syncing your schedule, availability, shift requests, and current labor session."
            />
          </div>
        </div>
      </div>
    );
  }

  const scheduledHours = myShifts.reduce((total, shift) => {
    const start = new Date(shift.startsAt).getTime();
    const end = new Date(shift.endsAt).getTime();
    return total + Math.max(0, Math.round((end - start) / 60000));
  }, 0);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#07111f_0%,#0c1728_50%,#020617_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Team Hub</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-100">
              {currentMember?.name || 'Staff'} schedule and shift center
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              See your schedule, update availability, pick up shifts, and start work with manager approval.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={getRestaurantPOSPath(restaurantId)} className="btn-secondary">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to POS
            </Link>
            {canOpenAdmin(currentMember?.role) && (
              <Link href={getRestaurantAdminPath(restaurantId, 'workforce')} className="btn-secondary">
                <BriefcaseIcon className="mr-2 h-4 w-4" />
                Workforce Admin
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">This Week</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{formatHoursFromMinutes(scheduledHours)}</p>
            <p className="text-xs text-slate-400">{myShifts.length} shifts on your schedule</p>
          </div>
          <div className="card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Open Shifts</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{openShifts.length}</p>
            <p className="text-xs text-slate-400">Available to request for pickup</p>
          </div>
          <div className="card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Availability</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{myAvailability.length}</p>
            <p className="text-xs text-slate-400">Saved recurring or date-specific windows</p>
          </div>
          <div className="card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">My Tables</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{myAssignments.length}</p>
            <p className="text-xs text-slate-400">Current section assignments from the live floor plan</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Shift Start and End</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Starting a shift requires a manager PIN, and ending it updates labor in real time.
                </p>
              </div>
              <span className="status-chip">
                <ClockIcon className="h-4 w-4" />
                {activeSession ? 'Clocked In' : 'Awaiting Start'}
              </span>
            </div>

            <div className="mt-4 rounded-[24px] border border-slate-700 bg-slate-900/70 p-4">
              <p className="text-sm font-semibold text-slate-100">{todayShift ? "Today's shift" : 'No active schedule today'}</p>
              <p className="mt-1 text-sm text-slate-400">
                {todayShift
                  ? `${todayShift.shiftLabel} | ${formatShiftRange(todayShift.startsAt, todayShift.endsAt)}`
                  : 'You can still start an unscheduled shift with manager approval if needed.'}
              </p>
              {todayShift?.roomName && <p className="mt-1 text-xs text-slate-500">Room: {todayShift.roomName}</p>}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {!activeSession && (
                <input
                  type="password"
                  value={managerPin}
                  onChange={(event) => setManagerPin(event.target.value)}
                  className="input w-full"
                  placeholder="Manager PIN"
                />
              )}
              <input
                value={shiftNotes}
                onChange={(event) => setShiftNotes(event.target.value)}
                className="input w-full"
                placeholder="Optional shift note"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {activeSession ? (
                <button type="button" onClick={() => endShiftMutation.mutate()} className="btn-primary" disabled={endShiftMutation.isPending}>
                  {endShiftMutation.isPending ? 'Ending...' : 'End Shift'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startShiftMutation.mutate(todayShift?.id || null)}
                  className="btn-primary"
                  disabled={startShiftMutation.isPending || managerPin.length < 4}
                >
                  {startShiftMutation.isPending ? 'Starting...' : 'Start Shift'}
                </button>
              )}
              {activeSession && (
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  Live session: {formatHoursFromMinutes(activeSession.workedMinutes)} | {formatCurrency(activeSession.estimatedCost)}
                </div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Weekly Snapshot</h2>
                <p className="mt-1 text-sm text-slate-400">Track what is scheduled, worked, and already costing in labor.</p>
              </div>
              <input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} className="input min-w-[170px]" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-slate-700 bg-slate-900/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Worked</p>
                <p className="mt-2 text-xl font-bold text-slate-100">
                  {formatHoursFromMinutes(myTimesheet?.workedMinutes || activeSession?.workedMinutes || 0)}
                </p>
                <p className="text-xs text-slate-400">Recorded from started and ended shifts.</p>
              </div>
              <div className="rounded-[24px] border border-slate-700 bg-slate-900/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Labor Value</p>
                <p className="mt-2 text-xl font-bold text-slate-100">{formatCurrency(myTimesheet?.cost || activeSession?.estimatedCost || 0)}</p>
                <p className="text-xs text-slate-400">Estimated from your assigned labor profile.</p>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-slate-700 bg-slate-900/70 p-4">
              <p className="text-sm font-semibold text-slate-100">Recent requests</p>
              <div className="mt-3 space-y-2">
                {myRequests.length === 0 ? (
                  <p className="text-sm text-slate-500">No shift requests yet.</p>
                ) : (
                  myRequests.slice(0, 4).map((request) => (
                    <div key={request.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-100">{request.type === 'pickup' ? 'Pickup request' : 'Give-up request'}</p>
                        <p className="text-xs text-slate-500">{request.notes || 'No note added'}</p>
                      </div>
                      <span
                        className={clsx(
                          'rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
                          request.status === 'approved'
                            ? 'bg-emerald-400/10 text-emerald-100'
                            : request.status === 'declined'
                              ? 'bg-red-400/10 text-red-100'
                              : 'bg-amber-400/10 text-amber-100'
                        )}
                      >
                        {request.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">My Schedule</h2>
                <p className="mt-1 text-sm text-slate-400">Your assigned shifts for the selected week.</p>
              </div>
              <CalendarDaysIcon className="h-5 w-5 text-slate-500" />
            </div>
            <div className="space-y-4 p-5">
              {Object.keys(groupedMyShifts).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-500">
                  No scheduled shifts for this week.
                </div>
              ) : (
                Object.entries(groupedMyShifts).map(([dateKey, shifts]) => (
                  <div key={dateKey} className="rounded-[24px] border border-slate-700 bg-slate-900/70 p-4">
                    <h3 className="text-sm font-semibold text-slate-100">{formatShiftDate(shifts[0].startsAt)}</h3>
                    <div className="mt-3 space-y-3">
                      {shifts.map((shift) => {
                        const requestPending = pendingRequestIds.has(shift.id);
                        const canGiveUp =
                          shift.status !== 'in_progress' &&
                          shift.status !== 'completed' &&
                          new Date(shift.startsAt).getTime() > Date.now();

                        return (
                          <div key={shift.id} className="rounded-2xl border border-slate-700 px-4 py-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-100">{shift.shiftLabel}</p>
                                <p className="mt-1 text-xs text-slate-400">{formatShiftRange(shift.startsAt, shift.endsAt)}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {shift.roomName || 'Room not set'} | {shift.status}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => requestMutation.mutate({ shiftId: shift.id, type: 'give-up' })}
                                disabled={!canGiveUp || requestPending || requestMutation.isPending}
                                className="btn-secondary px-3 py-2 text-xs"
                              >
                                {requestPending ? 'Pending' : 'Give Up'}
                              </button>
                            </div>
                            <input
                              value={requestNotes[shift.id] || ''}
                              onChange={(event) =>
                                setRequestNotes((current) => ({ ...current, [shift.id]: event.target.value }))
                              }
                              className="input mt-3 w-full"
                              placeholder="Optional note for manager"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">Open Shifts</h2>
                  <p className="mt-1 text-sm text-slate-400">Request pickup for shifts the manager has opened.</p>
                </div>
                <SparklesIcon className="h-5 w-5 text-slate-500" />
              </div>
              <div className="mt-4 space-y-3">
                {openShifts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
                    No open shifts right now.
                  </div>
                ) : (
                  openShifts.map((shift) => {
                    const requestPending = pendingRequestIds.has(shift.id);
                    return (
                      <div key={shift.id} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                        <p className="text-sm font-semibold text-slate-100">{shift.shiftLabel}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatShiftRange(shift.startsAt, shift.endsAt)}</p>
                        <p className="mt-1 text-xs text-slate-500">{shift.roomName || 'Room not set'} | {shift.role}</p>
                        <input
                          value={requestNotes[shift.id] || ''}
                          onChange={(event) =>
                            setRequestNotes((current) => ({ ...current, [shift.id]: event.target.value }))
                          }
                          className="input mt-3 w-full"
                          placeholder="Optional note for pickup request"
                        />
                        <button
                          type="button"
                          onClick={() => requestMutation.mutate({ shiftId: shift.id, type: 'pickup' })}
                          disabled={requestPending || requestMutation.isPending}
                          className="btn-primary mt-3 w-full"
                        >
                          {requestPending ? 'Pending Approval' : 'Request Pickup'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">My Section</h2>
                  <p className="mt-1 text-sm text-slate-400">Tables currently assigned to you from the floor plan.</p>
                </div>
                <TableCellsIcon className="h-5 w-5 text-slate-500" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {myAssignments.length === 0 ? (
                  <p className="text-sm text-slate-500">No tables assigned yet.</p>
                ) : (
                  myAssignments.map((assignment) => (
                    <span key={assignment.id} className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-100">
                      {assignment.tableName}
                      {assignment.roomName ? ` | ${assignment.roomName}` : ''}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Availability</h2>
                <p className="mt-1 text-sm text-slate-400">Set your recurring windows or add a one-day override.</p>
              </div>
              <CalendarDaysIcon className="h-5 w-5 text-slate-500" />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select
                value={availabilityForm.dayOfWeek}
                onChange={(event) => setAvailabilityForm((current) => ({ ...current, dayOfWeek: event.target.value }))}
                className="input w-full"
              >
                {DAYS_OF_WEEK.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={availabilityForm.temporaryDate}
                onChange={(event) =>
                  setAvailabilityForm((current) => ({ ...current, temporaryDate: event.target.value }))
                }
                className="input w-full"
              />
              <input
                type="time"
                value={availabilityForm.startTime}
                onChange={(event) => setAvailabilityForm((current) => ({ ...current, startTime: event.target.value }))}
                className="input w-full"
              />
              <input
                type="time"
                value={availabilityForm.endTime}
                onChange={(event) => setAvailabilityForm((current) => ({ ...current, endTime: event.target.value }))}
                className="input w-full"
              />
              <input
                value={availabilityForm.notes}
                onChange={(event) => setAvailabilityForm((current) => ({ ...current, notes: event.target.value }))}
                className="input md:col-span-2"
                placeholder="Optional note"
              />
            </div>

            <button
              type="button"
              onClick={() => saveAvailabilityMutation.mutate()}
              disabled={saveAvailabilityMutation.isPending}
              className="btn-primary mt-4"
            >
              {saveAvailabilityMutation.isPending ? 'Saving...' : 'Save Availability'}
            </button>

            <div className="mt-5 space-y-3">
              {myAvailability.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
                  No availability saved yet.
                </div>
              ) : (
                myAvailability.map((entry) => (
                  <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">
                        {entry.temporaryDate || DAYS_OF_WEEK[entry.dayOfWeek]}
                      </p>
                      <p className="text-xs text-slate-400">
                        {entry.startTime} - {entry.endTime}
                      </p>
                      {entry.notes && <p className="text-xs text-slate-500">{entry.notes}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteAvailabilityMutation.mutate(entry.id)}
                      className="btn-secondary px-3 py-2 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Timesheet Summary</h2>
                <p className="mt-1 text-sm text-slate-400">See how much you worked and what is still active this week.</p>
              </div>
              <ClockIcon className="h-5 w-5 text-slate-500" />
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-[24px] border border-slate-700 bg-slate-900/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Scheduled</p>
                <p className="mt-2 text-xl font-bold text-slate-100">{formatHoursFromMinutes(myTimesheet?.scheduledMinutes || scheduledHours)}</p>
                <p className="text-xs text-slate-400">Shifts assigned for the selected week.</p>
              </div>
              <div className="rounded-[24px] border border-slate-700 bg-slate-900/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Worked</p>
                <p className="mt-2 text-xl font-bold text-slate-100">{formatHoursFromMinutes(myTimesheet?.workedMinutes || 0)}</p>
                <p className="text-xs text-slate-400">Completed and closed shift time.</p>
              </div>
              <div className="rounded-[24px] border border-slate-700 bg-slate-900/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Still Active</p>
                <p className="mt-2 text-xl font-bold text-slate-100">{formatHoursFromMinutes(myTimesheet?.activeMinutes || activeSession?.workedMinutes || 0)}</p>
                <p className="text-xs text-slate-400">Time still running on your current session.</p>
              </div>
              <div className="rounded-[24px] border border-slate-700 bg-slate-900/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Estimated Pay</p>
                <p className="mt-2 text-xl font-bold text-slate-100">{formatCurrency(myTimesheet?.cost || 0)}</p>
                <p className="text-xs text-slate-400">Labor estimate based on recorded time and role profile.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
