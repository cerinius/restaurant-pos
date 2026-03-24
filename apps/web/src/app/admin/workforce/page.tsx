'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDaysIcon, SparklesIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import {
  formatCurrency,
  formatHoursFromMinutes,
  formatShiftDate,
  formatShiftRange,
  getWeekStartValue,
  groupShiftsByDate,
  type WorkforceOverviewPayload,
} from '@/lib/workforce';
import { useAuthStore } from '@/store';
import { LoadingNotice, SkeletonBlock } from '@/components/ui/LoadingState';

type WorkforceTab = 'scheduling' | 'assignments' | 'timesheets' | 'labor';

function toDateTimeInput(value?: string | null) {
  if (!value) return '';
  return format(parseISO(value), "yyyy-MM-dd'T'HH:mm");
}

function nowInput() {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm");
}

function createShiftForm() {
  const start = new Date();
  start.setHours(11, 0, 0, 0);
  const end = new Date(start);
  end.setHours(19);

  return {
    id: '',
    userId: '',
    role: 'SERVER',
    startsAt: toDateTimeInput(start.toISOString()),
    endsAt: toDateTimeInput(end.toISOString()),
    shiftLabel: 'Lunch',
    roomName: 'Main',
    notes: '',
    status: 'draft',
  };
}

export default function WorkforcePage() {
  const qc = useQueryClient();
  const { locationId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<WorkforceTab>('scheduling');
  const [weekStart, setWeekStart] = useState(getWeekStartValue());
  const [assignmentTimestamp, setAssignmentTimestamp] = useState(nowInput());
  const [selectedServerId, setSelectedServerId] = useState('');
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [shiftForm, setShiftForm] = useState(createShiftForm());
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string>>({});
  const [profileDrafts, setProfileDrafts] = useState<Record<string, { hourlyRate: string; maxTables: string; preferredRoom: string }>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['workforce', locationId, weekStart],
    queryFn: () => api.getWorkforceOverview({ locationId, weekStart }),
    enabled: !!locationId,
  });

  const overview = data?.data as WorkforceOverviewPayload | undefined;

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['workforce'] }),
      qc.invalidateQueries({ queryKey: ['locations'] }),
      qc.invalidateQueries({ queryKey: ['tables-floor'] }),
      qc.invalidateQueries({ queryKey: ['tables'] }),
    ]);
  };

  useEffect(() => {
    if (!overview) return;

    setDraftAssignments(Object.fromEntries(overview.currentAssignments.map((entry) => [entry.tableId, entry.serverId])));
    setProfileDrafts(
      overview.staff.reduce((acc: Record<string, { hourlyRate: string; maxTables: string; preferredRoom: string }>, member: any) => {
        const profile = overview.workforce.profiles.find((entry) => entry.userId === member.id);
        acc[member.id] = {
          hourlyRate: String(profile?.hourlyRate ?? ''),
          maxTables: String(profile?.maxTables ?? 6),
          preferredRoom: profile?.preferredRoom || '',
        };
        return acc;
      }, {})
    );
  }, [overview]);

  const availableStaff = useMemo(
    () => (overview?.staff || []).filter((member: any) => member.role !== 'OWNER'),
    [overview?.staff]
  );

  const groupedShifts = useMemo(() => groupShiftsByDate(overview?.schedule.shifts || []), [overview?.schedule.shifts]);

  const scheduledStaff = useMemo(() => {
    if (!overview) return [];
    const at = new Date(assignmentTimestamp);
    return overview.workforce.shifts
      .filter((shift) => shift.userId && ['draft', 'published', 'in_progress'].includes(shift.status))
      .filter((shift) => new Date(shift.startsAt) < at && new Date(shift.endsAt) > at)
      .filter((shift, index, list) => list.findIndex((entry) => entry.userId === shift.userId) === index);
  }, [assignmentTimestamp, overview]);

  useEffect(() => {
    if (!scheduledStaff.length) {
      setSelectedServerId('');
      return;
    }

    const stillValid = scheduledStaff.some((shift) => shift.userId === selectedServerId);
    if (!stillValid) {
      setSelectedServerId(scheduledStaff[0]?.userId || '');
    }
  }, [scheduledStaff, selectedServerId]);

  const assignmentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    availableStaff.forEach((member: any) => map.set(member.id, member.name || member.role));
    scheduledStaff.forEach((shift) => {
      if (shift.userId) map.set(shift.userId, shift.userName || shift.role);
    });
    return map;
  }, [availableStaff, scheduledStaff]);

  const tablesByRoom = useMemo(() => {
    const map = new Map<string, any[]>();
    (overview?.tables || []).forEach((table: any) => {
      const roomName = String(table.section || 'Main');
      if (!map.has(roomName)) map.set(roomName, []);
      map.get(roomName)!.push(table);
    });
    return Array.from(map.entries()).map(([roomName, tables]) => ({
      roomName,
      tables: [...tables].sort((left, right) => Number(left.positionX || 0) - Number(right.positionX || 0)),
    }));
  }, [overview?.tables]);

  const autoBuildMutation = useMutation({
    mutationFn: () => api.autoBuildSchedule({ locationId, weekStart }),
    onSuccess: async () => {
      toast.success('Draft schedule generated');
      await refresh();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to build schedule'),
  });

  const publishMutation = useMutation({
    mutationFn: () => api.publishSchedule({ locationId, weekStart }),
    onSuccess: async () => {
      toast.success('Schedule published');
      await refresh();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to publish schedule'),
  });

  const saveShiftMutation = useMutation({
    mutationFn: () => {
      const payload = {
        locationId,
        userId: shiftForm.userId || null,
        role: shiftForm.role,
        startsAt: new Date(shiftForm.startsAt).toISOString(),
        endsAt: new Date(shiftForm.endsAt).toISOString(),
        shiftLabel: shiftForm.shiftLabel,
        roomName: shiftForm.roomName,
        notes: shiftForm.notes,
        status: shiftForm.status,
      };

      return shiftForm.id ? api.updateWorkforceShift(shiftForm.id, payload) : api.createWorkforceShift(payload);
    },
    onSuccess: async () => {
      toast.success(shiftForm.id ? 'Shift updated' : 'Shift added');
      setShiftForm(createShiftForm());
      setShowShiftForm(false);
      await refresh();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to save shift'),
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (shiftId: string) => api.deleteWorkforceShift(shiftId, locationId || undefined),
    onSuccess: async () => {
      toast.success('Shift removed');
      await refresh();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to remove shift'),
  });

  const reviewRequestMutation = useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: 'approved' | 'declined' }) =>
      api.reviewShiftRequest(requestId, { locationId, status }),
    onSuccess: async (_result, variables) => {
      toast.success(variables.status === 'approved' ? 'Request approved' : 'Request declined');
      await refresh();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to review request'),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (userId: string) =>
      api.updateWorkforceProfile(userId, {
        locationId,
        hourlyRate: Number(profileDrafts[userId]?.hourlyRate || 0),
        maxTables: Number(profileDrafts[userId]?.maxTables || 6),
        preferredRoom: profileDrafts[userId]?.preferredRoom || null,
      }),
    onSuccess: async () => {
      toast.success('Labor profile saved');
      await refresh();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to save labor profile'),
  });

  const autoAssignMutation = useMutation({
    mutationFn: () => api.autoAssignSections({ locationId, timestamp: new Date(assignmentTimestamp).toISOString() }),
    onSuccess: async (result: any) => {
      const assignments = Array.isArray(result?.data) ? result.data : [];
      setDraftAssignments(Object.fromEntries(assignments.map((entry: any) => [entry.tableId, entry.serverId])));
      toast.success('Tables auto-assigned');
      await refresh();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to auto-assign tables'),
  });

  const saveAssignmentsMutation = useMutation({
    mutationFn: () =>
      api.saveSectionAssignments({
        locationId,
        timestamp: new Date(assignmentTimestamp).toISOString(),
        assignments: Object.entries(draftAssignments).map(([tableId, serverId]) => ({ tableId, serverId })),
      }),
    onSuccess: async () => {
      toast.success('Assignments saved');
      await refresh();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to save assignments'),
  });

  if (!locationId) {
    return <div className="flex flex-1 items-center justify-center p-10 text-slate-400">Select a location first.</div>;
  }

  if (isLoading || !overview) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-slate-700 bg-slate-950/50 px-6 py-4">
          <SkeletonBlock className="h-7 w-56" />
          <SkeletonBlock className="mt-2 h-4 w-64" />
        </div>
        <div className="p-6">
          <LoadingNotice
            title="Loading workforce module"
            description="We are pulling schedules, requests, labor, and section assignments."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-700 bg-slate-950/50 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Workforce</h1>
            <p className="text-sm text-slate-400">
              Build schedules, review shift changes, track labor, and assign sections from one manager screen.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} className="input min-w-[170px]" />
            <button type="button" onClick={() => autoBuildMutation.mutate()} className="btn-secondary flex items-center gap-2">
              <SparklesIcon className="h-4 w-4" />
              {autoBuildMutation.isPending ? 'Building...' : 'Auto Build Week'}
            </button>
            <button type="button" onClick={() => publishMutation.mutate()} className="btn-primary flex items-center gap-2">
              <CalendarDaysIcon className="h-4 w-4" />
              {publishMutation.isPending ? 'Publishing...' : 'Publish Schedule'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ['Scheduled Hours', formatHoursFromMinutes(overview.schedule.scheduledMinutes), `${overview.schedule.shifts.length} shifts this week`],
            ['Scheduled Labor', formatCurrency(overview.schedule.scheduledCost), 'Projected labor'],
            ['Pending Requests', String(overview.workforce.requests.filter((entry) => entry.status === 'pending').length), 'Awaiting approval'],
            ['Clocked In Now', String(overview.labor.activeSessions.length), `${formatCurrency(overview.labor.activeCostNow)} live labor`],
          ].map(([label, value, sub]) => (
            <div key={label} className="card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
              <p className="mt-2 text-xl font-bold text-slate-100">{value}</p>
              <p className="text-xs text-slate-400">{sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ['scheduling', 'Scheduling'],
            ['assignments', 'Section Assignments'],
            ['timesheets', 'Timesheets'],
            ['labor', 'Labor'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveTab(value as WorkforceTab)}
              className={clsx(
                'rounded-full border px-4 py-2 text-sm font-semibold transition-all',
                activeTab === value
                  ? 'border-cyan-200 bg-cyan-300 text-slate-950'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'scheduling' && (
          <div className="space-y-6">
            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Shift Builder</p>
                  <p className="text-xs text-slate-400">Add shifts manually, or edit the auto-built draft before you publish it.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowShiftForm((current) => !current);
                    if (!showShiftForm) setShiftForm(createShiftForm());
                  }}
                  className="btn-secondary"
                >
                  {showShiftForm ? 'Close Builder' : 'Add Shift'}
                </button>
              </div>

              {showShiftForm && (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <select
                    value={shiftForm.userId}
                    onChange={(event) => {
                      const member = availableStaff.find((entry: any) => entry.id === event.target.value);
                      setShiftForm((current) => ({ ...current, userId: event.target.value, role: member?.role || current.role }));
                    }}
                    className="input w-full"
                  >
                    <option value="">Open Shift</option>
                    {availableStaff.map((member: any) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.role})
                      </option>
                    ))}
                  </select>
                  <input type="datetime-local" value={shiftForm.startsAt} onChange={(event) => setShiftForm((current) => ({ ...current, startsAt: event.target.value }))} className="input w-full" />
                  <input type="datetime-local" value={shiftForm.endsAt} onChange={(event) => setShiftForm((current) => ({ ...current, endsAt: event.target.value }))} className="input w-full" />
                  <input value={shiftForm.shiftLabel} onChange={(event) => setShiftForm((current) => ({ ...current, shiftLabel: event.target.value }))} className="input w-full" placeholder="Lunch, Dinner, Closing" />
                  <input value={shiftForm.roomName} onChange={(event) => setShiftForm((current) => ({ ...current, roomName: event.target.value }))} className="input w-full" placeholder="Main, Patio, Bar" />
                  <input value={shiftForm.notes} onChange={(event) => setShiftForm((current) => ({ ...current, notes: event.target.value }))} className="input w-full" placeholder="Notes" />
                  <select value={shiftForm.status} onChange={(event) => setShiftForm((current) => ({ ...current, status: event.target.value }))} className="input w-full">
                    {['draft', 'published', 'open'].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => saveShiftMutation.mutate()} disabled={saveShiftMutation.isPending} className="btn-primary">
                    {saveShiftMutation.isPending ? 'Saving...' : shiftForm.id ? 'Update Shift' : 'Create Shift'}
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
              <div className="space-y-4">
                {Object.entries(groupedShifts).map(([dateKey, shifts]) => (
                  <div key={dateKey} className="card p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">{formatShiftDate(shifts[0].startsAt)}</h3>
                        <p className="text-xs text-slate-400">{shifts.length} shifts scheduled</p>
                      </div>
                      <span className="text-xs text-slate-500">{dateKey}</span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {shifts.map((shift) => (
                        <div key={shift.id} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-100">
                                {shift.userName || 'Open Shift'} <span className="text-slate-500">/ {shift.role}</span>
                              </p>
                              <p className="mt-1 text-xs text-slate-400">{formatShiftRange(shift.startsAt, shift.endsAt)}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {shift.shiftLabel}
                                {shift.roomName ? ` / ${shift.roomName}` : ''}
                                {shift.notes ? ` / ${shift.notes}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                                {shift.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowShiftForm(true);
                                  setShiftForm({
                                    id: shift.id,
                                    userId: shift.userId || '',
                                    role: shift.role,
                                    startsAt: toDateTimeInput(shift.startsAt),
                                    endsAt: toDateTimeInput(shift.endsAt),
                                    shiftLabel: shift.shiftLabel,
                                    roomName: shift.roomName || '',
                                    notes: shift.notes || '',
                                    status: shift.status,
                                  });
                                }}
                                className="btn-secondary px-3 py-2 text-xs"
                              >
                                Edit
                              </button>
                              <button type="button" onClick={() => deleteShiftMutation.mutate(shift.id)} className="btn-secondary px-3 py-2 text-xs text-red-200">
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-slate-100">Shift Requests</h3>
                  <div className="mt-4 space-y-3">
                    {overview.workforce.requests.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-500">
                        No shift requests yet.
                      </div>
                    ) : (
                      overview.workforce.requests.map((entry) => {
                        const shift = overview.workforce.shifts.find((item) => item.id === entry.shiftId);
                        return (
                          <div key={entry.id} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                            <p className="text-sm font-semibold text-slate-100">
                              {entry.requestedByName} requested a {entry.type}
                            </p>
                            {shift && <p className="mt-1 text-xs text-slate-400">{formatShiftRange(shift.startsAt, shift.endsAt)}</p>}
                            <p className="mt-1 text-xs text-slate-500">{entry.notes || 'No notes provided'}</p>
                            <div className="mt-3 flex gap-2">
                              <button type="button" onClick={() => reviewRequestMutation.mutate({ requestId: entry.id, status: 'approved' })} disabled={entry.status !== 'pending'} className="btn-primary flex-1 text-xs">
                                {entry.status === 'approved' ? 'Approved' : 'Approve'}
                              </button>
                              <button type="button" onClick={() => reviewRequestMutation.mutate({ requestId: entry.id, status: 'declined' })} disabled={entry.status !== 'pending'} className="btn-secondary flex-1 text-xs">
                                {entry.status === 'declined' ? 'Declined' : 'Decline'}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-slate-100">Labor Profiles</h3>
                  <div className="mt-4 space-y-3">
                    {availableStaff.map((member: any) => (
                      <div key={member.id} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-100">{member.name}</p>
                            <p className="text-xs text-slate-500">{member.role}</p>
                          </div>
                          <button type="button" onClick={() => updateProfileMutation.mutate(member.id)} className="btn-secondary px-3 py-2 text-xs">
                            Save
                          </button>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <input type="number" min={0} step="0.01" value={profileDrafts[member.id]?.hourlyRate || ''} onChange={(event) => setProfileDrafts((current) => ({ ...current, [member.id]: { ...(current[member.id] || { hourlyRate: '', maxTables: '6', preferredRoom: '' }), hourlyRate: event.target.value } }))} className="input w-full" placeholder="Hourly rate" />
                          <input type="number" min={1} max={24} value={profileDrafts[member.id]?.maxTables || ''} onChange={(event) => setProfileDrafts((current) => ({ ...current, [member.id]: { ...(current[member.id] || { hourlyRate: '', maxTables: '6', preferredRoom: '' }), maxTables: event.target.value } }))} className="input w-full" placeholder="Max tables" />
                          <input value={profileDrafts[member.id]?.preferredRoom || ''} onChange={(event) => setProfileDrafts((current) => ({ ...current, [member.id]: { ...(current[member.id] || { hourlyRate: '', maxTables: '6', preferredRoom: '' }), preferredRoom: event.target.value } }))} className="input w-full" placeholder="Preferred room" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="space-y-6">
            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Section Assignments</h3>
                  <p className="text-xs text-slate-400">Pick a server, click tables, or auto-balance from the scheduled team.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="datetime-local" value={assignmentTimestamp} onChange={(event) => setAssignmentTimestamp(event.target.value)} className="input" />
                  <button type="button" onClick={() => autoAssignMutation.mutate()} className="btn-secondary">
                    {autoAssignMutation.isPending ? 'Balancing...' : 'Auto Assign'}
                  </button>
                  <button type="button" onClick={() => saveAssignmentsMutation.mutate()} className="btn-primary">
                    {saveAssignmentsMutation.isPending ? 'Saving...' : 'Save Assignments'}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedServerId('')}
                  className={clsx(
                    'rounded-2xl border px-3 py-2 text-sm transition-all',
                    !selectedServerId
                      ? 'border-slate-300 bg-slate-100 text-slate-950'
                      : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500'
                  )}
                >
                  Unassigned
                </button>
                {scheduledStaff.map((shift) => (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => setSelectedServerId(shift.userId || '')}
                    className={clsx(
                      'rounded-2xl border px-3 py-2 text-sm transition-all',
                      selectedServerId === shift.userId
                        ? 'border-cyan-200 bg-cyan-300 text-slate-950'
                        : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500'
                    )}
                  >
                    {shift.userName} <span className="text-xs opacity-70">/ {shift.shiftLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {tablesByRoom.length === 0 ? (
              <div className="card border-dashed p-10 text-center text-sm text-slate-500">
                Add tables to the floor plan first, then assign them here.
              </div>
            ) : (
              tablesByRoom.map(({ roomName, tables }) => (
                <div key={roomName} className="card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">{roomName}</h3>
                      <p className="text-xs text-slate-400">{tables.length} tables</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {tables.map((table) => {
                      const assignedServerId = draftAssignments[table.id] || '';
                      const assignedServerName = assignmentNameMap.get(assignedServerId) || 'Unassigned';
                      return (
                        <button
                          key={table.id}
                          type="button"
                          onClick={() => {
                            setDraftAssignments((current) => ({ ...current, [table.id]: selectedServerId }));
                          }}
                          className={clsx(
                            'min-w-[144px] rounded-2xl border p-4 text-left transition-all',
                            assignedServerId ? 'border-cyan-300/30 bg-cyan-400/10' : 'border-slate-700 bg-slate-900/70',
                            selectedServerId && assignedServerId === selectedServerId ? 'ring-2 ring-cyan-200/60' : ''
                          )}
                        >
                          <p className="text-sm font-semibold text-slate-100">{table.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{table.capacity} seats</p>
                          <p className="mt-2 text-xs font-semibold text-cyan-100">{assignedServerName}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'timesheets' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="card p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Worked Hours</p>
                <p className="mt-2 text-2xl font-bold text-slate-100">
                  {formatHoursFromMinutes(overview.timesheets.reduce((total, row) => total + row.workedMinutes, 0))}
                </p>
                <p className="text-xs text-slate-400">Actual labor captured from started and ended shifts.</p>
              </div>
              <div className="card p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Scheduled Hours</p>
                <p className="mt-2 text-2xl font-bold text-slate-100">
                  {formatHoursFromMinutes(overview.timesheets.reduce((total, row) => total + row.scheduledMinutes, 0))}
                </p>
                <p className="text-xs text-slate-400">Planned hours for the selected week.</p>
              </div>
              <div className="card p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Actual Labor</p>
                <p className="mt-2 text-2xl font-bold text-slate-100">
                  {formatCurrency(overview.timesheets.reduce((total, row) => total + row.cost, 0))}
                </p>
                <p className="text-xs text-slate-400">Live timesheet cost based on recorded attendance.</p>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Weekly Timesheets</h3>
                  <p className="text-xs text-slate-400">Review hours worked, shifts covered, and cost by team member.</p>
                </div>
              </div>

              {overview.timesheets.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-slate-500">No time records for this week yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.16em] text-slate-500">
                      <tr>
                        {['Staff', 'Role', 'Shifts', 'Scheduled', 'Worked', 'Active', 'Scheduled Cost', 'Actual Cost'].map((label) => (
                          <th key={label} className="px-4 py-3 text-left font-semibold">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {overview.timesheets.map((row) => (
                        <tr key={row.userId} className="border-t border-slate-800/80 text-slate-200">
                          <td className="px-4 py-3 font-semibold text-slate-100">{row.userName}</td>
                          <td className="px-4 py-3 text-slate-400">{row.role}</td>
                          <td className="px-4 py-3">{row.shifts}</td>
                          <td className="px-4 py-3">{formatHoursFromMinutes(row.scheduledMinutes)}</td>
                          <td className="px-4 py-3">{formatHoursFromMinutes(row.workedMinutes)}</td>
                          <td className="px-4 py-3">{formatHoursFromMinutes(row.activeMinutes)}</td>
                          <td className="px-4 py-3">{formatCurrency(row.scheduledCost)}</td>
                          <td className="px-4 py-3 font-semibold text-cyan-100">{formatCurrency(row.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'labor' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="card p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Today Scheduled</p>
                <p className="mt-2 text-2xl font-bold text-slate-100">{formatHoursFromMinutes(overview.labor.scheduledMinutesToday)}</p>
                <p className="text-xs text-slate-400">Hours currently planned for today.</p>
              </div>
              <div className="card p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Today Scheduled Cost</p>
                <p className="mt-2 text-2xl font-bold text-slate-100">{formatCurrency(overview.labor.scheduledCostToday)}</p>
                <p className="text-xs text-slate-400">Projected labor spend based on schedule.</p>
              </div>
              <div className="card p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Live Minutes</p>
                <p className="mt-2 text-2xl font-bold text-slate-100">{formatHoursFromMinutes(overview.labor.activeMinutesNow)}</p>
                <p className="text-xs text-slate-400">Total active time from the live clocked-in team.</p>
              </div>
              <div className="card p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Live Labor Cost</p>
                <p className="mt-2 text-2xl font-bold text-slate-100">{formatCurrency(overview.labor.activeCostNow)}</p>
                <p className="text-xs text-slate-400">Updated dynamically while shifts are in progress.</p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="card overflow-hidden">
                <div className="border-b border-slate-700 px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-100">Live Shift Sessions</h3>
                  <p className="text-xs text-slate-400">Every shift started with manager approval appears here in real time.</p>
                </div>
                <div className="p-5">
                  {overview.labor.activeSessions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-500">
                      Nobody is clocked in right now.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {overview.labor.activeSessions.map((session) => (
                        <div key={session.sessionId} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-100">
                                {session.userName} <span className="text-slate-500">/ {session.role}</span>
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                Started {format(parseISO(session.startedAt), 'EEE h:mm a')}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">{session.shiftLabel || 'Unscheduled live shift'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-cyan-100">{formatHoursFromMinutes(session.workedMinutes)}</p>
                              <p className="text-xs text-slate-400">{formatCurrency(session.estimatedCost)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-100">Manager Notes</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                    <p className="font-semibold text-slate-100">Shift start control</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Staff can only start a shift after a manager enters a valid PIN, which keeps payroll cleaner and prevents early clock-ins.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                    <p className="font-semibold text-slate-100">Section auto-assign</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Auto-assign uses the scheduled team, room preferences, and basic seat balancing so managers start from a draft instead of a blank screen.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                    <p className="font-semibold text-slate-100">Labor tracking</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Labor updates as shifts begin and end, so your daily labor snapshot stays closer to real operations instead of static schedule estimates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
