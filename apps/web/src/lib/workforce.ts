import { addDays, format, parseISO, startOfWeek } from 'date-fns';

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
  status: 'draft' | 'published' | 'open' | 'in_progress' | 'completed' | 'cancelled';
  publishedAt: string | null;
  createdAt: string;
}

export interface WorkforceRequest {
  id: string;
  shiftId: string;
  type: 'give-up' | 'pickup' | 'trade';
  requestedByUserId: string;
  requestedByName: string;
  targetUserId: string | null;
  targetUserName: string | null;
  status: 'pending' | 'approved' | 'declined';
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
  source: 'manual' | 'auto';
  locked: boolean;
  createdAt: string;
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

export interface WorkforceOverviewPayload {
  locationId: string;
  workforce: {
    profiles: WorkforceProfile[];
    availability: WorkforceAvailabilityEntry[];
    shifts: WorkforceShift[];
    requests: WorkforceRequest[];
    attendance: WorkforceAttendanceSession[];
    sectionAssignments: WorkforceSectionAssignment[];
  };
  staff: any[];
  tables: any[];
  currentAssignments: Array<{ tableId: string; serverId: string; serverName: string }>;
  schedule: {
    shifts: WorkforceShift[];
    scheduledMinutes: number;
    scheduledCost: number;
  };
  labor: WorkforceLaborSummary;
  timesheets: WorkforceTimesheetRow[];
}

export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getWeekStartValue(input = new Date()) {
  return format(startOfWeek(input, { weekStartsOn: 0 }), 'yyyy-MM-dd');
}

export function getWeekDates(weekStart: string) {
  const base = startOfWeek(new Date(weekStart), { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, index) => addDays(base, index));
}

export function formatCurrency(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function formatHoursFromMinutes(minutes: number) {
  return `${(Number(minutes || 0) / 60).toFixed(1)}h`;
}

export function formatShiftRange(startsAt: string, endsAt: string) {
  return `${format(parseISO(startsAt), 'EEE h:mm a')} - ${format(parseISO(endsAt), 'h:mm a')}`;
}

export function formatShiftDate(startsAt: string) {
  return format(parseISO(startsAt), 'EEEE, MMM d');
}

export function groupShiftsByDate(shifts: WorkforceShift[]) {
  return shifts.reduce<Record<string, WorkforceShift[]>>((groups, shift) => {
    const key = format(parseISO(shift.startsAt), 'yyyy-MM-dd');
    if (!groups[key]) groups[key] = [];
    groups[key].push(shift);
    return groups;
  }, {});
}

export function getTodayIsoDate() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function isShiftForToday(shift: WorkforceShift) {
  return format(parseISO(shift.startsAt), 'yyyy-MM-dd') === getTodayIsoDate();
}
