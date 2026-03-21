
import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';

export default async function stationRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/', auth, async (request, reply) => {
    const user = (request as any).user;
    const { locationId } = request.query as { locationId?: string };
    const stations = await prisma.station.findMany({
      where: {
        restaurantId: user.restaurantId,
        ...(locationId ? { locationId } : {}),
        isActive: true,
      },
      include: {
        categories: { include: { category: { select: { id: true, name: true } } } },
      },
      orderBy: { displayOrder: 'asc' },
    });
    return reply.send({ success: true, data: stations });
  });

  app.post('/', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { locationId, name, type, color, displayOrder, categoryIds } = request.body as any;
    const station = await prisma.station.create({
      data: {
        restaurantId: user.restaurantId,
        locationId, name, type: type || 'KITCHEN',
        color: color || '#3B82F6',
        displayOrder: displayOrder || 0,
        isActive: true,
        ...(categoryIds?.length > 0 && {
          categories: {
            create: categoryIds.map((cid: string) => ({ categoryId: cid })),
          },
        }),
      },
      include: { categories: true },
    });
    return reply.code(201).send({ success: true, data: station });
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, type, color, displayOrder, isActive, categoryIds } = request.body as any;

    const station = await prisma.station.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(color !== undefined && { color }),
        ...(displayOrder !== undefined && { displayOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    if (categoryIds !== undefined) {
      await prisma.stationCategory.deleteMany({ where: { stationId: id } });
      if (categoryIds.length > 0) {
        await prisma.stationCategory.createMany({
          data: categoryIds.map((cid: string) => ({ stationId: id, categoryId: cid })),
        });
      }
    }

    return reply.send({ success: true, data: station });
  });

  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    await prisma.station.update({ where: { id }, data: { isActive: false } });
    return reply.send({ success: true, message: 'Station deactivated' });
  });
}
