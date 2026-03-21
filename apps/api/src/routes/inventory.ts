
import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';

export default async function inventoryRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/', auth, async (request, reply) => {
    const user = (request as any).user;
    const { lowStock } = request.query as { lowStock?: string };

    const items = await prisma.inventoryItem.findMany({
      where: {
        restaurantId: user.restaurantId,
        ...(lowStock === 'true' ? { currentStock: { lte: prisma.inventoryItem.fields.minimumStock } } : {}),
      },
      include: { vendor: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });

    const lowStockItems = items.filter((i:any) => i.currentStock <= i.minimumStock);

    return reply.send({
      success: true,
      data: items,
      meta: { lowStockCount: lowStockItems.length },
    });
  });

  app.post('/', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, unit, currentStock, minimumStock, costPerUnit, vendorId } = request.body as any;
    const item = await prisma.inventoryItem.create({
      data: {
        restaurantId: user.restaurantId,
        name, unit: unit || 'unit',
        currentStock: currentStock || 0,
        minimumStock: minimumStock || 0,
        costPerUnit: costPerUnit || 0,
        vendorId,
      },
    });
    return reply.code(201).send({ success: true, data: item });
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, unit, currentStock, minimumStock, costPerUnit, vendorId } = request.body as any;
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(unit !== undefined && { unit }),
        ...(currentStock !== undefined && { currentStock }),
        ...(minimumStock !== undefined && { minimumStock }),
        ...(costPerUnit !== undefined && { costPerUnit }),
        ...(vendorId !== undefined && { vendorId }),
      },
    });
    return reply.send({ success: true, data: item });
  });

  // Restock
  app.post('/:id/restock', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { quantity, notes } = request.body as { quantity: number; notes?: string };

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        currentStock: { increment: quantity },
        lastRestockedAt: new Date(),
      },
    });

    await prisma.stockMovement.create({
      data: {
        inventoryItemId: id,
        type: 'RESTOCK',
        quantity,
        notes,
        createdBy: user.name,
      },
    });

    return reply.send({ success: true, data: item });
  });

  // Adjust stock
  app.post('/:id/adjust', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { newQuantity, notes, type = 'ADJUSTMENT' } = request.body as {
      newQuantity: number;
      notes?: string;
      type?: string;
    };

    const current = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!current) return reply.code(404).send({ success: false, error: 'Item not found' });

    const diff = newQuantity - current.currentStock;

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: { currentStock: newQuantity },
    });

    await prisma.stockMovement.create({
      data: {
        inventoryItemId: id,
        type,
        quantity: diff,
        notes,
        createdBy: user.name,
      },
    });

    return reply.send({ success: true, data: item });
  });

  // Get movements
  app.get('/:id/movements', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const movements = await prisma.stockMovement.findMany({
      where: { inventoryItemId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return reply.send({ success: true, data: movements });
  });

  // Low stock alert
  app.get('/alerts/low-stock', auth, async (request, reply) => {
    const user = (request as any).user;
    const items = await prisma.inventoryItem.findMany({
      where: { restaurantId: user.restaurantId },
      include: { vendor: { select: { id: true, name: true, email: true, phone: true } } },
    });
    const lowStock = items.filter((i:any) => i.currentStock <= i.minimumStock);
    return reply.send({ success: true, data: lowStock, count: lowStock.length });
  });
}
