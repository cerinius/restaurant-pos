
import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';

export default async function discountRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/', auth, async (request, reply) => {
    const user = (request as any).user;
    const discounts = await prisma.discount.findMany({
      where: { restaurantId: user.restaurantId, isActive: true },
      orderBy: { name: 'asc' },
    });
    return reply.send({ success: true, data: discounts });
  });

  app.post('/', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, type, value, requiresManagerApproval, code, maxUses, expiresAt } = request.body as any;
    const discount = await prisma.discount.create({
      data: {
        restaurantId: user.restaurantId,
        name, type: type || 'PERCENTAGE', value,
        requiresManagerApproval: requiresManagerApproval || false,
        isActive: true, code, maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
    });
    return reply.code(201).send({ success: true, data: discount });
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, type, value, requiresManagerApproval, isActive, code, maxUses } = request.body as any;
    const discount = await prisma.discount.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(value !== undefined && { value }),
        ...(requiresManagerApproval !== undefined && { requiresManagerApproval }),
        ...(isActive !== undefined && { isActive }),
        ...(code !== undefined && { code }),
        ...(maxUses !== undefined && { maxUses }),
      },
    });
    return reply.send({ success: true, data: discount });
  });

  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    await prisma.discount.update({ where: { id }, data: { isActive: false } });
    return reply.send({ success: true, message: 'Discount deactivated' });
  });
}
