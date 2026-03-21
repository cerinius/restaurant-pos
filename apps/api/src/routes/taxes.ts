
import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';

export default async function taxRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/', auth, async (request, reply) => {
    const user = (request as any).user;
    const taxes = await prisma.tax.findMany({
      where: { restaurantId: user.restaurantId },
      orderBy: { name: 'asc' },
    });
    return reply.send({ success: true, data: taxes });
  });

  app.post('/', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, type, rate, isDefault, appliesToAll } = request.body as any;
    const tax = await prisma.tax.create({
      data: {
        restaurantId: user.restaurantId,
        name, type: type || 'PERCENTAGE',
        rate, isDefault: isDefault || false,
        appliesToAll: appliesToAll !== false,
        isActive: true,
      },
    });
    return reply.code(201).send({ success: true, data: tax });
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, type, rate, isDefault, appliesToAll, isActive } = request.body as any;
    const tax = await prisma.tax.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(rate !== undefined && { rate }),
        ...(isDefault !== undefined && { isDefault }),
        ...(appliesToAll !== undefined && { appliesToAll }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return reply.send({ success: true, data: tax });
  });

  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    await prisma.tax.update({ where: { id }, data: { isActive: false } });
    return reply.send({ success: true, message: 'Tax deactivated' });
  });
}
