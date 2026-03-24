type WorkforceShiftStatus = 'draft' | 'published' | 'open' | 'in_progress' | 'completed' | 'cancelled';
type WorkforceRequestStatus = 'pending' | 'approved' | 'declined';
type WorkforceRequestType = 'give-up' | 'pickup' | 'trade';
type WorkforceAssignmentSource = 'manual' | 'auto';

export interface WorkforceProfile {
  userId: string;
  hourlyRate: number;
  overtimeRate: number;
  maxTables: number;
  preferredRoom: string | null;
}

export interface WorkforceAvailabilityEntry {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  notes: string | null;
  temporaryDate: string | null;
  createdAt: string;
}

export interface WorkforceShift {
  id: string;
  userId: string | null;
  userName: string | null;
  role: string;
  startsAt: string;
  endsAt: string;
  shiftLabel: string;
  roomName: string | null;
  notes: string | null;
  status: WorkforceShiftStatus;
  publishedAt: string | null;
  createdAt: string;
}

export interface WorkforceRequest {
  id: string;
  shiftId: string;
  type: WorkforceRequestType;
  requestedByUserId: string;
  requestedByName: string;
  targetUserId: string | null;
  targetUserName: string | null;
  status: WorkforceRequestStatus;
  notes: string | null;
  reviewedByUserId: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface WorkforceAttendanceSession {
  id: string;
  shiftId: string | null;
  userId: string;
  userName: string;
  locationId: string;
  startedAt: string;
  endedAt: string | null;
  managerApprovedByUserId: string | null;
  managerApprovedByName: string | null;
  notes: string | null;
}

export interface WorkforceSectionAssignment {
  id: string;
  shiftId: string | null;
  tableId: string;
  tableName: string;
  serverId: string;
  serverName: string;
  roomName: string | null;
  source: WorkforceAssignmentSource;
  locked: boolean;
  createdAt: string;
}

export interface WorkforceState {
  version: number;
  profiles: WorkforceProfile[];
  availability: WorkforceAvailabilityEntry[];
  shifts: WorkforceShift[];
  requests: WorkforceRequest[];
  attendance: WorkforceAttendanceSession[];
  sectionAssignments: WorkforceSectionAssignment[];
}

export interface WorkforceTimesheetRow {
  userId: string;
  userName: string;
  role: string;
  scheduledMinutes: number;
  workedMinutes: number;
  activeMinutes: number;
  cost: number;
  scheduledCost: number;
  shifts: number;
}

export interface WorkforceLaborSummary {
  scheduledMinutesToday: number;
  scheduledCostToday: number;
  activeMinutesNow: number;
  activeCostNow: number;
  activeSessions: Array<{
    sessionId: string;
    userId: string;
    userName: string;
    role: string;
    startedAt: string;
    workedMinutes: number;
    estimatedCost: number;
    shiftLabel: string | null;
  }>;
}

const EMPTY_STATE: WorkforceState = {
  version: 1,
  profiles: [],
  availability: [],
  shifts: [],
  requests: [],
  attendance: [],
  sectionAssignments: [],
};

function asObject(value: any) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asString(value: any, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: any) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNumber(value: any, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeTime(value: any, fallback: string) {
  const input = asString(value).trim();
  if (!/^\d{2}:\d{2}$/.test(input)) return fallback;
  return input;
}

function safeDate(value: any, fallback: Date) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function toIso(value: any, fallback = new Date()) {
  return safeDate(value, fallback).toISOString();
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  next.setDate(next.getDate() - day);
  return next;
}

function endOfWeek(date: Date) {
  return endOfDay(addDays(startOfWeek(date), 6));
}

function minutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

function combineDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map((value) => Number(value));
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours || 0, minutes || 0, 0, 0);
}

