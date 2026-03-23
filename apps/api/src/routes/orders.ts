import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';
import { WSEventType } from '@pos/shared';
import { wsManager } from '../websocket/manager';

export default async function orderRoutes(app: FastifyInstance) {
  const auth = {
    preHandler: [async (request: any, reply: any) => app.authenticate(request, reply)],
  };

  // ── GET all orders ────────────────────────────────────────
  app.get('/', auth, async (request, reply) => {
    const user = (request as any).user;
    const {
      status,
      type,
      tableId,
      serverId,
      locationId,
      page = '1',
      limit = '50',
      dateFrom,
      dateTo,
    } = request.query as Record<string, string>;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { restaurantId: user.restaurantId };
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (tableId) where.tableId = tableId;
    if (serverId) where.serverId = serverId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (!['OWNER', 'MANAGER', 'EXPO', 'KDS'].includes(user.role)) {
      where.serverId = user.id;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: { where: { isVoided: false } },
          payments: true,
          discounts: true,
          table: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.order.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  });

  // ── GET open orders ───────────────────────────────────────
  app.get('/open', auth, async (request, reply) => {
    const user = (request as any).user;
    const { locationId } = request.query as { locationId?: string };

    const orders = await prisma.order.findMany({
      where: {
        restaurantId: user.restaurantId,
        ...(locationId ? { locationId } : {}),
        status: { in: ['OPEN', 'SENT', 'IN_PROGRESS', 'READY'] },
      },
      include: {
        items: { where: { isVoided: false } },
        payments: true,
        table: { select: { name: true, section: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return reply.send({ success: true, data: orders });
  });

  // ── GET single order ──────────────────────────────────────
  app.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const order = await prisma.order.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: {
        items: {
          include: {
            menuItem: {
              select: { name: true, image: true, stationId: true },
            },
          },
          orderBy: [{ courseNumber: 'asc' }, { createdAt: 'asc' }],
        },
        payments: true,
        discounts: true,
        table: true,
        server: { select: { id: true, name: true, role: true } },
        kdsTickets: true,
      },
    });

    if (!order) {
      return reply.code(404).send({ success: false, error: 'Order not found' });
    }

    return reply.send({ success: true, data: order });
  });

  // ── CREATE order ──────────────────────────────────────────
  app.post('/', auth, async (request, reply) => {
    const user = (request as any).user;
    const {
      locationId,
      tableId,
      type = 'DINE_IN',
      guestCount,
      notes,
      customerName,
      customerPhone,
      customerEmail,
    } = request.body as any;

    if (!locationId) {
      return reply.code(400).send({ success: false, error: 'locationId is required' });
    }

    let tableName: string | undefined;

    if (tableId) {
      const table = await prisma.table.findUnique({ where: { id: tableId } });

      if (!table) {
        return reply.code(404).send({ success: false, error: 'Table not found' });
      }

      if (table.status === 'OCCUPIED') {
        return reply.code(409).send({ success: false, error: 'Table is already occupied' });
      }

      tableName = table.name;

      await prisma.table.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' },
      });
    }

    const order = await prisma.order.create({
      data: {
        restaurantId: user.restaurantId,
        locationId,
        tableId,
        tableName,
        serverId: user.id,
        serverName: user.name,
        type,
        guestCount,
        notes,
        customerName,
        customerPhone,
        customerEmail,
        status: 'OPEN',
        subtotal: 0,
        taxTotal: 0,
        discountTotal: 0,
        tipTotal: 0,
        total: 0,
      },
      include: { items: true, payments: true },
    });

    wsManager.broadcast(user.restaurantId, WSEventType.ORDER_CREATED, order, locationId);

    await prisma.auditLog.create({
      data: {
        restaurantId: user.restaurantId,
        userId: user.id,
        userName: user.name,
        action: 'ORDER_CREATED',
        entityType: 'ORDER',
        entityId: order.id,
        orderId: order.id,
        details: { type, tableId, locationId },
      },
    });

    return reply.code(201).send({ success: true, data: order });
  });

  // ── ADD items to order ────────────────────────────────────
  app.post('/:id/items', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const { items } = request.body as {
      items: Array<{
        menuItemId: string;
        quantity: number;
        modifiers?: Array<{
          modifierId: string;
          modifierName: string;
          groupName: string;
          priceAdjustment: number;
        }>;
        notes?: string;
        courseNumber?: number;
        seatNumber?: number;
      }>;
    };

    const order = await prisma.order.findFirst({
      where: { id, restaurantId: user.restaurantId },
    });

    if (!order) {
      return reply.code(404).send({ success: false, error: 'Order not found' });
    }

    if (order.status === 'PAID' || order.status === 'VOID') {
      return reply.code(400).send({ success: false, error: 'Cannot modify a closed order' });
    }

    for (const item of items) {
      const menuItem = await prisma.menuItem.findFirst({
        where: { id: item.menuItemId, restaurantId: user.restaurantId },
      });

      if (!menuItem) continue;

      if (menuItem.status === 'OUT_OF_STOCK') {
        return reply
          .code(400)
          .send({ success: false, error: `${menuItem.name} is out of stock (86'd)` });
      }

      const modifierTotal = (item.modifiers || []).reduce((sum, m) => sum + m.priceAdjustment, 0);
      const unitPrice = menuItem.basePrice + modifierTotal;
      const totalPrice = unitPrice * item.quantity;

      await prisma.orderItem.create({
        data: {
          orderId: id,
          menuItemId: item.menuItemId,
          menuItemName: menuItem.name,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
          modifiers: item.modifiers || [],
          notes: item.notes,
          courseNumber: item.courseNumber || 1,
          seatNumber: item.seatNumber,
          status: 'PENDING',
        },
      });
    }

    const updatedOrder = await recalculateOrder(id, user.restaurantId);
    wsManager.broadcast(user.restaurantId, WSEventType.ORDER_UPDATED, updatedOrder, order.locationId);

    return reply.send({ success: true, data: updatedOrder });
  });

  // ── UPDATE order item ─────────────────────────────────────
  app.put('/:id/items/:itemId', auth, async (request, reply) => {
    const { id, itemId } = request.params as { id: string; itemId: string };
    const user = (request as any).user;
    const { quantity, notes, courseNumber, seatNumber } = request.body as any;

    const item = await prisma.orderItem.findFirst({
      where: { id: itemId, orderId: id },
    });

    if (!item) {
      return reply.code(404).send({ success: false, error: 'Item not found' });
    }

    if (item.isFired) {
      return reply.code(400).send({ success: false, error: 'Cannot modify a fired item' });
    }

    await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        ...(quantity !== undefined && { quantity, totalPrice: item.unitPrice * quantity }),
        ...(notes !== undefined && { notes }),
        ...(courseNumber !== undefined && { courseNumber }),
        ...(seatNumber !== undefined && { seatNumber }),
      },
    });

    const updatedOrder = await recalculateOrder(id, user.restaurantId);
    wsManager.broadcast(user.restaurantId, WSEventType.ORDER_UPDATED, updatedOrder);

    return reply.send({ success: true, data: updatedOrder });
  });

  // ── VOID item ─────────────────────────────────────────────
  app.delete('/:id/items/:itemId', auth, async (request, reply) => {
    const { id, itemId } = request.params as { id: string; itemId: string };
    const user = (request as any).user;
    const { reason } = request.body as { reason?: string };

    const item = await prisma.orderItem.findFirst({
      where: { id: itemId, orderId: id },
    });

    if (!item) {
      return reply.code(404).send({ success: false, error: 'Item not found' });
    }

    if (item.isFired && !['OWNER', 'MANAGER'].includes(user.role)) {
      return reply
        .code(403)
        .send({ success: false, error: 'Manager approval required to void fired items' });
    }

    if (item.isFired && !reason?.trim()) {
      return reply
        .code(400)
        .send({ success: false, error: 'A void reason is required for fired items' });
    }

    await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        isVoided: true,
        voidReason: reason?.trim() || 'Voided by staff',
        voidedBy: user.name,
        voidedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: user.restaurantId,
        userId: user.id,
        userName: user.name,
        action: 'ITEM_VOIDED',
        entityType: 'ORDER_ITEM',
        entityId: itemId,
        orderId: id,
        details: { itemName: item.menuItemName, reason, wasFired: item.isFired },
      },
    });

    const updatedOrder = await recalculateOrder(id, user.restaurantId);
    wsManager.broadcast(user.restaurantId, WSEventType.ORDER_UPDATED, updatedOrder);

    return reply.send({ success: true, data: updatedOrder });
  });

  // ── FIRE order ────────────────────────────────────────────
  app.post('/:id/fire', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const { courseNumber, priority = 'normal' } = request.body as {
      courseNumber?: number;
      priority?: string;
    };

    const order = await prisma.order.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: {
        items: {
          where: {
            isVoided: false,
            isFired: false,
            ...(courseNumber ? { courseNumber } : {}),
          },
          include: {
            menuItem: { include: { category: true } },
          },
        },
      },
    });

    if (!order) {
      return reply.code(404).send({ success: false, error: 'Order not found' });
    }

    if (order.items.length === 0) {
      return reply.code(400).send({ success: false, error: 'No unfired items to send' });
    }

    const stationGroups: Map<string, typeof order.items> = new Map();

    for (const item of order.items) {
      const stationId = item.menuItem.stationId || 'default';
      if (!stationGroups.has(stationId)) stationGroups.set(stationId, []);
      stationGroups.get(stationId)!.push(item);
    }

    const now = new Date();

    const updatedOrder = await prisma.$transaction(async (tx) => {
      for (const [stationId, stationItems] of stationGroups) {
        if (stationId === 'default') continue;

        await tx.kDSTicket.create({
          data: {
            orderId: id,
            stationId,
            status: 'PENDING',
            priority,
            courseNumber: courseNumber || 1,
            firedAt: now,
            items: stationItems.map((item: any) => ({
              id: item.id,
              name: item.menuItemName,
              quantity: item.quantity,
              modifiers: Array.isArray(item.modifiers)
                ? (item.modifiers as any[]).map((modifier: any) => modifier.modifierName)
                : [],
              notes: item.notes,
              seatNumber: item.seatNumber,
              status: 'PENDING',
            })),
          },
        });
      }

      await tx.orderItem.updateMany({
        where: {
          orderId: id,
          isVoided: false,
          isFired: false,
          ...(courseNumber ? { courseNumber } : {}),
        },
        data: { isFired: true, firedAt: now, status: 'IN_PROGRESS' },
      });

      await tx.order.update({
        where: { id },
        data: { status: 'SENT', firedAt: now },
      });

      return tx.order.findUnique({
        where: { id },
        include: { items: true, payments: true },
      });
    });

    wsManager.broadcast(user.restaurantId, WSEventType.ORDER_FIRED, updatedOrder, order.locationId);

    return reply.send({ success: true, data: updatedOrder, message: 'Order fired to kitchen' });
  });

  // ── ADD discount ──────────────────────────────────────────
  app.post('/:id/discounts', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const { discountId, name, type, value } = request.body as {
      discountId?: string;
      name: string;
      type: 'PERCENTAGE' | 'FLAT';
      value: number;
    };

    const order = await prisma.order.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: {
        items: {
          where: { isVoided: false },
        },
      },
    });

    if (!order) {
      return reply.code(404).send({ success: false, error: 'Order not found' });
    }

    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply
        .code(403)
        .send({ success: false, error: 'Manager approval required to apply discounts' });
    }

    const subtotal = order.items.reduce(
      (sum: number, item: any) => sum + Number(item.totalPrice || 0),
      0,
    );

    const rawAmount =
      type === 'PERCENTAGE' ? subtotal * (Number(value) / 100) : Number(value);

    const amount = Number(Math.min(rawAmount, subtotal).toFixed(2));

    await prisma.orderDiscount.create({
      data: {
        order: {
          connect: { id },
        },
        ...(discountId
          ? {
              discount: {
                connect: { id: discountId },
              },
            }
          : {}),
        name,
        type,
        value,
        amount,
        appliedBy: user.name,
      },
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: user.restaurantId,
        userId: user.id,
        userName: user.name,
        action: 'DISCOUNT_APPLIED',
        entityType: 'ORDER',
        entityId: id,
        orderId: id,
        details: { discountId, name, type, value, amount },
      },
    });

    const updatedOrder = await recalculateOrder(id, user.restaurantId);
    wsManager.broadcast(user.restaurantId, WSEventType.ORDER_UPDATED, updatedOrder, order.locationId);

    return reply.send({ success: true, data: updatedOrder });
  });

  // ── VOID order ────────────────────────────────────────────
  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const { reason } = request.body as { reason?: string };

    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply
        .code(403)
        .send({ success: false, error: 'Manager approval required to void orders' });
    }

    if (!reason?.trim()) {
      return reply.code(400).send({ success: false, error: 'A void reason is required' });
    }

    const order = await prisma.order.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: { items: true },
    });

    if (!order) {
      return reply.code(404).send({ success: false, error: 'Order not found' });
    }

    await prisma.orderItem.updateMany({
      where: { orderId: id, isVoided: false },
      data: {
        isVoided: true,
        voidReason: reason.trim(),
        voidedBy: user.name,
        voidedAt: new Date(),
      },
    });

    await prisma.order.update({
      where: { id },
      data: {
          status: 'VOID',
          notes: `${order.notes || ''}\nVoid reason: ${reason.trim()}`.trim(),
      },
    });

    if (order.tableId) {
      const openOrdersAtTable = await prisma.order.count({
        where: {
          tableId: order.tableId,
          id: { not: id },
          status: { in: ['OPEN', 'SENT', 'IN_PROGRESS', 'READY'] },
        },
      });

      if (openOrdersAtTable === 0) {
        await prisma.table.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        restaurantId: user.restaurantId,
        userId: user.id,
        userName: user.name,
        action: 'ORDER_VOIDED',
        entityType: 'ORDER',
        entityId: id,
        orderId: id,
        details: { reason },
      },
    });

    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: true, discounts: true },
    });

    wsManager.broadcast(user.restaurantId, WSEventType.ORDER_UPDATED, updatedOrder, order.locationId);

    return reply.send({ success: true, data: updatedOrder });
  });
}

