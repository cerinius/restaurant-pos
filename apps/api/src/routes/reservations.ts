import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';
import { WSEventType } from '@pos/shared';
import { wsManager } from '../websocket/manager';

const ACTIVE_ORDER_STATUSES = ['OPEN', 'SENT', 'IN_PROGRESS', 'READY'] as const;
const TABLE_HOLD_STATUSES = ['CONFIRMED', 'ARRIVED'] as const;
const RESERVATION_MUTABLE_STATUSES = [
  'CONFIRMED',
  'ARRIVED',
  'SEATED',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED',
  'WAITLIST',
] as const;
const RESERVATION_SOURCES = ['PHONE', 'ONLINE', 'WALK_IN', 'APP'] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toDayRange(date: string) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function buildReservationDate(date?: string, time?: string) {
  if (!isNonEmptyString(date)) return null;

  const normalizedTime = isNonEmptyString(time) ? time : '19:00';
  const value = new Date(`${date}T${normalizedTime}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)
    .slice(0, 10);
}

function makeConfirmationCode(prefix: string) {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${suffix}`;
}

function getStatusTimestampPatch(status: string) {
  const now = new Date();

  switch (status) {
    case 'SEATED':
      return { seatedAt: now };
    case 'COMPLETED':
      return { completedAt: now };
    case 'NO_SHOW':
      return { noShowAt: now };
    case 'CANCELLED':
      return { cancelledAt: now };
    default:
      return {};
  }
}

async function syncTableStatus(tableId: string, restaurantId: string) {
  const [table, activeOrders, heldReservations] = await Promise.all([
    prisma.table.findFirst({
      where: {
        id: tableId,
        isActive: true,
        location: { restaurantId },
      },
    }),
    prisma.order.count({
      where: {
        tableId,
        restaurantId,
        status: { in: ACTIVE_ORDER_STATUSES as any },
      },
    }),
    prisma.reservation.count({
      where: {
        tableId,
        restaurantId,
        status: { in: TABLE_HOLD_STATUSES as any },
      },
    }),
  ]);

  if (!table) return null;

  let nextStatus = table.status;

  if (activeOrders > 0) {
    nextStatus = 'OCCUPIED';
  } else if (heldReservations > 0) {
    if (!['DIRTY', 'BLOCKED'].includes(table.status)) {
      nextStatus = 'RESERVED';
    }
  } else if (!['DIRTY', 'BLOCKED'].includes(table.status)) {
    nextStatus = 'AVAILABLE';
  }

  if (nextStatus === table.status) return table;

  const updatedTable = await prisma.table.update({
    where: { id: tableId },
    data: { status: nextStatus as any },
  });

  wsManager.broadcast(restaurantId, WSEventType.TABLE_UPDATED, updatedTable, updatedTable.locationId);
  return updatedTable;
}

function buildStats(reservations: any[]) {
  return reservations.reduce(
    (stats, reservation) => {
      const status = String(reservation.status || '');

      if (status !== 'WAITLIST') stats.total += 1;
      if (status === 'CONFIRMED') stats.confirmed += 1;
      if (status === 'SEATED') stats.seated += 1;
      if (status === 'ARRIVED') stats.arrived += 1;
      if (status === 'WAITLIST') stats.waitlist += 1;
      if (!['WAITLIST', 'CANCELLED', 'NO_SHOW'].includes(status)) {
        stats.covers += Number(reservation.partySize || 0);
      }

      return stats;
    },
    { total: 0, confirmed: 0, seated: 0, arrived: 0, waitlist: 0, covers: 0 },
  );
}

async function buildReservationSuggestions(reservationId: string, restaurantId: string) {
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, restaurantId },
  });

  if (!reservation) {
    return null;
  }

  const windowStart = new Date(reservation.reservationAt.getTime() - 90 * 60 * 1000);
  const windowEnd = new Date(reservation.reservationAt.getTime() + 90 * 60 * 1000);

  const [tables, activeOrders, nearbyReservations, servers] = await Promise.all([
    prisma.table.findMany({
      where: {
        locationId: reservation.locationId,
        isActive: true,
      },
      orderBy: [{ section: 'asc' }, { name: 'asc' }],
    }),
    prisma.order.findMany({
      where: {
        restaurantId,
        locationId: reservation.locationId,
        tableId: { not: null },
        status: { in: ACTIVE_ORDER_STATUSES as any },
      },
      select: { tableId: true },
    }),
    prisma.reservation.findMany({
      where: {
        restaurantId,
        locationId: reservation.locationId,
        id: { not: reservation.id },
        tableId: { not: null },
        status: { in: ['CONFIRMED', 'ARRIVED', 'SEATED'] as any },
        reservationAt: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      select: {
        tableId: true,
      },
    }),
    prisma.user.findMany({
      where: {
        restaurantId,
        isActive: true,
        role: { in: ['SERVER', 'BARTENDER'] as any },
        locations: { some: { locationId: reservation.locationId } },
      },
      orderBy: [{ lastSeatedAt: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        role: true,
        lastSeatedAt: true,
      },
    }),
  ]);

  const blockedTableIds = new Set<string>();
  activeOrders.forEach((order) => {
    if (order.tableId) blockedTableIds.add(order.tableId);
  });
  nearbyReservations.forEach((entry) => {
    if (entry.tableId) blockedTableIds.add(entry.tableId);
  });

  const suggestedTables = tables
    .map((table) => {
      const capacity = Number(table.capacity || 0);
      const score =
        (table.id === reservation.tableId ? 40 : 0) +
        (table.status === 'AVAILABLE' ? 25 : 0) +
        (table.status === 'RESERVED' && table.id === reservation.tableId ? 8 : 0) +
        Math.max(0, 18 - Math.abs(capacity - reservation.partySize) * 4) -
        (capacity < reservation.partySize ? 100 : 0) -
        (blockedTableIds.has(table.id) ? 120 : 0) -
        (table.status === 'BLOCKED' ? 120 : 0) -
        (table.status === 'DIRTY' ? 80 : 0);

      return {
        id: table.id,
        name: table.name,
        capacity: table.capacity,
        status: table.status,
        section: table.section,
        score,
        recommended: score > -40,
      };
    })
    .filter((table) => table.score > -110)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, 6);

  const suggestedServers = servers
    .map((server, index) => ({
      id: server.id,
      name: server.name,
      role: server.role,
      lastSeatedAt: server.lastSeatedAt,
      priority: index + 1,
    }))
    .slice(0, 6);

  return {
    reservation,
    suggestedTables,
    suggestedServers,
  };
}

