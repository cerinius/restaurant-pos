import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';
import { WSEventType } from '@pos/shared';

import { wsManager } from '../websocket/manager';

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

export default async function paymentRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

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
      return reply.code(400).send({
        success: false,
        error: 'orderId, method, and amount are required',
      });
    }

    const normalizedAmount = Number(amount);
    const normalizedTipAmount = Number(tipAmount || 0);

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return reply.code(400).send({
        success: false,
        error: 'Payment amount must be greater than zero',
      });
    }

    if (!Number.isFinite(normalizedTipAmount) || normalizedTipAmount < 0) {
      return reply.code(400).send({
        success: false,
        error: 'Tip amount must be zero or greater',
      });
    }

    if (normalizedTipAmount > normalizedAmount) {
      return reply.code(400).send({
        success: false,
        error: 'Tip cannot exceed the tendered amount',
      });
    }

    if (method === 'GIFT_CARD' && !giftCardCode) {
      return reply.code(400).send({
        success: false,
        error: 'Gift card code is required',
      });
    }

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const order = await tx.order.findFirst({
            where: { id: orderId, restaurantId: user.restaurantId },
            include: {
              items: { where: { isVoided: false } },
              payments: true,
              discounts: true,
              table: true,
              server: { select: { id: true, name: true, role: true } },
              kdsTickets: true,
            },
          });

          if (!order) {
            throw new Error('ORDER_NOT_FOUND');
          }

          if (order.status === 'VOID') {
            throw new Error('ORDER_VOID');
          }

          if (order.status === 'PAID') {
            throw new Error('ORDER_PAID');
          }

          const capturedPayments = order.payments.filter(
            (payment) => payment.status === 'CAPTURED',
          );
          const capturedTips = capturedPayments.reduce(
            (sum, payment) => sum + Number(payment.tipAmount || 0),
            0,
          );
          const capturedTendered = capturedPayments.reduce(
            (sum, payment) => sum + Number(payment.amount || 0),
            0,
          );
          const baseOrderTotal = Math.max(0, Number(order.total || 0) - capturedTips);
          const baseRemaining = Math.max(
            0,
            baseOrderTotal - (capturedTendered - capturedTips),
          );
          const paymentBaseAmount = normalizedAmount - normalizedTipAmount;

          if (paymentBaseAmount <= 0) {
            throw new Error('INVALID_PAYMENT');
          }

          if (method !== 'CASH' && paymentBaseAmount > baseRemaining + 0.01) {
            throw new Error('OVERPAYMENT');
          }

          let giftCardId: string | undefined;

          if (method === 'GIFT_CARD' && giftCardCode) {
            const giftCard = await tx.giftCard.findFirst({
              where: {
                code: giftCardCode,
                restaurantId: user.restaurantId,
                isActive: true,
              },
            });

            if (!giftCard) {
              throw new Error('GIFT_CARD_NOT_FOUND');
            }

            if (giftCard.balance < normalizedAmount) {
              throw new Error('GIFT_CARD_FUNDS');
            }

            await tx.giftCard.update({
              where: { id: giftCard.id },
              data: { balance: { decrement: normalizedAmount } },
            });

            giftCardId = giftCard.id;
          }

          const payment = await tx.payment.create({
            data: {
              orderId,
              method: method as any,
              status: 'CAPTURED',
              amount: normalizedAmount,
              tipAmount: normalizedTipAmount,
              referenceId,
              giftCardId,
              notes,
              processedBy: user.name,
              processedAt: new Date(),
            },
          });

          const nextTendered = roundCurrency(capturedTendered + normalizedAmount);
          const nextTipTotal = roundCurrency(capturedTips + normalizedTipAmount);
          const nextGrandTotal = roundCurrency(baseOrderTotal + nextTipTotal);
          const remaining = Math.max(0, roundCurrency(nextGrandTotal - nextTendered));
          const isPaid = remaining <= 0.01;

          const updatedOrder = await tx.order.update({
            where: { id: orderId },
            data: {
              tipTotal: nextTipTotal,
              total: nextGrandTotal,
              ...(isPaid
                ? {
                    status: 'PAID',
                    paidAt: new Date(),
                    closedAt: new Date(),
                  }
                : {}),
            },
            include: {
              items: { where: { isVoided: false } },
              payments: true,
              discounts: true,
              table: true,
              server: { select: { id: true, name: true, role: true } },
              kdsTickets: true,
            },
          });

          if (isPaid && order.tableId) {
            await tx.table.update({
              where: { id: order.tableId },
              data: { status: 'DIRTY' },
            });
          }

          await tx.auditLog.create({
            data: {
              restaurantId: user.restaurantId,
              userId: user.id,
              userName: user.name,
              action: 'PAYMENT_PROCESSED',
              entityType: 'PAYMENT',
              entityId: payment.id,
              orderId,
              details: {
                method,
                amount: normalizedAmount,
                tipAmount: normalizedTipAmount,
                isPaid,
                giftCardCode,
              },
            },
          });

          return {
            payment,
            order: updatedOrder,
            isPaid,
            totalTendered: nextTendered,
            remaining,
            change: Math.max(0, roundCurrency(nextTendered - nextGrandTotal)),
            tableId: order.tableId,
          };
        },
        { isolationLevel: 'Serializable' as any },
      );

      if (result.isPaid && result.tableId) {
        wsManager.broadcast(user.restaurantId, WSEventType.TABLE_STATUS_CHANGED, {
          tableId: result.tableId,
          status: 'DIRTY',
        });
      }

      wsManager.broadcast(user.restaurantId, WSEventType.PAYMENT_CAPTURED, {
        orderId,
        payment: result.payment,
        isPaid: result.isPaid,
        totalPaid: result.totalTendered,
        remaining: result.remaining,
        order: result.order,
      });

      return reply.code(201).send({
        success: true,
        data: {
          payment: result.payment,
          order: result.order,
          isPaid: result.isPaid,
          totalPaid: result.totalTendered,
          remaining: result.remaining,
          change: result.change,
        },
      });
    } catch (error: any) {
      if (error.message === 'ORDER_NOT_FOUND') {
        return reply.code(404).send({ success: false, error: 'Order not found' });
      }

      if (error.message === 'ORDER_VOID') {
        return reply.code(400).send({ success: false, error: 'Cannot pay a voided order' });
      }

      if (error.message === 'ORDER_PAID') {
        return reply.code(409).send({ success: false, error: 'Order is already paid' });
      }

      if (error.message === 'OVERPAYMENT') {
        return reply.code(400).send({
          success: false,
          error: 'Payment exceeds the remaining balance',
        });
      }

      if (error.message === 'INVALID_PAYMENT') {
        return reply.code(400).send({
          success: false,
          error: 'Payment must include a base amount',
        });
      }

      if (error.message === 'GIFT_CARD_NOT_FOUND') {
        return reply.code(404).send({
          success: false,
          error: 'Gift card not found or inactive',
        });
      }

      if (error.message === 'GIFT_CARD_FUNDS') {
        return reply.code(400).send({
          success: false,
          error: 'Insufficient gift card balance',
        });
      }

      throw error;
    }
  });

  app.post('/:id/refund', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const { amount, reason } = request.body as { amount?: number; reason: string };

    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({
        success: false,
        error: 'Manager approval required for refunds',
      });
    }

    if (!reason?.trim()) {
      return reply.code(400).send({ success: false, error: 'Refund reason is required' });
    }

    try {
      const refund = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findFirst({
          where: { id, order: { restaurantId: user.restaurantId } },
        });

        if (!payment) {
          throw new Error('PAYMENT_NOT_FOUND');
        }

        if (payment.status !== 'CAPTURED') {
          throw new Error('PAYMENT_NOT_CAPTURED');
        }

        const refundAmount = Number(amount || payment.amount);

        if (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > payment.amount) {
          throw new Error('INVALID_REFUND');
        }

        const refundPayment = await tx.payment.create({
          data: {
            orderId: payment.orderId,
            method: payment.method,
            status: 'REFUNDED',
            amount: -refundAmount,
            tipAmount: 0,
            referenceId: `REFUND-${payment.id}`,
            notes: reason.trim(),
            processedBy: user.name,
            processedAt: new Date(),
          },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: 'REFUNDED' },
        });

        await tx.auditLog.create({
          data: {
            restaurantId: user.restaurantId,
            userId: user.id,
            userName: user.name,
            action: 'PAYMENT_REFUNDED',
            entityType: 'PAYMENT',
            entityId: id,
            orderId: payment.orderId,
            details: {
              refundAmount,
              reason: reason.trim(),
              originalPaymentId: id,
            },
          },
        });

        return refundPayment;
      });

      return reply.send({ success: true, data: refund });
    } catch (error: any) {
      if (error.message === 'PAYMENT_NOT_FOUND') {
        return reply.code(404).send({ success: false, error: 'Payment not found' });
      }

      if (error.message === 'PAYMENT_NOT_CAPTURED') {
        return reply.code(400).send({
          success: false,
          error: 'Only captured payments can be refunded',
        });
      }

      if (error.message === 'INVALID_REFUND') {
        return reply.code(400).send({
          success: false,
          error: 'Refund amount is invalid',
        });
      }

      throw error;
    }
  });

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

    for (const payment of payments) {
      const key = payment.method.toLowerCase() as keyof typeof summary;
      if (key in summary && typeof summary[key] === 'object') {
        (summary[key] as any).count++;
        (summary[key] as any).total += payment.amount;
      }
      summary.tips += payment.tipAmount;
      summary.grandTotal += payment.amount;
    }

    return reply.send({ success: true, data: summary });
  });

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
