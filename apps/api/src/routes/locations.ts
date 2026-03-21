
import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';

export default async function locationRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/', auth, async (request, reply) => {
    const user = (request as any).user;
    const locations = await prisma.location.findMany({
      where: { restaurantId: user.restaurantId, isActive: true },
      orderBy: { name: 'asc' },
    });
    return reply.send({ success: true, data: locations });
  });

  app.post('/', auth, async (request, reply) => {
    const user = (request as any).user;
    if (user.role !== 'OWNER') {
      return reply.code(403).send({ success: false, error: 'Only owners can create locations' });
    }
    const { name, address, phone, timezone, settings } = request.body as any;
    const location = await prisma.location.create({
      data: {
        restaurantId: user.restaurantId,
        name, address, phone,
        timezone: timezone || 'America/New_York',
        settings: settings || {},
        isActive: true,
      },
    });
    return reply.code(201).send({ success: true, data: location });
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, address, phone, timezone, isActive, settings } = request.body as any;
    const location = await prisma.location.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(timezone !== undefined && { timezone }),
        ...(isActive !== undefined && { isActive }),
        ...(settings !== undefined && { settings }),
      },
    });
    return reply.send({ success: true, data: location });
  });
}
