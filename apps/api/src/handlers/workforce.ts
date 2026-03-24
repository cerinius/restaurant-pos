import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';

import { prisma } from '@pos/db';
import {
  applySectionAssignmentsToWorkforce,
  buildAutoSchedule,
  buildAutoSectionAssignments,
  buildFloorPlanAssignmentsFromSections,
  buildLaborSummary,
  buildLocationSettingsWithWorkforce,
  buildScheduleOverview,
  buildTimesheets,
  coerceWorkforceState,
  createWorkforceId,
  getFloorPlanTableAssignments,
  getWorkforceProfile,
  getWorkforceStateFromLocationSettings,
  setFloorPlanTableAssignments,
  type WorkforceAttendanceSession,
  type WorkforceSectionAssignment,
  type WorkforceShift,
} from '../services/workforce';

const MANAGER_ROLES = ['OWNER', 'MANAGER'];

function hashPin(pin: string) {
  return crypto.createHash('sha256').update(pin + 'pos-salt-2024').digest('hex');
}

function isManager(role?: string) {
  return MANAGER_ROLES.includes(String(role || '').toUpperCase());
}

function sanitizeStaffMember(member: any) {
  const { pin: _pin, ...rest } = member;
  return rest;
}

function hasLocationAccess(user: any, locationId: string) {
  if (String(user?.role || '').toUpperCase() === 'OWNER') return true;
  const locationIds = Array.isArray(user?.locationIds) ? user.locationIds : [];
  return locationIds.includes(locationId) || user?.locationId === locationId;
}

function normalizeTargetLocationId(user: any, rawLocationId?: string | null) {
  return String(rawLocationId || user?.locationId || user?.locationIds?.[0] || '').trim();
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

function getWeekRange(input?: string | Date | null) {
  const source = input ? new Date(input) : new Date();
  const start = new Date(source);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

async function getScopedLocation(user: any, rawLocationId?: string | null) {
  const locationId = normalizeTargetLocationId(user, rawLocationId);
  if (!locationId) {
    return { error: 'locationId is required' as string | null, location: null as any };
  }

  if (!hasLocationAccess(user, locationId)) {
    return { error: 'You do not have access to that location' as string | null, location: null as any };
  }

  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      restaurantId: user.restaurantId,
      isActive: true,
    },
  });

  if (!location) {
    return { error: 'Location not found' as string | null, location: null as any };
  }

  return { error: null as string | null, location };
}