async function recalculateOrder(orderId: string, restaurantId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
    include: {
      items: { where: { isVoided: false } },
      discounts: true,
      payments: true,
      table: true,
      server: { select: { id: true, name: true, role: true } },
      kdsTickets: true,
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  const subtotal = Number(
    order.items.reduce((sum: number, item: any) => sum + Number(item.totalPrice || 0), 0).toFixed(2),
  );

  let discountTotal = 0;

  for (const discount of order.discounts) {
    const value = Number(discount.value || 0);

    const amount =
      discount.type === 'PERCENTAGE'
        ? Number((subtotal * (value / 100)).toFixed(2))
        : Number(Math.min(value, subtotal).toFixed(2));

    discountTotal += amount;

    await prisma.orderDiscount.update({
      where: { id: discount.id },
      data: { amount },
    });
  }

  discountTotal = Number(Math.min(discountTotal, subtotal).toFixed(2));

  const taxableAmount = Number(Math.max(0, subtotal - discountTotal).toFixed(2));
  const taxTotal = Number((taxableAmount * 0.13).toFixed(2));
  const paidTipTotal = Number(
    order.payments.reduce((sum: number, payment: any) => sum + Number(payment.tipAmount || 0), 0).toFixed(2),
  );
  const total = Number((taxableAmount + taxTotal + paidTipTotal).toFixed(2));

  await prisma.order.update({
    where: { id: orderId },
    data: {
      subtotal,
      discountTotal,
      taxTotal,
      tipTotal: paidTipTotal,
      total,
    },
  });

  const updatedOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { where: { isVoided: false } },
      payments: true,
      discounts: true,
      table: true,
      server: { select: { id: true, name: true, role: true } },
      kdsTickets: true,
    },
  });

  return updatedOrder;
}