function defaultRateForRole(role: string) {
  switch (String(role || '').toUpperCase()) {
    case 'MANAGER':
      return 28;
    case 'BARTENDER':
      return 20;
    case 'SERVER':
      return 18;
    case 'KDS':
      return 19;
    case 'EXPO':
      return 18;
    case 'CASHIER':
      return 17;
    default:
      return 16;
  }
}

export function createWorkforceId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function coerceWorkforceState(raw: any): WorkforceState {
  const source = asObject(raw);

  return {
    version: 1,
    profiles: Array.isArray(source.profiles)
      ? source.profiles.map((entry: any) => ({
          userId: asString(entry?.userId),
          hourlyRate: clamp(asNumber(entry?.hourlyRate, 0), 0, 500),
          overtimeRate: clamp(asNumber(entry?.overtimeRate, 0), 0, 750),
          maxTables: clamp(Math.round(asNumber(entry?.maxTables, 6)), 1, 24),
          preferredRoom: asNullableString(entry?.preferredRoom),
        })).filter((entry: WorkforceProfile) => !!entry.userId)
      : [],
    availability: Array.isArray(source.availability)
      ? source.availability.map((entry: any) => ({
          id: asString(entry?.id, createWorkforceId('availability')),
          userId: asString(entry?.userId),
          dayOfWeek: clamp(Math.round(asNumber(entry?.dayOfWeek, 0)), 0, 6),
          startTime: normalizeTime(entry?.startTime, '09:00'),
          endTime: normalizeTime(entry?.endTime, '17:00'),
          isAvailable: entry?.isAvailable !== false,
          notes: asNullableString(entry?.notes),
          temporaryDate: asNullableString(entry?.temporaryDate),
          createdAt: toIso(entry?.createdAt),
        })).filter((entry: WorkforceAvailabilityEntry) => !!entry.userId)
      : [],
    shifts: Array.isArray(source.shifts)
      ? source.shifts.map((entry: any) => ({
          id: asString(entry?.id, createWorkforceId('shift')),
          userId: asNullableString(entry?.userId),
          userName: asNullableString(entry?.userName),
          role: asString(entry?.role, 'SERVER'),
          startsAt: toIso(entry?.startsAt),
          endsAt: toIso(entry?.endsAt),
          shiftLabel: asString(entry?.shiftLabel, 'Shift'),
          roomName: asNullableString(entry?.roomName),
          notes: asNullableString(entry?.notes),
          status: (['draft', 'published', 'open', 'in_progress', 'completed', 'cancelled'].includes(entry?.status)
            ? entry.status
            : 'draft') as WorkforceShiftStatus,
          publishedAt: entry?.publishedAt ? toIso(entry?.publishedAt) : null,
          createdAt: toIso(entry?.createdAt),
        })).filter((entry: WorkforceShift) => new Date(entry.endsAt).getTime() > new Date(entry.startsAt).getTime())
      : [],
    requests: Array.isArray(source.requests)
      ? source.requests.map((entry: any) => ({
          id: asString(entry?.id, createWorkforceId('request')),
          shiftId: asString(entry?.shiftId),
          type: (['give-up', 'pickup', 'trade'].includes(entry?.type) ? entry.type : 'give-up') as WorkforceRequestType,
          requestedByUserId: asString(entry?.requestedByUserId),
          requestedByName: asString(entry?.requestedByName, 'Staff'),
          targetUserId: asNullableString(entry?.targetUserId),
          targetUserName: asNullableString(entry?.targetUserName),
          status: (['pending', 'approved', 'declined'].includes(entry?.status) ? entry.status : 'pending') as WorkforceRequestStatus,
          notes: asNullableString(entry?.notes),
          reviewedByUserId: asNullableString(entry?.reviewedByUserId),
          reviewedByName: asNullableString(entry?.reviewedByName),
          reviewedAt: entry?.reviewedAt ? toIso(entry?.reviewedAt) : null,
          createdAt: toIso(entry?.createdAt),
        })).filter((entry: WorkforceRequest) => !!entry.shiftId && !!entry.requestedByUserId)
      : [],
    attendance: Array.isArray(source.attendance)
      ? source.attendance.map((entry: any) => ({
          id: asString(entry?.id, createWorkforceId('attendance')),
          shiftId: asNullableString(entry?.shiftId),
          userId: asString(entry?.userId),
          userName: asString(entry?.userName, 'Staff'),
          locationId: asString(entry?.locationId),
          startedAt: toIso(entry?.startedAt),
          endedAt: entry?.endedAt ? toIso(entry?.endedAt) : null,
          managerApprovedByUserId: asNullableString(entry?.managerApprovedByUserId),
          managerApprovedByName: asNullableString(entry?.managerApprovedByName),
          notes: asNullableString(entry?.notes),
        })).filter((entry: WorkforceAttendanceSession) => !!entry.userId && !!entry.locationId)
      : [],
    sectionAssignments: Array.isArray(source.sectionAssignments)
      ? source.sectionAssignments.map((entry: any) => ({
          id: asString(entry?.id, createWorkforceId('section')),
          shiftId: asNullableString(entry?.shiftId),
          tableId: asString(entry?.tableId),
          tableName: asString(entry?.tableName, 'Table'),
          serverId: asString(entry?.serverId),
          serverName: asString(entry?.serverName, 'Server'),
          roomName: asNullableString(entry?.roomName),
          source: (entry?.source === 'auto' ? 'auto' : 'manual') as WorkforceAssignmentSource,
          locked: entry?.locked === true,
          createdAt: toIso(entry?.createdAt),
        })).filter((entry: WorkforceSectionAssignment) => !!entry.tableId && !!entry.serverId)
      : [],
  };
}

