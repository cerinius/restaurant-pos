
// ============================================================
// apps/api/src/routes/giftCards.ts
// ============================================================
import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';

export async function giftCardRoutesExport(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Access denied' });
    }
    const cards = await prisma.giftCard.findMany({
      where: { restaurantId: user.restaurantId },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: cards });
  });

  app.post('/', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { code, balance, expiresAt } = request.body as any;
    const card = await prisma.giftCard.create({
      data: {
        restaurantId: user.restaurantId,
        code: code || `GIFT-${Date.now()}`,
        balance,
        initialValue: balance,
        isActive: true,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
    });
    return reply.code(201).send({ success: true, data: card });
  });

  app.get('/:code/balance', auth, async (request, reply) => {
    const { code } = request.params as { code: string };
    const user = (request as any).user;
    const card = await prisma.giftCard.findFirst({
      where: { code, restaurantId: user.restaurantId },
    });
    if (!card) return reply.code(404).send({ success: false, error: 'Gift card not found' });
    return reply.send({ success: true, data: { code: card.code, balance: card.balance, isActive: card.isActive } });
  });

  app.patch('/:id/deactivate', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const card = await prisma.giftCard.update({ where: { id }, data: { isActive: false } });
    return reply.send({ success: true, data: card });
  });
}

export default giftCardRoutesExport;
