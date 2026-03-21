
// ============================================================
// apps/api/src/routes/audit.ts
// ============================================================
import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';

export default async function auditRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Access denied' });
    }

    const {
      action, entityType, userId,
      dateFrom, dateTo,
      page = '1', limit = '100',
    } = request.query as Record<string, string>;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { restaurantId: user.restaurantId };
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  });
}