export function getWorkforceStateFromLocationSettings(settings: any) {
  const normalizedSettings = asObject(settings);
  return coerceWorkforceState(asObject(normalizedSettings.workforce));
}

export function buildLocationSettingsWithWorkforce(settings: any, workforce: WorkforceState) {
  const normalizedSettings = asObject(settings);
  return {
    ...normalizedSettings,
    workforce,
  };
}

export function getFloorPlanTableAssignments(settings: any) {
  const normalizedSettings = asObject(settings);
  const floorPlan = asObject(normalizedSettings.floorPlan);
  return Array.isArray(floorPlan.tableAssignments) ? floorPlan.tableAssignments : [];
}

export function setFloorPlanTableAssignments(settings: any, assignments: Array<{ tableId: string; serverId: string; serverName: string }>) {
  const normalizedSettings = asObject(settings);
  const floorPlan = asObject(normalizedSettings.floorPlan);

  return {
    ...normalizedSettings,
    floorPlan: {
      ...floorPlan,
      tableAssignments: assignments,
    },
  };
}

export function getWorkforceProfile(workforce: WorkforceState, userId: string, role = 'SERVER') {
  const existing = workforce.profiles.find((entry) => entry.userId === userId);
  if (existing) return existing;

  const hourlyRate = defaultRateForRole(role);
  return {
    userId,
    hourlyRate,
    overtimeRate: Math.round(hourlyRate * 1.5 * 100) / 100,
    maxTables: 6,
    preferredRoom: null,
  } satisfies WorkforceProfile;
}

export function buildScheduleOverview(
  workforce: WorkforceState,
  staff: any[],
  rangeStart: Date,
  rangeEnd: Date
) {
  const relevantShifts = workforce.shifts.filter((shift) =>
    overlaps(safeDate(shift.startsAt, rangeStart), safeDate(shift.endsAt, rangeEnd), rangeStart, rangeEnd)
  );

  const scheduledMinutes = relevantShifts.reduce(
    (total, shift) => total + minutesBetween(safeDate(shift.startsAt, rangeStart), safeDate(shift.endsAt, rangeEnd)),
    0
  );

  const scheduledCost = relevantShifts.reduce((total, shift) => {
    const role = shift.role || staff.find((entry) => entry.id === shift.userId)?.role || 'SERVER';
    const profile = shift.userId ? getWorkforceProfile(workforce, shift.userId, role) : null;
    const minutes = minutesBetween(safeDate(shift.startsAt, rangeStart), safeDate(shift.endsAt, rangeEnd));
    return total + (minutes / 60) * (profile?.hourlyRate || defaultRateForRole(role));
  }, 0);

  return {
    shifts: relevantShifts.sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()),
    scheduledMinutes,
    scheduledCost,
  };
}

