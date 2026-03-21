
import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';
import crypto from 'crypto';
import { WSEventType } from '@pos/shared';
import { wsManager } from '../websocket/manager';

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin + 'pos-salt-2024').digest('hex');
}

export default async function staffRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // GET all staff
  app.get('/', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Access denied' });
    }

    const staff = await prisma.user.findMany({
      where: { restaurantId: user.restaurantId },
      include: {
        locations: { include: { location: { select: { id: true, name: true } } } },
      },
      orderBy: { name: 'asc' },
    });

    // Never return PIN hashes
    const sanitized = staff.map(({ pin: _pin, ...s }: any) => s);
    return reply.send({ success: true, data: sanitized });
  });

  // GET single staff member
  app.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    if (user.id !== id && !['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Access denied' });
    }

    const staff = await prisma.user.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: {
        locations: { include: { location: { select: { id: true, name: true } } } },
      },
    });

    if (!staff) return reply.code(404).send({ success: false, error: 'Staff member not found' });
    const { pin: _pin, ...sanitized } = staff;
    return reply.send({ success: true, data: sanitized });
  });

  // CREATE staff member
  app.post('/', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Only owners and managers can create staff' });
    }

    const { name, email, pin, role, locationIds, avatar } = request.body as {
      name: string;
      email?: string;
      pin: string;
      role: string;
      locationIds: string[];
      avatar?: string;
    };

    if (!name || !pin || !role) {
      return reply.code(400).send({ success: false, error: 'name, pin, and role are required' });
    }
    if (pin.length < 4) {
      return reply.code(400).send({ success: false, error: 'PIN must be at least 4 digits' });
    }
    // Managers cannot create OWNER accounts
    if (role === 'OWNER' && user.role !== 'OWNER') {
      return reply.code(403).send({ success: false, error: 'Only owners can create owner accounts' });
    }

    const newStaff = await prisma.user.create({
      data: {
        restaurantId: user.restaurantId,
        name,
        email,
        pin: hashPin(pin),
        role: role as any,
        avatar,
        isActive: true,
        locations: {
          create: (locationIds || []).map((lid: string) => ({ locationId: lid })),
        },
      },
      include: {
        locations: { include: { location: { select: { id: true, name: true } } } },
      },
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: user.restaurantId,
        userId: user.id,
        userName: user.name,
        action: 'STAFF_CREATED',
        entityType: 'USER',
        entityId: newStaff.id,
        details: { name, role },
      },
    });

    const { pin: _pin, ...sanitized } = newStaff;
    return reply.code(201).send({ success: true, data: sanitized });
  });

  // UPDATE staff member
  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    if (user.id !== id && !['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Access denied' });
    }

    const { name, email, pin, role, locationIds, isActive, avatar } = request.body as any;

    if (role === 'OWNER' && user.role !== 'OWNER') {
      return reply.code(403).send({ success: false, error: 'Only owners can assign owner role' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(pin !== undefined && { pin: hashPin(pin) }),
        ...(role !== undefined && { role: role as any }),
        ...(isActive !== undefined && { isActive }),
        ...(avatar !== undefined && { avatar }),
      },
    });

    if (locationIds !== undefined) {
      await prisma.userLocation.deleteMany({ where: { userId: id } });
      if (locationIds.length > 0) {
        await prisma.userLocation.createMany({
          data: locationIds.map((lid: string) => ({ userId: id, locationId: lid })),
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        restaurantId: user.restaurantId,
        userId: user.id,
        userName: user.name,
        action: 'STAFF_UPDATED',
        entityType: 'USER',
        entityId: id,
        details: { updatedFields: Object.keys(request.body as object) },
      },
    });

    const { pin: _pin, ...sanitized } = updated;
    return reply.send({ success: true, data: sanitized });
  });

  // Reset PIN (manager only)
  app.post('/:id/reset-pin', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Manager approval required' });
    }

    const { newPin } = request.body as { newPin: string };
    if (!newPin || newPin.length < 4) {
      return reply.code(400).send({ success: false, error: 'PIN must be at least 4 digits' });
    }

    await prisma.user.update({
      where: { id },
      data: { pin: hashPin(newPin) },
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: user.restaurantId,
        userId: user.id,
        userName: user.name,
        action: 'PIN_RESET',
        entityType: 'USER',
        entityId: id,
        details: { resetBy: user.name },
      },
    });

    return reply.send({ success: true, message: 'PIN reset successfully' });
  });

  // Deactivate (soft delete)
  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    if (id === user.id) {
      return reply.code(400).send({ success: false, error: 'Cannot deactivate your own account' });
    }

    await prisma.user.update({ where: { id }, data: { isActive: false } });

    await prisma.auditLog.create({
      data: {
        restaurantId: user.restaurantId,
        userId: user.id,
        userName: user.name,
        action: 'STAFF_DEACTIVATED',
        entityType: 'USER',
        entityId: id,
      },
    });

    return reply.send({ success: true, message: 'Staff member deactivated' });
  });

  // Clock in
  app.post('/clock-in', auth, async (request, reply) => {
    const user = (request as any).user;
    const { notes } = request.body as { notes?: string };

    // Check if already clocked in
    const lastEvent = await prisma.clockEvent.findFirst({
      where: { userId: user.id },
      orderBy: { timestamp: 'desc' },
    });

    if (lastEvent?.type === 'CLOCK_IN' || lastEvent?.type === 'BREAK_END') {
      return reply.code(400).send({ success: false, error: 'Already clocked in' });
    }

    const event = await prisma.clockEvent.create({
      data: { userId: user.id, type: 'CLOCK_IN', notes },
    });

    wsManager.broadcast(user.restaurantId, WSEventType.STAFF_CLOCKED_IN, {
      userId: user.id,
      userName: user.name,
      timestamp: event.timestamp,
    });

    return reply.send({ success: true, data: event });
  });

  // Clock out
  app.post('/clock-out', auth, async (request, reply) => {
    const user = (request as any).user;
    const { notes } = request.body as { notes?: string };

    const event = await prisma.clockEvent.create({
      data: { userId: user.id, type: 'CLOCK_OUT', notes },
    });

    wsManager.broadcast(user.restaurantId, WSEventType.STAFF_CLOCKED_OUT, {
      userId: user.id,
      userName: user.name,
      timestamp: event.timestamp,
    });

    return reply.send({ success: true, data: event });
  });

  // Get clock events for a user
  app.get('/:id/clock-events', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const { dateFrom, dateTo } = request.query as Record<string, string>;

    if (user.id !== id && !['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Access denied' });
    }

    const events = await prisma.clockEvent.findMany({
      where: {
        userId: id,
        ...(dateFrom || dateTo
          ? {
              timestamp: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
      },
      orderBy: { timestamp: 'asc' },
    });

    // Calculate hours worked
    let totalMinutes = 0;
    let clockInTime: Date | null = null;

    for (const event of events) {
      if (event.type === 'CLOCK_IN' || event.type === 'BREAK_END') {
        clockInTime = event.timestamp;
      } else if ((event.type === 'CLOCK_OUT' || event.type === 'BREAK_START') && clockInTime) {
        totalMinutes += (event.timestamp.getTime() - clockInTime.getTime()) / 60000;
        clockInTime = null;
      }
    }

    return reply.send({
      success: true,
      data: {
        events,
        totalMinutes: Math.round(totalMinutes),
        totalHours: parseFloat((totalMinutes / 60).toFixed(2)),
      },
    });
  });
}
