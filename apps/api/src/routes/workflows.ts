
// ============================================================
// apps/api/src/routes/workflows.ts
// ============================================================
import { FastifyInstance as FF } from 'fastify';
import { prisma } from '@pos/db';

export default async function workflowRoutes(app: FF) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/', auth, async (request, reply) => {
    const user = (request as any).user;
    const workflows = await prisma.workflowConfig.findMany({
      where: { restaurantId: user.restaurantId },
      include: {
        quickButtons: { include: { menuItem: { select: { id: true, name: true, basePrice: true } } }, orderBy: { position: 'asc' } },
        autoPrompts: { include: { triggerItem: true, modifierGroup: true } },
        upsellRules: { include: { triggerItem: true, suggestedItems: true } },
      },
    });
    return reply.send({ success: true, data: workflows });
  });

  app.get('/role/:role', auth, async (request, reply) => {
    const user = (request as any).user;
    const { role } = request.params as { role: string };
    const workflow = await prisma.workflowConfig.findFirst({
      where: { restaurantId: user.restaurantId, role: role as any },
      include: {
        quickButtons: { include: { menuItem: { select: { id: true, name: true, basePrice: true, image: true } } }, orderBy: { position: 'asc' } },
        autoPrompts: { include: { triggerItem: true, modifierGroup: { include: { modifiers: true } } } },
        upsellRules: { include: { triggerItem: true, suggestedItems: true } },
      },
    });
    return reply.send({ success: true, data: workflow });
  });

  app.post('/', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { role, screenLayout, quickButtons, autoPrompts, upsellRules } = request.body as any;

    const workflow = await prisma.workflowConfig.upsert({
      where: { restaurantId_role: { restaurantId: user.restaurantId, role } },
      update: {
        screenLayout: screenLayout || {},
        quickButtons: {
          deleteMany: {},
          create: (quickButtons || []).map((qb: any) => ({
            menuItemId: qb.menuItemId,
            position: qb.position,
            color: qb.color,
          })),
        },
      },
      create: {
        restaurantId: user.restaurantId,
        role,
        screenLayout: screenLayout || {},
        quickButtons: {
          create: (quickButtons || []).map((qb: any) => ({
            menuItemId: qb.menuItemId,
            position: qb.position,
            color: qb.color,
          })),
        },
      },
      include: { quickButtons: true, autoPrompts: true, upsellRules: true },
    });

    return reply.send({ success: true, data: workflow });
  });
}