export function buildTimesheets(
  workforce: WorkforceState,
  staff: any[],
  rangeStart: Date,
  rangeEnd: Date,
  now = new Date()
) {
  const rows = new Map<string, WorkforceTimesheetRow>();

  staff.forEach((member) => {
    rows.set(member.id, {
      userId: member.id,
      userName: member.name || 'Staff',
      role: member.role || 'SERVER',
      scheduledMinutes: 0,
      workedMinutes: 0,
      activeMinutes: 0,
      cost: 0,
      scheduledCost: 0,
      shifts: 0,
    });
  });

  workforce.shifts.forEach((shift) => {
    if (!shift.userId) return;

    const shiftStart = safeDate(shift.startsAt, rangeStart);
    const shiftEnd = safeDate(shift.endsAt, rangeEnd);
    if (!overlaps(shiftStart, shiftEnd, rangeStart, rangeEnd)) return;

    const role = shift.role || staff.find((entry) => entry.id === shift.userId)?.role || 'SERVER';
    const profile = getWorkforceProfile(workforce, shift.userId, role);
    const row = rows.get(shift.userId) || {
      userId: shift.userId,
      userName: shift.userName || 'Staff',
      role,
      scheduledMinutes: 0,
      workedMinutes: 0,
      activeMinutes: 0,
      cost: 0,
      scheduledCost: 0,
      shifts: 0,
    };
    const scheduledMinutes = minutesBetween(shiftStart, shiftEnd);
    row.scheduledMinutes += scheduledMinutes;
    row.scheduledCost += (scheduledMinutes / 60) * profile.hourlyRate;
    row.shifts += 1;
    rows.set(shift.userId, row);
  });

  workforce.attendance.forEach((session) => {
    const startedAt = safeDate(session.startedAt, rangeStart);
    const endedAt = session.endedAt ? safeDate(session.endedAt, now) : now;
    if (!overlaps(startedAt, endedAt, rangeStart, rangeEnd)) return;

    const member = staff.find((entry) => entry.id === session.userId);
    const role = member?.role || 'SERVER';
    const profile = getWorkforceProfile(workforce, session.userId, role);
    const row = rows.get(session.userId) || {
      userId: session.userId,
      userName: session.userName,
      role,
      scheduledMinutes: 0,
      workedMinutes: 0,
      activeMinutes: 0,
      cost: 0,
      scheduledCost: 0,
      shifts: 0,
    };
    const workedMinutes = minutesBetween(startedAt, endedAt);
    row.workedMinutes += workedMinutes;
    if (!session.endedAt) row.activeMinutes += workedMinutes;
    row.cost += (workedMinutes / 60) * profile.hourlyRate;
    rows.set(session.userId, row);
  });

  return Array.from(rows.values())
    .filter((row) => row.scheduledMinutes > 0 || row.workedMinutes > 0 || row.activeMinutes > 0)
    .sort((left, right) => right.workedMinutes - left.workedMinutes || left.userName.localeCompare(right.userName));
}

