
import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';
import { WSEventType } from '@pos/shared';
import { wsManager } from '../websocket/manager';

export default async function paymentRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // Process payment
  app.post('/', auth, async (request, reply) => {
    const user = (request as any).user;
    const {
      orderId,
      method,
      amount,
      tipAmount = 0,
      referenceId,
      giftCardCode,
      notes,
    } = request.body as {
      orderId: string;
      method: string;
      amount: number;
      tipAmount?: number;
      referenceId?: string;
      giftCardCode?: string;
      notes?: string;
    };

    if (!orderId || !method || amount === undefined) {
      return reply.code(400).send({ success: false, error: 'orderId, method, and amount are required' });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId: user.restaurantId },
      include: { payments: true, items: { where: { isVoided: false } } },
    });
    if (!order) return reply.code(404).send({ success: false, error: 'Order not found' });
    if (order.status === 'VOID') {
      return reply.code(400).send({ success: false, error: 'Cannot pay a voided order' });
    }

    let giftCardId: string | undefined;

    // Handle gift card
    if (method === 'GIFT_CARD' && giftCardCode) {
      const giftCard = await prisma.giftCard.findFirst({
        where: { code: giftCardCode, restaurantId: user.restaurantId, isActive: true },
      });
      if (!giftCard) {
        return reply.code(404).send({ success: false, error: 'Gift card not found or inactive' });
      }
      if (giftCard.balance < amount) {
        return reply.code(400).send({
          success: false,
          error: `Insufficient gift card balance. Available: $${giftCard.balance.toFixed(2)}`,
        });
      }
      await prisma.giftCard.update({
        where: { id: giftCard.id },
        data: { balance: { decrement: amount } },
      });
      giftCardId = giftCard.id;
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        orderId,
        method: method as any,
        status: 'CAPTURED',
        amount,
        tipAmount,
        referenceId,
        giftCardId,
        notes,
        processedBy: user.name,
        processedAt: new Date(),
      },
    });

    // Check if order is fully paid
    const allPayments = [...order.payments, payment];
    const totalPaid = allPayments
      .filter((p) => p.status === 'CAPTURED')
      .reduce((s, p) => s + p.amount, 0);
    const totalTips = allPayments.reduce((s, p) => s + p.tipAmount, 0);

    const orderTotal = order.total;
    const isPaid = totalPaid >= orderTotal - 0.01; // allow $0.01 rounding

    if (isPaid) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          tipTotal: totalTips,
          total: order.total,
          paidAt: new Date(),
          closedAt: new Date(),
        },
      });

      // Free the table
      if (order.tableId) {
        await prisma.table.update({
          where: { id: order.tableId },
          data: { status: 'DIRTY' },
        });
        wsManager.broadcast(user.restaurantId, WSEventType.TABLE_STATUS_CHANGED, {
          tableId: order.tableId,
          status: 'DIRTY',
        });
      }
    } else {
      // Partial payment â update tip total
      await prisma.order.update({
        where: { id: orderId },
        data: { tipTotal: totalTips },
      });
    }

    await prisma.auditLog.create({
      data: {
        restaurantId: user.restaurantId,
        userId: user.id,
        userName: user.name,
        action: 'PAYMENT_PROCESSED',
        entityType: 'PAYMENT',
        entityId: payment.id,
        orderId,
        details: { method, amount, tipAmount, isPaid, giftCardCode },
      },
    });

    wsManager.broadcast(user.restaurantId, WSEventType.PAYMENT_CAPTURED, {
      orderId,
      payment,
      isPaid,
      totalPaid,
      remaining: Math.max(0, orderTotal - totalPaid),
    });

    return reply.code(201).send({
      success: true,
      data: {
        payment,
        isPaid,
        totalPaid,
        remaining: Math.max(0, orderTotal - totalPaid),
        change: totalPaid > orderTotal ? totalPaid - orderTotal : 0,
      },
    });
  });

  // Refund payment
  app.post('/:id/refund', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const { amount, reason } = request.body as { amount?: number; reason: string };

    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Manager approval required for refunds' });
    }

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return reply.code(404).send({ success: false, error: 'Payment not found' });
    if (payment.status !== 'CAPTURED') {
      return reply.code(400).send({ success: false, error: 'Only captured payments can be refunded' });
    }

    const refundAmount = amount || payment.amount;

    const refund = await prisma.payment.create({
      data: {
        orderId: payment.orderId,
        method: payment.method,
        status: 'REFUNDED',
        amount: -refundAmount,
        tipAmount: 0,
        referenceId: `REFUND-${payment.id}`,
        notes: reason,
        processedBy: user.name,
        processedAt: new Date(),
      },
    });

    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: 'REFUNDED' },
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: user.restaurantId,
        userId: user.id,
        userName: user.name,
        action: 'PAYMENT_REFUNDED',
        entityType: 'PAYMENT',
        entityId: id,
        orderId: payment.orderId,
        details: { refundAmount, reason, originalPaymentId: id },
      },
    });

    return reply.send({ success: true, data: refund });
  });

  // Get payments for order
  app.get('/order/:orderId', auth, async (request, reply) => {
    const { orderId } = request.params as { orderId: string };
    const user = (request as any).user;

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId: user.restaurantId },
    });
    if (!order) return reply.code(404).send({ success: false, error: 'Order not found' });

    const payments = await prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });

    return reply.send({ success: true, data: payments });
  });

  // Cash drawer reconciliation
  app.get('/cash-summary', auth, async (request, reply) => {
    const user = (request as any).user;
    const { locationId, date } = request.query as { locationId?: string; date?: string };

    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Access denied' });
    }

    const start = date ? new Date(date) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const payments = await prisma.payment.findMany({
      where: {
        order: {
          restaurantId: user.restaurantId,
          ...(locationId ? { locationId } : {}),
        },
        status: 'CAPTURED',
        processedAt: { gte: start, lte: end },
      },
      include: { order: { select: { id: true, total: true, type: true } } },
    });

    const summary = {
      cash: { count: 0, total: 0 },
      credit_card: { count: 0, total: 0 },
      debit_card: { count: 0, total: 0 },
      gift_card: { count: 0, total: 0 },
      comp: { count: 0, total: 0 },
      tips: 0,
      grandTotal: 0,
    };

    for (const p of payments) {
      const key = p.method.toLowerCase() as keyof typeof summary;
      if (key in summary && typeof summary[key] === 'object') {
        (summary[key] as any).count++;
        (summary[key] as any).total += p.amount;
      }
      summary.tips += p.tipAmount;
      summary.grandTotal += p.amount;
    }

    return reply.send({ success: true, data: summary });
  });

  // Check gift card balance
  app.get('/gift-cards/:code', auth, async (request, reply) => {
    const { code } = request.params as { code: string };
    const user = (request as any).user;

    const giftCard = await prisma.giftCard.findFirst({
      where: { code, restaurantId: user.restaurantId },
    });
    if (!giftCard) return reply.code(404).send({ success: false, error: 'Gift card not found' });

    return reply.send({
      success: true,
      data: {
        code: giftCard.code,
        balance: giftCard.balance,
        isActive: giftCard.isActive,
        expiresAt: giftCard.expiresAt,
      },
    });
  });
}
