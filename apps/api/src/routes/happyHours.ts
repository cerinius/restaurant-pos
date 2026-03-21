
import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';

export default async function happyHourRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/', auth, async (request, reply) => {
    const user = (request as any).user;
    const happyHours = await prisma.happyHour.findMany({
      where: { restaurantId: user.restaurantId },
      orderBy: { name: 'asc' },
    });
    return reply.send({ success: true, data: happyHours });
  });

  app.post('/', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, startTime, endTime, daysOfWeek, discountType, discountValue, categoryIds, itemIds, isActive } = request.body as any;
    const hh = await prisma.happyHour.create({
      data: {
        restaurantId: user.restaurantId,
        name, startTime, endTime,
        daysOfWeek: daysOfWeek || [],
        discountType: discountType || 'PERCENTAGE',
        discountValue,
        categoryIds: categoryIds || [],
        itemIds: itemIds || [],
        isActive: isActive !== false,
      },
    });
    return reply.code(201).send({ success: true, data: hh });
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, startTime, endTime, daysOfWeek, discountType, discountValue, categoryIds, itemIds, isActive } = request.body as any;
    const hh = await prisma.happyHour.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(daysOfWeek !== undefined && { daysOfWeek }),
        ...(discountType !== undefined && { discountType }),
        ...(discountValue !== undefined && { discountValue }),
        ...(categoryIds !== undefined && { categoryIds }),
        ...(itemIds !== undefined && { itemIds }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return reply.send({ success: true, data: hh });
  });

  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    await prisma.happyHour.delete({ where: { id } });
    return reply.send({ success: true, message: 'Happy hour deleted' });
  });
}
