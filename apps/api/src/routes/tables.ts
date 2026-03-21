import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';
import { WSEventType } from '@pos/shared';
import { wsManager } from '../websocket/manager';

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
      include: {
        orders: {
          where: { status: { in: ['OPEN', 'SENT', 'IN_PROGRESS', 'READY'] } },
          include: {
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
            server: { select: { id: true, name: true } },
          },
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
      include: {
        orders: {
          where: { status: { in: ['OPEN', 'SENT', 'IN_PROGRESS', 'READY'] } },
          include: {
            items: { where: { isVoided: false } },
            payments: true,
            discounts: true,
          },
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
}