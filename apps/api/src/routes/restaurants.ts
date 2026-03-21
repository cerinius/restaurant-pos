
import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';

export default async function restaurantRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (user.restaurantId !== id && user.role !== 'OWNER') {
      return reply.code(403).send({ success: false, error: 'Access denied' });
    }
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: { locations: true },
    });
    if (!restaurant) return reply.code(404).send({ success: false, error: 'Restaurant not found' });
    return reply.send({ success: true, data: restaurant });
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (user.restaurantId !== id || user.role !== 'OWNER') {
      return reply.code(403).send({ success: false, error: 'Only owners can update restaurant settings' });
    }
    const { name, address, phone, email, timezone, currency, serviceMode, settings, logo } = request.body as any;

    const updated = await prisma.restaurant.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(timezone !== undefined && { timezone }),
        ...(currency !== undefined && { currency }),
        ...(serviceMode !== undefined && { serviceMode }),
        ...(settings !== undefined && { settings }),
        ...(logo !== undefined && { logo }),
      },
    });

    return reply.send({ success: true, data: updated });
  });

  app.get('/slug/:slug', async (request, reply) => {
  const { slug } = request.params as { slug: string };

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      locations: true,
    },
  });

  if (!restaurant) {
    return reply.code(404).send({
      success: false,
      error: 'Restaurant not found',
    });
  }

  return {
    success: true,
    data: {
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.name,
      locations: restaurant.locations,
    },
  };
});
}