async function getLocationStaff(restaurantId: string, locationId: string) {
  const staff = await prisma.user.findMany({
    where: {
      restaurantId,
      isActive: true,
      OR: [
        { role: 'OWNER' },
        { locations: { some: { locationId } } },
      ],
    },
    include: {
      locations: { include: { location: { select: { id: true, name: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  return staff.map(sanitizeStaffMember);
}

async function saveLocationWorkforce(location: any, workforce: any, settingsOverride?: any) {
  const nextSettings = buildLocationSettingsWithWorkforce(settingsOverride ?? location.settings, workforce);
  const updatedLocation = await prisma.location.update({
    where: { id: location.id },
    data: { settings: nextSettings },
  });

  return {
    location: updatedLocation,
    workforce,
  };
}

export function createWorkforceHandlers(app: FastifyInstance) {
  return {
    getOverview: async (request: any, reply: any) => {
      const user = request.user;
      const { locationId, weekStart } = request.query as { locationId?: string; weekStart?: string };
      const scoped = await getScopedLocation(user, locationId);
      if (scoped.error) return reply.code(400).send({ success: false, error: scoped.error });

      const location = scoped.location;
      const workforce = getWorkforceStateFromLocationSettings(location.settings);
      const staff = await getLocationStaff(user.restaurantId, location.id);
      const tables = await prisma.table.findMany({
        where: { locationId: location.id, isActive: true },
        orderBy: [{ section: 'asc' }, { positionX: 'asc' }, { positionY: 'asc' }],
      });
      const managerView = isManager(user.role);
      const weekRange = getWeekRange(weekStart);
      const responseWorkforce = managerView
        ? workforce
        : {
            ...workforce,
            profiles: workforce.profiles.filter((profile) => profile.userId === user.id),
            availability: workforce.availability.filter((entry) => entry.userId === user.id),
            shifts: workforce.shifts.filter((shift) => shift.userId === user.id || shift.status === 'open'),
            requests: workforce.requests.filter(
              (entry) => entry.requestedByUserId === user.id || entry.targetUserId === user.id
            ),
            attendance: workforce.attendance.filter((entry) => entry.userId === user.id),
            sectionAssignments: workforce.sectionAssignments.filter((entry) => entry.serverId === user.id),
          };
      const visibleStaff = managerView ? staff : staff.filter((member: any) => member.id === user.id);
      const visibleAssignmentIds = new Set(
        responseWorkforce.sectionAssignments.map((entry) => entry.tableId)
      );
      const currentAssignments = getFloorPlanTableAssignments(location.settings).filter((entry: any) =>
        managerView ? true : entry.serverId === user.id
      );
      currentAssignments.forEach((entry: any) => visibleAssignmentIds.add(entry.tableId));
      const visibleTables = managerView ? tables : tables.filter((table) => visibleAssignmentIds.has(table.id));
      const weekWindow = buildScheduleOverview(responseWorkforce, staff, weekRange.start, weekRange.end);
      const labor = buildLaborSummary(responseWorkforce, staff, location.id, new Date());
      const timesheets = buildTimesheets(responseWorkforce, staff, weekRange.start, weekRange.end);

      return reply.send({
        success: true,
        data: {
          locationId: location.id,
          workforce: responseWorkforce,
          staff: visibleStaff,
          tables: visibleTables,
          currentAssignments,
          schedule: weekWindow,
          labor,
          timesheets: managerView ? timesheets : timesheets.filter((entry) => entry.userId === user.id),
        },
      });
    },

    upsertProfile: async (request: any, reply: any) => {
      const user = request.user;
      if (!isManager(user.role)) {
        return reply.code(403).send({ success: false, error: 'Manager approval required' });
      }

      const { userId } = request.params as { userId: string };
      const { locationId, hourlyRate, overtimeRate, maxTables, preferredRoom } = request.body as any;
      const scoped = await getScopedLocation(user, locationId);
      if (scoped.error) return reply.code(400).send({ success: false, error: scoped.error });

      const location = scoped.location;
      const workforce = getWorkforceStateFromLocationSettings(location.settings);
      const staff = await getLocationStaff(user.restaurantId, location.id);
      const member = staff.find((entry: any) => entry.id === userId);
      if (!member) {
        return reply.code(404).send({ success: false, error: 'Staff member not found for this location' });
      }

      const fallback = getWorkforceProfile(workforce, userId, member.role);
      const nextProfile = {
        userId,
        hourlyRate: Math.max(0, Number(hourlyRate ?? fallback.hourlyRate)),
        overtimeRate: Math.max(0, Number(overtimeRate ?? fallback.overtimeRate)),
        maxTables: Math.max(1, Math.min(24, Math.round(Number(maxTables ?? fallback.maxTables)))),
        preferredRoom: typeof preferredRoom === 'string' && preferredRoom.trim() ? preferredRoom.trim() : null,
      };

      const nextWorkforce = {
        ...workforce,
        profiles: [...workforce.profiles.filter((entry) => entry.userId !== userId), nextProfile].sort((left, right) =>
          left.userId.localeCompare(right.userId)
        ),
      };

      await saveLocationWorkforce(location, nextWorkforce);
      return reply.send({ success: true, data: nextProfile });
    },

    saveAvailability: async (request: any, reply: any) => {
      const user = request.user;
      const body = request.body as any;
      const scoped = await getScopedLocation(user, body.locationId);
      if (scoped.error) return reply.code(400).send({ success: false, error: scoped.error });

      const location = scoped.location;
      const targetUserId = String(body.userId || user.id);
      if (targetUserId !== user.id && !isManager(user.role)) {
        return reply.code(403).send({ success: false, error: 'You can only edit your own availability' });
      }

      const workforce = getWorkforceStateFromLocationSettings(location.settings);
      const nextEntry = {
        id: body.id ? String(body.id) : createWorkforceId('availability'),
        userId: targetUserId,
        dayOfWeek: Math.max(0, Math.min(6, Math.round(Number(body.dayOfWeek ?? 0)))),
        startTime: String(body.startTime || '09:00'),
        endTime: String(body.endTime || '17:00'),
        isAvailable: body.isAvailable !== false,
        notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
        temporaryDate: typeof body.temporaryDate === 'string' && body.temporaryDate.trim() ? body.temporaryDate.trim() : null,
        createdAt: new Date().toISOString(),
      };

      const nextWorkforce = {
        ...workforce,
        availability: [...workforce.availability.filter((entry) => entry.id !== nextEntry.id), nextEntry].sort(
          (left, right) => left.dayOfWeek - right.dayOfWeek || left.startTime.localeCompare(right.startTime)
        ),
      };

      await saveLocationWorkforce(location, nextWorkforce);
      return reply.send({ success: true, data: nextEntry });
    },

    deleteAvailability: async (request: any, reply: any) => {
      const user = request.user;
      const { id } = request.params as { id: string };
      const { locationId } = request.query as { locationId?: string };
      const scoped = await getScopedLocation(user, locationId);
      if (scoped.error) return reply.code(400).send({ success: false, error: scoped.error });

      const location = scoped.location;
      const workforce = getWorkforceStateFromLocationSettings(location.settings);
      const availability = workforce.availability.find((entry) => entry.id === id);
      if (!availability) {
        return reply.code(404).send({ success: false, error: 'Availability entry not found' });
      }

      if (availability.userId !== user.id && !isManager(user.role)) {
        return reply.code(403).send({ success: false, error: 'You can only delete your own availability' });
      }

      const nextWorkforce = {
        ...workforce,
        availability: workforce.availability.filter((entry) => entry.id !== id),
      };

      await saveLocationWorkforce(location, nextWorkforce);
      return reply.send({ success: true });
    },

    autoBuildSchedule: async (request: any, reply: any) => {
      const user = request.user;
      if (!isManager(user.role)) {
        return reply.code(403).send({ success: false, error: 'Manager approval required' });
      }

      const { locationId, weekStart } = request.body as { locationId?: string; weekStart?: string };
      const scoped = await getScopedLocation(user, locationId);
      if (scoped.error) return reply.code(400).send({ success: false, error: scoped.error });

      const location = scoped.location;
      const workforce = getWorkforceStateFromLocationSettings(location.settings);
      const staff = await getLocationStaff(user.restaurantId, location.id);
      const nextWorkforce = buildAutoSchedule(workforce, staff, location.id, weekStart ? new Date(weekStart) : new Date());

      await saveLocationWorkforce(location, nextWorkforce);
      return reply.send({ success: true, data: nextWorkforce.shifts });
    },

    createShift: async (request: any, reply: any) => {
      const user = request.user;
      if (!isManager(user.role)) {
        return reply.code(403).send({ success: false, error: 'Manager approval required' });
      }

      const body = request.body as any;
      const scoped = await getScopedLocation(user, body.locationId);
      if (scoped.error) return reply.code(400).send({ success: false, error: scoped.error });
      const location = scoped.location;
      const workforce = getWorkforceStateFromLocationSettings(location.settings);
      const staff = await getLocationStaff(user.restaurantId, location.id);
      const member = body.userId ? staff.find((entry: any) => entry.id === body.userId) : null;
      const shift: WorkforceShift = {
        id: createWorkforceId('shift'),
        userId: member?.id || null,
        userName: member?.name || null,
        role: body.role || member?.role || 'SERVER',
        startsAt: new Date(body.startsAt).toISOString(),
        endsAt: new Date(body.endsAt).toISOString(),
        shiftLabel: String(body.shiftLabel || 'Shift'),
        roomName: typeof body.roomName === 'string' && body.roomName.trim() ? body.roomName.trim() : null,
        notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
        status: body.status || 'draft',
        publishedAt: body.status === 'published' ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
      };

      const nextWorkforce = {
        ...workforce,
        shifts: [...workforce.shifts, shift].sort(
          (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
        ),
      };

      await saveLocationWorkforce(location, nextWorkforce);
      return reply.send({ success: true, data: shift });
    },

    updateShift: async (request: any, reply: any) => {
      const user = request.user;
      if (!isManager(user.role)) {
        return reply.code(403).send({ success: false, error: 'Manager approval required' });
      }

      const { id } = request.params as { id: string };
      const body = request.body as any;
      const scoped = await getScopedLocation(user, body.locationId);
      if (scoped.error) return reply.code(400).send({ success: false, error: scoped.error });
      const location = scoped.location;
      const workforce = getWorkforceStateFromLocationSettings(location.settings);
      const staff = await getLocationStaff(user.restaurantId, location.id);
      const existing = workforce.shifts.find((entry) => entry.id === id);
      if (!existing) {
        return reply.code(404).send({ success: false, error: 'Shift not found' });
      }

      const member = body.userId ? staff.find((entry: any) => entry.id === body.userId) : null;
      const updatedShift: WorkforceShift = {
        ...existing,
        userId: body.userId !== undefined ? member?.id || null : existing.userId,
        userName: body.userId !== undefined ? member?.name || null : existing.userName,
        role: body.role || member?.role || existing.role,
        startsAt: body.startsAt ? new Date(body.startsAt).toISOString() : existing.startsAt,
        endsAt: body.endsAt ? new Date(body.endsAt).toISOString() : existing.endsAt,
        shiftLabel: body.shiftLabel || existing.shiftLabel,
        roomName: body.roomName !== undefined
          ? (typeof body.roomName === 'string' && body.roomName.trim() ? body.roomName.trim() : null)
          : existing.roomName,
        notes: body.notes !== undefined
          ? (typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null)
          : existing.notes,
        status: body.status || existing.status,
        publishedAt: body.status === 'published' && !existing.publishedAt ? new Date().toISOString() : existing.publishedAt,
      };

      const nextWorkforce = {
        ...workforce,
        shifts: workforce.shifts
          .map((entry) => (entry.id === id ? updatedShift : entry))
          .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()),
      };

      await saveLocationWorkforce(location, nextWorkforce);
      return reply.send({ success: true, data: updatedShift });
    },

    deleteShift: async (request: any, reply: any) => {
      const user = request.user;
      if (!isManager(user.role)) {
        return reply.code(403).send({ success: false, error: 'Manager approval required' });
      }

      const { id } = request.params as { id: string };
      const { locationId } = request.query as { locationId?: string };
      const scoped = await getScopedLocation(user, locationId);
      if (scoped.error) return reply.code(400).send({ success: false, error: scoped.error });
      const location = scoped.location;
      const workforce = getWorkforceStateFromLocationSettings(location.settings);

      const nextWorkforce = {
        ...workforce,
        shifts: workforce.shifts.filter((entry) => entry.id !== id),
        requests: workforce.requests.filter((entry) => entry.shiftId !== id),
        attendance: workforce.attendance.filter((entry) => entry.shiftId !== id),
        sectionAssignments: workforce.sectionAssignments.filter((entry) => entry.shiftId !== id),
      };

      await saveLocationWorkforce(location, nextWorkforce);
      return reply.send({ success: true });
    },

    publishSchedule: async (request: any, reply: any) => {
      const user = request.user;
      if (!isManager(user.role)) {
        return reply.code(403).send({ success: false, error: 'Manager approval required' });
      }

      const { locationId, weekStart } = request.body as { locationId?: string; weekStart?: string };
      const scoped = await getScopedLocation(user, locationId);
      if (scoped.error) return reply.code(400).send({ success: false, error: scoped.error });

      const location = scoped.location;
      const workforce = getWorkforceStateFromLocationSettings(location.settings);
      const start = weekStart ? new Date(weekStart) : new Date();
      const { start: weekStartDate, end: weekEndDate } = getWeekRange(start);
      const publishedAt = new Date().toISOString();

      const nextWorkforce = {
        ...workforce,
        shifts: workforce.shifts.map((shift) => {
          const startsAt = new Date(shift.startsAt);
          if (startsAt < weekStartDate || startsAt > weekEndDate) return shift;
          if (shift.status === 'cancelled' || shift.status === 'completed') return shift;
          return {
            ...shift,
            status: shift.userId ? 'published' : 'open',
            publishedAt,
          } as WorkforceShift;
        }),
      };

      await saveLocationWorkforce(location, nextWorkforce);
      return reply.send({ success: true });
    },

    createRequest: async (request: any, reply: any) => {
      const user = request.user;
      const body = request.body as any;
      const scoped = await getScopedLocation(user, body.locationId);
      if (scoped.error) return reply.code(400).send({ success: false, error: scoped.error });
      const location = scoped.location;
      const workforce = getWorkforceStateFromLocationSettings(location.settings);
      const shift = workforce.shifts.find((entry) => entry.id === body.shiftId);
      if (!shift) {
        return reply.code(404).send({ success: false, error: 'Shift not found' });
      }

      const type = body.type === 'pickup' ? 'pickup' : 'give-up';
      if (type === 'give-up' && shift.userId !== user.id && !isManager(user.role)) {
        return reply.code(403).send({ success: false, error: 'You can only offer your own shift' });
      }

      if (type === 'pickup' && shift.status !== 'open') {
        return reply.code(400).send({ success: false, error: 'That shift is not open for pickup' });
      }

      const nextRequest = {
        id: createWorkforceId('request'),
        shiftId: shift.id,
        type,
        requestedByUserId: user.id,
        requestedByName: user.name || 'Staff',
        targetUserId: typeof body.targetUserId === 'string' && body.targetUserId.trim() ? body.targetUserId.trim() : null,
        targetUserName: null,
        status: 'pending',
        notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
        reviewedByUserId: null,
        reviewedByName: null,
        reviewedAt: null,
        createdAt: new Date().toISOString(),
      };

      const nextWorkforce = {
        ...workforce,
        requests: [nextRequest, ...workforce.requests.filter((entry) => entry.shiftId !== shift.id || entry.status !== 'pending')],
      };

      await saveLocationWorkforce(location, nextWorkforce);
      return reply.send({ success: true, data: nextRequest });
    },

    reviewRequest: async (request: any, reply: any) => {
      const user = request.user;
      if (!isManager(user.role)) {
        return reply.code(403).send({ success: false, error: 'Manager approval required' });
      }

      const { id } = request.params as { id: string };
      const { locationId, status } = request.body as { locationId?: string; status: 'approved' | 'declined' };
      const scoped = await getScopedLocation(user, locationId);
      if (scoped.error) return reply.code(400).send({ success: false, error: scoped.error });
      const location = scoped.location;
      const workforce = getWorkforceStateFromLocationSettings(location.settings);
      const reviewTarget = workforce.requests.find((entry) => entry.id === id);
      if (!reviewTarget) {
        return reply.code(404).send({ success: false, error: 'Request not found' });
      }

      const nextRequests = workforce.requests.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              status,
              reviewedByUserId: user.id,
              reviewedByName: user.name || 'Manager',
              reviewedAt: new Date().toISOString(),
            }
          : entry
      );

      let nextShifts = [...workforce.shifts];

      if (status === 'approved') {
        nextShifts = nextShifts.map((shift) => {
          if (shift.id !== reviewTarget.shiftId) return shift;

          if (reviewTarget.type === 'give-up') {
            return {
              ...shift,
              userId: null,
              userName: null,
              status: 'open',
            } satisfies WorkforceShift;
          }

          if (reviewTarget.type === 'pickup') {
            return {
              ...shift,
              userId: reviewTarget.requestedByUserId,
              userName: reviewTarget.requestedByName,
              status: 'published',
            } satisfies WorkforceShift;
          }

          return shift;
        });
      }

      const nextWorkforce = {
        ...workforce,
        requests: nextRequests,
        shifts: nextShifts,
      };

      await saveLocationWorkforce(location, nextWorkforce);
      return reply.send({ success: true });
    },

    startShift: async (request: any, reply: any) => {
      const user = request.user;
      const body = request.body as { locationId?: string; shiftId?: string; managerPin?: string; notes?: string };
      const scoped = await getScopedLocation(user, body.locationId);
      if (scoped.error) return reply.code(400).send({ success: false, error: scoped.error });
      const location = scoped.location;

      if (!body.managerPin || body.managerPin.length < 4) {
        return reply.code(400).send({ success: false, error: 'Manager PIN is required to start a shift' });
      }

      const approvingManager = await prisma.user.findFirst({
        where: {
          restaurantId: user.restaurantId,
          isActive: true,
          role: { in: MANAGER_ROLES as any[] },
          pin: hashPin(body.managerPin),
        },
      });

      if (!approvingManager) {
        return reply.code(403).send({ success: false, error: 'Manager PIN was not accepted' });
      }

      const workforce = getWorkforceStateFromLocationSettings(location.settings);
      const existingOpenSession = workforce.attendance.find(
        (session) => session.userId === user.id && session.locationId === location.id && !session.endedAt
      );

      if (existingOpenSession) {
        return reply.code(400).send({ success: false, error: 'You already have an active shift' });
      }

      const now = new Date();
      const shift =
        workforce.shifts.find((entry) => entry.id === body.shiftId && (!entry.userId || entry.userId === user.id)) ||
        workforce.shifts.find((entry) => {
          if (entry.userId !== user.id) return false;
          const shiftStart = new Date(entry.startsAt);
          return shiftStart.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
        }) ||
        null;

      const nextSession: WorkforceAttendanceSession = {
        id: createWorkforceId('attendance'),
        shiftId: shift?.id || null,
        userId: user.id,
        userName: user.name || 'Staff',
        locationId: location.id,
        startedAt: now.toISOString(),
        endedAt: null,
        managerApprovedByUserId: approvingManager.id,
        managerApprovedByName: approvingManager.name || 'Manager',
        notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
      };

      const nextWorkforce = {
        ...workforce,
        attendance: [nextSession, ...workforce.attendance],
        shifts: workforce.shifts.map((entry) =>
          entry.id === shift?.id
            ? {
                ...entry,
                status: 'in_progress',
              }
            : entry
        ),
      };

      await saveLocationWorkforce(location, nextWorkforce);
      await prisma.clockEvent.create({
        data: {
          userId: user.id,
          type: 'CLOCK_IN',
          notes: nextSession.notes || `Started shift approved by ${approvingManager.name || 'Manager'}`,
        },
      });

      return reply.send({ success: true, data: nextSession });
    },

    endShift: async (request: any, reply: any) => {
      const user = request.user;
      const body = request.body as { locationId?: string; notes?: string };
      const scoped = await getScopedLocation(user, body.locationId);
      if (scoped.error) return reply.code(400).send({ success: false, error: scoped.error });
      const location = scoped.location;
      const workforce = getWorkforceStateFromLocationSettings(location.settings);

      const session = workforce.attendance.find(
        (entry) => entry.userId === user.id && entry.locationId === location.id && !entry.endedAt
      );

      if (!session) {
        return reply.code(400).send({ success: false, error: 'No active shift session found' });
      }

      const endedAt = new Date().toISOString();
      const nextWorkforce = {
        ...workforce,
        attendance: workforce.attendance.map((entry) =>
          entry.id === session.id
            ? {
                ...entry,
                endedAt,
                notes: entry.notes || (typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null),
              }
            : entry
        ),
        shifts: workforce.shifts.map((entry) =>
          entry.id === session.shiftId
            ? {
                ...entry,
                status: 'completed',
              }
            : entry
        ),
      };

      await saveLocationWorkforce(location, nextWorkforce);
      await prisma.clockEvent.create({
        data: {
          userId: user.id,
          type: 'CLOCK_OUT',
          notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : undefined,
        },
      });

      return reply.send({ success: true });
    },

    autoAssignSections: async (request: any, reply: any) => {
      const user = request.user;
      if (!isManager(user.role)) {
        return reply.code(403).send({ success: false, error: 'Manager approval required' });
      }

      const { locationId, timestamp } = request.body as { locationId?: string; timestamp?: string };
      const scoped = await getScopedLocation(user, locationId);
      if (scoped.error) return reply.code(400).send({ success: false, error: scoped.error });
      const location = scoped.location;
      const workforce = getWorkforceStateFromLocationSettings(location.settings);
      const staff = await getLocationStaff(user.restaurantId, location.id);
      const tables = await prisma.table.findMany({
        where: { locationId: location.id, isActive: true },
        orderBy: [{ section: 'asc' }, { positionX: 'asc' }, { positionY: 'asc' }],
      });

      const assignments = buildAutoSectionAssignments(
        workforce,
        staff,
        tables,
        location.id,
        timestamp ? new Date(timestamp) : new Date()
      );

      const nextWorkforce = applySectionAssignmentsToWorkforce(workforce, assignments);
      const nextSettings = setFloorPlanTableAssignments(
        buildLocationSettingsWithWorkforce(location.settings, nextWorkforce),
        buildFloorPlanAssignmentsFromSections(assignments)
      );

      await saveLocationWorkforce(location, nextWorkforce, nextSettings);
      return reply.send({ success: true, data: assignments });
    },

    saveSectionAssignments: async (request: any, reply: any) => {
      const user = request.user;
      if (!isManager(user.role)) {
        return reply.code(403).send({ success: false, error: 'Manager approval required' });
      }

      const { locationId, timestamp, assignments } = request.body as {
        locationId?: string;
        timestamp?: string;
        assignments?: Array<{ tableId: string; serverId: string; locked?: boolean }>;
      };

      const scoped = await getScopedLocation(user, locationId);
      if (scoped.error) return reply.code(400).send({ success: false, error: scoped.error });
      const location = scoped.location;
      const workforce = getWorkforceStateFromLocationSettings(location.settings);
      const staff = await getLocationStaff(user.restaurantId, location.id);
      const tables = await prisma.table.findMany({
        where: { locationId: location.id, isActive: true },
      });
      const assignmentTime = timestamp ? new Date(timestamp) : new Date();

      const nextAssignments: WorkforceSectionAssignment[] = (assignments || [])
        .map((entry) => {
          const member = staff.find((candidate: any) => candidate.id === entry.serverId);
          const table = tables.find((candidate) => candidate.id === entry.tableId);
          if (!member || !table) return null;

          const shift = workforce.shifts.find((candidate) => {
            if (!candidate.userId || candidate.userId !== member.id) return false;
            return overlaps(new Date(candidate.startsAt), new Date(candidate.endsAt), assignmentTime, assignmentTime);
          });

          return {
            id: createWorkforceId('section'),
            shiftId: shift?.id || null,
            tableId: table.id,
            tableName: table.name || 'Table',
            serverId: member.id,
            serverName: member.name || 'Server',
            roomName: table.section || null,
            source: 'manual',
            locked: entry.locked === true,
            createdAt: new Date().toISOString(),
          } satisfies WorkforceSectionAssignment;
        })
        .filter(Boolean) as WorkforceSectionAssignment[];

      const nextWorkforce = applySectionAssignmentsToWorkforce(workforce, nextAssignments);
      const nextSettings = setFloorPlanTableAssignments(
        buildLocationSettingsWithWorkforce(location.settings, nextWorkforce),
        buildFloorPlanAssignmentsFromSections(nextAssignments)
      );

      await saveLocationWorkforce(location, nextWorkforce, nextSettings);
      return reply.send({ success: true, data: nextAssignments });
    },
  };
}