export function buildLaborSummary(
  workforce: WorkforceState,
  staff: any[],
  locationId: string,
  day: Date,
  now = new Date()
): WorkforceLaborSummary {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const todaysSchedule = buildScheduleOverview(workforce, staff, dayStart, dayEnd);
  const activeSessions = workforce.attendance
    .filter((session) => session.locationId === locationId && !session.endedAt)
    .map((session) => {
      const member = staff.find((entry) => entry.id === session.userId);
      const role = member?.role || 'SERVER';
      const profile = getWorkforceProfile(workforce, session.userId, role);
      const workedMinutes = minutesBetween(safeDate(session.startedAt, now), now);
      const linkedShift = session.shiftId ? workforce.shifts.find((shift) => shift.id === session.shiftId) : null;

      return {
        sessionId: session.id,
        userId: session.userId,
        userName: session.userName,
        role,
        startedAt: session.startedAt,
        workedMinutes,
        estimatedCost: Number(((workedMinutes / 60) * profile.hourlyRate).toFixed(2)),
        shiftLabel: linkedShift?.shiftLabel || null,
      };
    })
    .sort((left, right) => right.workedMinutes - left.workedMinutes);

  return {
    scheduledMinutesToday: todaysSchedule.scheduledMinutes,
    scheduledCostToday: Number(todaysSchedule.scheduledCost.toFixed(2)),
    activeMinutesNow: activeSessions.reduce((total, session) => total + session.workedMinutes, 0),
    activeCostNow: Number(activeSessions.reduce((total, session) => total + session.estimatedCost, 0).toFixed(2)),
    activeSessions,
  };
}

export function buildAutoSchedule(
  workforce: WorkforceState,
  staff: any[],
  locationId: string,
  weekStartInput: Date
) {
  const weekStart = startOfWeek(weekStartInput);
  const weekEnd = endOfWeek(weekStartInput);
  const availability = workforce.availability;
  const eligibleStaff = staff.filter((member) => member?.isActive !== false && String(member?.role || '').toUpperCase() !== 'OWNER');
  const nextShifts = workforce.shifts.filter((shift) => {
    const startsAt = safeDate(shift.startsAt, weekStart);
    return startsAt < weekStart || startsAt > weekEnd;
  });

  for (let offset = 0; offset < 7; offset += 1) {
    const day = addDays(weekStart, offset);
    const dateKey = startOfDay(day).toISOString().slice(0, 10);

    eligibleStaff.forEach((member) => {
      const userAvailability = availability.filter((entry) => entry.userId === member.id && entry.isAvailable);
      const matchingAvailability = userAvailability.filter((entry) => {
        if (entry.temporaryDate) return entry.temporaryDate === dateKey;
        return entry.dayOfWeek === day.getDay();
      });

      const windows =
        matchingAvailability.length > 0
          ? matchingAvailability.map((entry) => ({
              startTime: entry.startTime,
              endTime: entry.endTime,
            }))
          : [
              {
                startTime: String(member.role || '').toUpperCase() === 'BARTENDER' ? '14:00' : '11:00',
                endTime: String(member.role || '').toUpperCase() === 'BARTENDER' ? '22:00' : '19:00',
              },
            ];

      windows.forEach((window) => {
        const startsAt = combineDateAndTime(day, window.startTime);
        const endsAt = combineDateAndTime(day, window.endTime);
        if (endsAt <= startsAt) return;

        nextShifts.push({
          id: createWorkforceId('shift'),
          userId: member.id,
          userName: member.name || 'Staff',
          role: member.role || 'SERVER',
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          shiftLabel: startsAt.getHours() < 15 ? 'Lunch' : 'Dinner',
          roomName: String(member.role || '').toUpperCase() === 'BARTENDER' ? 'Bar' : 'Main',
          notes: null,
          status: 'draft',
          publishedAt: null,
          createdAt: new Date().toISOString(),
        });
      });
    });
  }

  return {
    ...workforce,
    shifts: nextShifts.sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()),
  };
}

