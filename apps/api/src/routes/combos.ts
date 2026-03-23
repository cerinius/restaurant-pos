
import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';

export default async function comboRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/', auth, async (request, reply) => {
    const user = (request as any).user;
    const combos = await prisma.combo.findMany({
      where: { restaurantId: user.restaurantId, isActive: true },
      include: {
        items: { include: { menuItem: { select: { id: true, name: true, basePrice: true, image: true } } } },
      },
    });
    return reply.send({ success: true, data: combos });
  });

  app.post('/', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, description, image, price, isActive, items } = request.body as any;
    const combo = await prisma.combo.create({
      data: {
        restaurantId: user.restaurantId,
        name, description, image, price,
        isActive: isActive !== false,
        items: {
          create: (items || []).map((i: any) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity || 1,
            allowSubstitutions: i.allowSubstitutions || false,
          })),
        },
      },
      include: { items: { include: { menuItem: true } } },
    });
    return reply.code(201).send({ success: true, data: combo });
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, description, image, price, isActive, items } = request.body as any;
    const combo = await prisma.combo.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
        ...(price !== undefined && { price }),
        ...(isActive !== undefined && { isActive }),
        ...(items !== undefined && {
          items: {
            deleteMany: {},
            ...(items.length > 0
              ? {
                  create: items.map((item: any) => ({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity || 1,
                    allowSubstitutions: item.allowSubstitutions || false,
                  })),
                }
              : {}),
          },
        }),
      },
      include: { items: { include: { menuItem: true } } },
    });
    return reply.send({ success: true, data: combo });
  });

  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    await prisma.combo.update({ where: { id }, data: { isActive: false } });
    return reply.send({ success: true, message: 'Combo deactivated' });
  });
}