export default async function reservationRoutes(app: FastifyInstance) {
  const auth = {
    preHandler: [async (request: any, reply: any) => app.authenticate(request, reply)],
  };

  app.get('/', auth, async (request, reply) => {
    const user = (request as any).user;
    const { date, locationId, status, search } = request.query as Record<string, string | undefined>;
    const where: any = {
      restaurantId: user.restaurantId,
      ...(locationId ? { locationId } : {}),
    };

    if (status && RESERVATION_MUTABLE_STATUSES.includes(status as any)) {
      where.status = status;
    }

    if (isNonEmptyString(date)) {
      const { start, end } = toDayRange(date);
      where.reservationAt = { gte: start, lt: end };
    }

    if (isNonEmptyString(search)) {
      const query = search.trim();
      where.OR = [
        { guestName: { contains: query, mode: 'insensitive' } },
        { guestPhone: { contains: query } },
        { confirmationCode: { contains: query, mode: 'insensitive' } },
      ];
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        table: { select: { id: true, name: true, capacity: true, status: true } },
        order: { select: { id: true, status: true, tableName: true, serverName: true } },
      },
      orderBy: [{ reservationAt: 'asc' }, { createdAt: 'asc' }],
    });

    return reply.send({
      success: true,
      data: {
        reservations,
        stats: buildStats(reservations),
      },
    });
  });

  app.post('/', auth, async (request, reply) => {
    const user = (request as any).user;
    const body = (request.body as Record<string, unknown>) || {};
    const reservationAt = buildReservationDate(
      String(body.date || ''),
      String(body.time || ''),
    );

    if (!reservationAt) {
      return reply.code(400).send({ success: false, error: 'A valid reservation date and time are required' });
    }

    if (!isNonEmptyString(body.locationId)) {
      return reply.code(400).send({ success: false, error: 'locationId is required' });
    }

    if (!isNonEmptyString(body.guestName) || !isNonEmptyString(body.guestPhone)) {
      return reply.code(400).send({ success: false, error: 'Guest name and phone are required' });
    }

    const status = String(body.status || 'CONFIRMED').toUpperCase();
    const source = String(body.source || 'ONLINE').toUpperCase();

    if (!RESERVATION_MUTABLE_STATUSES.includes(status as any)) {
      return reply.code(400).send({ success: false, error: 'Invalid reservation status' });
    }

    if (!RESERVATION_SOURCES.includes(source as any)) {
      return reply.code(400).send({ success: false, error: 'Invalid reservation source' });
    }

    const location = await prisma.location.findFirst({
      where: {
        id: String(body.locationId),
        restaurantId: user.restaurantId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!location) {
      return reply.code(404).send({ success: false, error: 'Location not found' });
    }

    let tableId: string | undefined;
    if (isNonEmptyString(body.tableId)) {
      const table = await prisma.table.findFirst({
        where: {
          id: String(body.tableId),
          locationId: location.id,
          isActive: true,
        },
        select: { id: true },
      });

      if (!table) {
        return reply.code(404).send({ success: false, error: 'Assigned table not found' });
      }

      tableId = table.id;
    }

    let confirmationCode = makeConfirmationCode(status === 'WAITLIST' ? 'WAIT' : 'RES');
    while (await prisma.reservation.findUnique({ where: { confirmationCode } })) {
      confirmationCode = makeConfirmationCode(status === 'WAITLIST' ? 'WAIT' : 'RES');
    }

    const reservation = await prisma.reservation.create({
      data: {
        restaurantId: user.restaurantId,
        locationId: location.id,
        tableId,
        guestName: String(body.guestName).trim(),
        guestPhone: String(body.guestPhone).trim(),
        guestEmail: isNonEmptyString(body.guestEmail) ? String(body.guestEmail).trim() : undefined,
        partySize: Math.max(1, Number(body.partySize || 2)),
        reservationAt,
        status: status as any,
        source: source as any,
        confirmationCode,
        notes: isNonEmptyString(body.notes) ? String(body.notes).trim() : undefined,
        specialRequests: isNonEmptyString(body.specialRequests) ? String(body.specialRequests).trim() : undefined,
        tags: normalizeTags(body.tags),
        isVip: Boolean(body.isVip),
        visitCount: Math.max(0, Number(body.visitCount || 0)),
        quotedWaitMinutes:
          body.quotedWaitMinutes === undefined || body.quotedWaitMinutes === null
            ? undefined
            : Math.max(0, Number(body.quotedWaitMinutes || 0)),
      },
      include: {
        table: { select: { id: true, name: true, capacity: true, status: true } },
        order: { select: { id: true, status: true, tableName: true, serverName: true } },
      },
    });

    if (tableId) {
      await syncTableStatus(tableId, user.restaurantId);
    }

    wsManager.broadcast(user.restaurantId, WSEventType.RESERVATION_UPDATED, reservation, location.id);

    return reply.code(201).send({ success: true, data: reservation });
  });

  app.patch('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const body = (request.body as Record<string, unknown>) || {};

    const existing = await prisma.reservation.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: { table: { select: { id: true } } },
    });

    if (!existing) {
      return reply.code(404).send({ success: false, error: 'Reservation not found' });
    }

    const nextStatus = body.status ? String(body.status).toUpperCase() : existing.status;
    if (body.status && !RESERVATION_MUTABLE_STATUSES.includes(nextStatus as any)) {
      return reply.code(400).send({ success: false, error: 'Invalid reservation status' });
    }

    const nextSource = body.source ? String(body.source).toUpperCase() : existing.source;
    if (body.source && !RESERVATION_SOURCES.includes(nextSource as any)) {
      return reply.code(400).send({ success: false, error: 'Invalid reservation source' });
    }

    let reservationAt = existing.reservationAt;
    if (body.date || body.time) {
      const built = buildReservationDate(
        String(body.date || existing.reservationAt.toISOString().slice(0, 10)),
        String(body.time || existing.reservationAt.toISOString().slice(11, 16)),
      );

      if (!built) {
        return reply.code(400).send({ success: false, error: 'A valid reservation date and time are required' });
      }

      reservationAt = built;
    }

    let locationId = existing.locationId;
    if (isNonEmptyString(body.locationId) && String(body.locationId) !== existing.locationId) {
      const location = await prisma.location.findFirst({
        where: {
          id: String(body.locationId),
          restaurantId: user.restaurantId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!location) {
        return reply.code(404).send({ success: false, error: 'Location not found' });
      }

      locationId = location.id;
    }

    let tableId = existing.tableId || undefined;
    if (body.tableId !== undefined) {
      if (!isNonEmptyString(body.tableId)) {
        tableId = undefined;
      } else {
        const table = await prisma.table.findFirst({
          where: {
            id: String(body.tableId),
            locationId,
            isActive: true,
          },
          select: { id: true },
        });

        if (!table) {
          return reply.code(404).send({ success: false, error: 'Assigned table not found' });
        }

        tableId = table.id;
      }
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        locationId,
        tableId,
        reservationAt,
        status: nextStatus as any,
        source: nextSource as any,
        ...(body.guestName !== undefined && { guestName: String(body.guestName || '').trim() }),
        ...(body.guestPhone !== undefined && { guestPhone: String(body.guestPhone || '').trim() }),
        ...(body.guestEmail !== undefined && {
          guestEmail: isNonEmptyString(body.guestEmail) ? String(body.guestEmail).trim() : null,
        }),
        ...(body.partySize !== undefined && { partySize: Math.max(1, Number(body.partySize || 1)) }),
        ...(body.notes !== undefined && { notes: isNonEmptyString(body.notes) ? String(body.notes).trim() : null }),
        ...(body.specialRequests !== undefined && {
          specialRequests: isNonEmptyString(body.specialRequests) ? String(body.specialRequests).trim() : null,
        }),
        ...(body.tags !== undefined && { tags: normalizeTags(body.tags) }),
        ...(body.isVip !== undefined && { isVip: Boolean(body.isVip) }),
        ...(body.visitCount !== undefined && { visitCount: Math.max(0, Number(body.visitCount || 0)) }),
        ...(body.quotedWaitMinutes !== undefined && {
          quotedWaitMinutes:
            body.quotedWaitMinutes === null ? null : Math.max(0, Number(body.quotedWaitMinutes || 0)),
        }),
        ...getStatusTimestampPatch(nextStatus),
      },
      include: {
        table: { select: { id: true, name: true, capacity: true, status: true } },
        order: { select: { id: true, status: true, tableName: true, serverName: true } },
      },
    });

    const affectedTables = [existing.tableId, tableId].filter(Boolean) as string[];
    await Promise.all(
      Array.from(new Set(affectedTables)).map((tableKey) => syncTableStatus(tableKey, user.restaurantId)),
    );

    wsManager.broadcast(user.restaurantId, WSEventType.RESERVATION_UPDATED, updated, locationId);

    return reply.send({ success: true, data: updated });
  });

  app.get('/:id/suggestions', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const suggestions = await buildReservationSuggestions(id, user.restaurantId);
    if (!suggestions) {
      return reply.code(404).send({ success: false, error: 'Reservation not found' });
    }

    return reply.send({ success: true, data: suggestions });
  });

  app.post('/:id/seat', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const { serverId, tableId: requestedTableId, guestCount } = (request.body as Record<string, unknown>) || {};

    const reservation = await prisma.reservation.findFirst({
      where: { id, restaurantId: user.restaurantId },
    });

    if (!reservation) {
      return reply.code(404).send({ success: false, error: 'Reservation not found' });
    }

    if (reservation.orderId) {
      return reply.code(409).send({ success: false, error: 'This reservation is already seated' });
    }

    const finalTableId = isNonEmptyString(requestedTableId)
      ? String(requestedTableId)
      : reservation.tableId;

    if (!finalTableId) {
      return reply.code(400).send({ success: false, error: 'A table is required to seat this reservation' });
    }

    const [table, server] = await Promise.all([
      prisma.table.findFirst({
        where: {
          id: finalTableId,
          locationId: reservation.locationId,
          isActive: true,
          location: { restaurantId: user.restaurantId },
        },
      }),
      prisma.user.findFirst({
        where: {
          id: isNonEmptyString(serverId) ? String(serverId) : user.id,
          restaurantId: user.restaurantId,
          isActive: true,
        },
        select: { id: true, name: true },
      }),
    ]);

    if (!table) {
      return reply.code(404).send({ success: false, error: 'Table not found' });
    }

    if (table.status === 'OCCUPIED') {
      return reply.code(409).send({ success: false, error: 'Table is already occupied' });
    }

    if (!server) {
      return reply.code(404).send({ success: false, error: 'Server not found' });
    }

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          restaurantId: user.restaurantId,
          locationId: reservation.locationId,
          tableId: table.id,
          tableName: table.name,
          serverId: server.id,
          serverName: server.name,
          type: 'DINE_IN',
          guestCount: Math.max(1, Number(guestCount || reservation.partySize || 1)),
          customerName: reservation.guestName,
          customerPhone: reservation.guestPhone,
          customerEmail: reservation.guestEmail || undefined,
          notes: reservation.specialRequests || reservation.notes || undefined,
          status: 'OPEN',
          subtotal: 0,
          taxTotal: 0,
          discountTotal: 0,
          tipTotal: 0,
          total: 0,
        },
      });

      await tx.table.update({
        where: { id: table.id },
        data: { status: 'OCCUPIED' },
      });

      await tx.user.update({
        where: { id: server.id },
        data: { lastSeatedAt: new Date() },
      });

      await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          orderId: createdOrder.id,
          tableId: table.id,
          status: 'SEATED',
          seatedAt: new Date(),
        },
      });

      return createdOrder;
    });

    const updatedReservation = await prisma.reservation.findUnique({
      where: { id: reservation.id },
      include: {
        table: { select: { id: true, name: true, capacity: true, status: true } },
        order: { select: { id: true, status: true, tableName: true, serverName: true } },
      },
    });

    wsManager.broadcast(user.restaurantId, WSEventType.ORDER_CREATED, order, reservation.locationId);
    wsManager.broadcast(user.restaurantId, WSEventType.RESERVATION_UPDATED, updatedReservation, reservation.locationId);
    wsManager.broadcast(
      user.restaurantId,
      WSEventType.TABLE_UPDATED,
      await prisma.table.findUnique({ where: { id: table.id } }),
      reservation.locationId,
    );

    return reply.send({ success: true, data: { reservation: updatedReservation, order } });
  });
}