export function buildAutoSectionAssignments(
  workforce: WorkforceState,
  staff: any[],
  tables: any[],
  locationId: string,
  timestamp: Date
) {
  const eligibleShifts = workforce.shifts.filter((shift) => {
    if (!shift.userId || shift.status === 'cancelled') return false;
    if (!['draft', 'published', 'in_progress'].includes(shift.status)) return false;
    return overlaps(safeDate(shift.startsAt, timestamp), safeDate(shift.endsAt, timestamp), timestamp, timestamp);
  });

  const activeShiftStaff = eligibleShifts
    .map((shift) => {
      const member = staff.find((entry) => entry.id === shift.userId);
      if (!member) return null;

      return {
        shift,
        member,
        profile: getWorkforceProfile(workforce, shift.userId!, shift.role || member.role),
      };
    })
    .filter(Boolean) as Array<{ shift: WorkforceShift; member: any; profile: WorkforceProfile }>;

  const bartenders = activeShiftStaff.filter((entry) => String(entry.member.role || '').toUpperCase() === 'BARTENDER');
  const servers = activeShiftStaff.filter((entry) => String(entry.member.role || '').toUpperCase() !== 'BARTENDER');
  const pool = servers.length > 0 ? servers : activeShiftStaff;

  if (pool.length === 0) {
    return [];
  }

  const sortedTables = [...tables]
    .filter((table) => table.locationId === locationId && table.isActive !== false)
    .sort((left, right) => {
      const roomCompare = String(left.section || '').localeCompare(String(right.section || ''));
      if (roomCompare !== 0) return roomCompare;
      const xCompare = Number(left.positionX || 0) - Number(right.positionX || 0);
      if (xCompare !== 0) return xCompare;
      return Number(left.positionY || 0) - Number(right.positionY || 0);
    });

  const load = new Map<string, { tables: number; seats: number }>();
  activeShiftStaff.forEach((entry) => {
    load.set(entry.member.id, { tables: 0, seats: 0 });
  });

  const assignments: WorkforceSectionAssignment[] = [];

  sortedTables.forEach((table) => {
    const roomName = asNullableString(table.section);
    const isBarTable = /bar/i.test(String(roomName || ''));
    const poolForTable = isBarTable && bartenders.length > 0 ? bartenders : pool;

    const selected = [...poolForTable].sort((left, right) => {
      const leftLoad = load.get(left.member.id) || { tables: 0, seats: 0 };
      const rightLoad = load.get(right.member.id) || { tables: 0, seats: 0 };
      if (leftLoad.seats !== rightLoad.seats) return leftLoad.seats - rightLoad.seats;
      if (leftLoad.tables !== rightLoad.tables) return leftLoad.tables - rightLoad.tables;

      const leftPreferred = left.profile.preferredRoom && left.profile.preferredRoom === roomName ? -1 : 0;
      const rightPreferred = right.profile.preferredRoom && right.profile.preferredRoom === roomName ? -1 : 0;
      if (leftPreferred !== rightPreferred) return leftPreferred - rightPreferred;

      return String(left.member.name || '').localeCompare(String(right.member.name || ''));
    })[0];

    if (!selected) return;

    const current = load.get(selected.member.id) || { tables: 0, seats: 0 };
    current.tables += 1;
    current.seats += Number(table.capacity || 0);
    load.set(selected.member.id, current);

    assignments.push({
      id: createWorkforceId('section'),
      shiftId: selected.shift.id,
      tableId: table.id,
      tableName: table.name || 'Table',
      serverId: selected.member.id,
      serverName: selected.member.name || 'Server',
      roomName,
      source: 'auto',
      locked: false,
      createdAt: new Date().toISOString(),
    });
  });

  return assignments;
}

export function applySectionAssignmentsToWorkforce(workforce: WorkforceState, assignments: WorkforceSectionAssignment[]) {
  const retained = workforce.sectionAssignments.filter(
    (entry) => !assignments.some((assignment) => assignment.tableId === entry.tableId)
  );

  return {
    ...workforce,
    sectionAssignments: [...retained, ...assignments],
  };
}

export function buildFloorPlanAssignmentsFromSections(assignments: WorkforceSectionAssignment[]) {
  return assignments.map((assignment) => ({
    tableId: assignment.tableId,
    serverId: assignment.serverId,
    serverName: assignment.serverName,
  }));
}
