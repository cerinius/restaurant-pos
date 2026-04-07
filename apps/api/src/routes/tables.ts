import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';
import { WSEventType } from '@pos/shared';
import { wsManager } from '../websocket/manager';

const ACTIVE_ORDER_STATUSES = ['OPEN', 'SENT', 'IN_PROGRESS', 'READY'] as const;
const TABLE_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'DIRTY', 'BLOCKED'] as const;

const ACTIVE_ORDER_LIST_SELECT = {
  id: true,
  restaurantId: true,
  locationId: true,
  tableId: true,
  tableName: true,
  serverId: true,
  serverName: true,
  status: true,
  type: true,
  guestCount: true,
  subtotal: true,
  taxTotal: true,
  discountTotal: true,
  tipTotal: true,
  total: true,
  notes: true,
  customerName: true,
  customerPhone: true,
  customerEmail: true,
  firedAt: true,
  paidAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  items: {
    where: { isVoided: false },
    select: {
      id: true,
      menuItemName: true,
      quantity: true,
      totalPrice: true,
      status: true,
    },
  },
  server: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

const ACTIVE_ORDER_DETAIL_SELECT = {
  ...ACTIVE_ORDER_LIST_SELECT,
  payments: true,
  discounts: true,
} as const;

const TABLE_BASE_SELECT = {
  id: true,
  locationId: true,
  name: true,
  capacity: true,
  status: true,
  positionX: true,
  positionY: true,
  shape: true,
  section: true,
  width: true,
  height: true,
  isActive: true,
  createdAt: true,
} as const;

export default async function tableRoutes(app: FastifyInstance) {
  const auth = {
    preHandler: [async (request: any, reply: any) => app.authenticate(request, reply)],
  };

  app.get('/', auth, async (request, reply) => {
    const user = (request as any).user;
    const { locationId, section, status } = request.query as Record<string, string>;

    const tables = await prisma.table.findMany({
      where: {
        location: { restaurantId: user.restaurantId },
        isActive: true,
        ...(locationId ? { locationId } : {}),
        ...(section ? { section } : {}),
        ...(status ? { status: status as any } : {}),
      },
      select: {
        ...TABLE_BASE_SELECT,
        orders: {
          where: { status: { in: ACTIVE_ORDER_STATUSES as any } },
          select: ACTIVE_ORDER_LIST_SELECT,
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    return reply.send({ success: true, data: tables });
  });

  app.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const table = await prisma.table.findFirst({
      where: { id, location: { restaurantId: user.restaurantId } },
      select: {
        ...TABLE_BASE_SELECT,
        orders: {
          where: { status: { in: ACTIVE_ORDER_STATUSES as any } },
          select: ACTIVE_ORDER_DETAIL_SELECT,
        },
      },
    });

    if (!table) {
      return reply.code(404).send({ success: false, error: 'Table not found' });
    }

    return reply.send({ success: true, data: table });
  });

  app.post('/', auth, async (request, reply) => {
    const user = (request as any).user;

    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }

    const { locationId, name, capacity, positionX, positionY, shape, section, width, height } =
      request.body as any;

    const table = await prisma.table.create({
      data: {
        locationId,
        name,
        capacity: capacity || 4,
        positionX: positionX || 0,
        positionY: positionY || 0,
        shape: shape || 'rectangle',
        section,
        width: width || 80,
        height: height || 80,
        status: 'AVAILABLE',
        isActive: true,
      },
    });

    wsManager.broadcast(user.restaurantId, WSEventType.TABLE_UPDATED, table, locationId);

    return reply.code(201).send({ success: true, data: table });
  });

  app.put('/bulk-positions', auth, async (request, reply) => {
    const user = (request as any).user;

    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }

    const { positions } = (request.body as { positions?: Array<{ id: string; positionX: number; positionY: number }> }) || {};

    if (!Array.isArray(positions) || positions.length === 0) {
      return reply.send({ success: true, data: [] });
    }

    const dedupedPositions = Array.from(
      positions.reduce((map, position) => {
        if (!position?.id) return map;

        map.set(position.id, {
          id: position.id,
          positionX: Number(position.positionX),
          positionY: Number(position.positionY),
        });

        return map;
      }, new Map<string, { id: string; positionX: number; positionY: number }>())
        .values()
    );

    if (dedupedPositions.length === 0) {
      return reply.code(400).send({ success: false, error: 'No valid table positions provided' });
    }

    const hasInvalidPosition = dedupedPositions.some(
      (position) => !Number.isFinite(position.positionX) || !Number.isFinite(position.positionY)
    );

    if (hasInvalidPosition) {
      return reply.code(400).send({ success: false, error: 'Invalid table positions provided' });
    }

    const tableIds = dedupedPositions.map((position) => position.id);

    const existingTables = await prisma.table.findMany({
      where: {
        id: { in: tableIds },
        isActive: true,
        location: { restaurantId: user.restaurantId },
      },
      select: { id: true },
    });

    if (existingTables.length !== tableIds.length) {
      return reply.code(404).send({ success: false, error: 'One or more tables were not found' });
    }

    const updatedTables = await prisma.$transaction(
      dedupedPositions.map((position) =>
        prisma.table.update({
          where: { id: position.id },
          data: {
            positionX: position.positionX,
            positionY: position.positionY,
          },
        })
      )
    );

    updatedTables.forEach((table) => {
      wsManager.broadcast(user.restaurantId, WSEventType.TABLE_UPDATED, table, table.locationId);
    });

    return reply.send({ success: true, data: updatedTables });
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }

    const { name, capacity, positionX, positionY, shape, section, width, height, isActive, status } =
      request.body as any;

    const existingTable = await prisma.table.findFirst({
      where: {
        id,
        location: { restaurantId: user.restaurantId },
      },
    });

    if (!existingTable) {
      return reply.code(404).send({ success: false, error: 'Table not found' });
    }

    const table = await prisma.table.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(capacity !== undefined && { capacity }),
        ...(positionX !== undefined && { positionX }),
        ...(positionY !== undefined && { positionY }),
        ...(shape !== undefined && { shape }),
        ...(section !== undefined && { section }),
        ...(width !== undefined && { width }),
        ...(height !== undefined && { height }),
        ...(isActive !== undefined && { isActive }),
        ...(status !== undefined && { status }),
      },
    });

    wsManager.broadcast(user.restaurantId, WSEventType.TABLE_UPDATED, table, table.locationId);

    return reply.send({ success: true, data: table });
  });

  app.patch('/:id/status', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }

    const { status } = (request.body as { status?: string }) || {};

    if (!status || !TABLE_STATUSES.includes(status as (typeof TABLE_STATUSES)[number])) {
      return reply.code(400).send({ success: false, error: 'Invalid table status' });
    }

    const existingTable = await prisma.table.findFirst({
      where: {
        id,
        isActive: true,
        location: { restaurantId: user.restaurantId },
      },
      select: { id: true },
    });

    if (!existingTable) {
      return reply.code(404).send({ success: false, error: 'Table not found' });
    }

    const table = await prisma.table.update({
      where: { id },
      data: { status: status as any },
    });

    wsManager.broadcast(user.restaurantId, WSEventType.TABLE_UPDATED, table, table.locationId);

    return reply.send({ success: true, data: table });
  });

  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }

    const existingTable = await prisma.table.findFirst({
      where: {
        id,
        isActive: true,
        location: { restaurantId: user.restaurantId },
      },
      select: { id: true, locationId: true },
    });

    if (!existingTable) {
      return reply.code(404).send({ success: false, error: 'Table not found' });
    }

    const openOrders = await prisma.order.count({
      where: {
        tableId: id,
        restaurantId: user.restaurantId,
        status: { in: ACTIVE_ORDER_STATUSES as any },
      },
    });

    if (openOrders > 0) {
      return reply.code(409).send({ success: false, error: 'Cannot delete table with active orders' });
    }

    const table = await prisma.table.update({
      where: { id },
      data: { isActive: false },
    });

    wsManager.broadcast(user.restaurantId, WSEventType.TABLE_UPDATED, table, existingTable.locationId);

    return reply.send({ success: true, data: table });
  });
}
