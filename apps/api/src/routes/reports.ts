
import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';

export default async function reportRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  const managerAuth = {
    preHandler: [
      app.authenticate,
      async (request: any, reply: any) => {
        if (!['OWNER', 'MANAGER'].includes(request.user?.role)) {
          return reply.code(403).send({ success: false, error: 'Manager access required' });
        }
      },
    ],
  };

  // Sales summary
  app.get('/sales', managerAuth, async (request, reply) => {
    const user = (request as any).user;
    const { dateFrom, dateTo, locationId, groupBy = 'day' } = request.query as Record<string, string>;

    const start = dateFrom ? new Date(dateFrom) : (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
    const end = dateTo ? new Date(dateTo) : (() => { const d = new Date(); d.setHours(23,59,59,999); return d; })();

    const where: any = {
      restaurantId: user.restaurantId,
      status: { in: ['PAID', 'REFUNDED'] },
      createdAt: { gte: start, lte: end },
    };
    if (locationId) where.locationId = locationId;

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { where: { isVoided: false } },
        payments: { where: { status: 'CAPTURED' } },
        discounts: true,
      },
    });

    const totalSales = orders.reduce((s, o) => s + o.total, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const totalTips = orders.reduce((s, o) => s + o.tipTotal, 0);
    const totalDiscounts = orders.reduce((s, o) => s + o.discountTotal, 0);

    // Refunded orders
    const refundedOrders = orders.filter((o) => o.status === 'REFUNDED');
    const totalRefunds = refundedOrders.reduce((s, o) => s + o.total, 0);

    // Sales by hour
    const hourlySales: Record<number, { sales: number; orders: number }> = {};
    for (let h = 0; h < 24; h++) hourlySales[h] = { sales: 0, orders: 0 };
    orders.forEach((o) => {
      const hour = new Date(o.createdAt).getHours();
      hourlySales[hour].sales += o.total;
      hourlySales[hour].orders++;
    });

    // Top items
    const itemMap: Record<string, { name: string; category: string; quantity: number; revenue: number }> = {};
    orders.forEach((o) => {
      o.items.forEach((item) => {
        if (!itemMap[item.menuItemId]) {
          itemMap[item.menuItemId] = { name: item.menuItemName, category: '', quantity: 0, revenue: 0 };
        }
        itemMap[item.menuItemId].quantity += item.quantity;
        itemMap[item.menuItemId].revenue += item.totalPrice;
      });
    });

    const topItems = Object.entries(itemMap)
      .map(([itemId, data]) => ({ itemId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    // Payment breakdown
    const paymentMap: Record<string, { amount: number; count: number }> = {};
    orders.forEach((o) => {
      o.payments.forEach((p) => {
        if (!paymentMap[p.method]) paymentMap[p.method] = { amount: 0, count: 0 };
        paymentMap[p.method].amount += p.amount;
        paymentMap[p.method].count++;
      });
    });

    // Order type breakdown
    const typeMap: Record<string, { amount: number; count: number }> = {};
    orders.forEach((o) => {
      if (!typeMap[o.type]) typeMap[o.type] = { amount: 0, count: 0 };
      typeMap[o.type].amount += o.total;
      typeMap[o.type].count++;
    });

    // Day-by-day breakdown
    const dailyMap: Record<string, { sales: number; orders: number; date: string }> = {};
    orders.forEach((o) => {
      const dateKey = new Date(o.createdAt).toISOString().split('T')[0];
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { date: dateKey, sales: 0, orders: 0 };
      dailyMap[dateKey].sales += o.total;
      dailyMap[dateKey].orders++;
    });

    return reply.send({
      success: true,
      data: {
        period: { from: start.toISOString(), to: end.toISOString() },
        totalSales: parseFloat(totalSales.toFixed(2)),
        totalOrders,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        totalTips: parseFloat(totalTips.toFixed(2)),
        totalDiscounts: parseFloat(totalDiscounts.toFixed(2)),
        totalRefunds: parseFloat(totalRefunds.toFixed(2)),
        salesByHour: Object.entries(hourlySales).map(([hour, data]) => ({
          hour: parseInt(hour),
          ...data,
          sales: parseFloat(data.sales.toFixed(2)),
        })),
        topItems,
        paymentBreakdown: Object.entries(paymentMap).map(([method, data]) => ({
          method,
          amount: parseFloat(data.amount.toFixed(2)),
          count: data.count,
        })),
        orderTypeBreakdown: Object.entries(typeMap).map(([type, data]) => ({
          type,
          amount: parseFloat(data.amount.toFixed(2)),
          count: data.count,
        })),
        dailyBreakdown: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)),
      },
    });
  });

  // Staff performance
  app.get('/staff', managerAuth, async (request, reply) => {
    const user = (request as any).user;
    const { dateFrom, dateTo, locationId } = request.query as Record<string, string>;

    const start = dateFrom ? new Date(dateFrom) : (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
    const end = dateTo ? new Date(dateTo) : (() => { const d = new Date(); d.setHours(23,59,59,999); return d; })();

    const orders = await prisma.order.findMany({
      where: {
        restaurantId: user.restaurantId,
        status: { in: ['PAID', 'REFUNDED'] },
        createdAt: { gte: start, lte: end },
        ...(locationId ? { locationId } : {}),
      },
      include: { payments: true, discounts: true },
    });

    const voids = await prisma.auditLog.findMany({
      where: {
        restaurantId: user.restaurantId,
        action: { in: ['ITEM_VOIDED', 'ORDER_VOIDED'] },
        createdAt: { gte: start, lte: end },
      },
    });

    const staffMap: Record<string, {
      userId: string; name: string; role: string;
      totalSales: number; totalOrders: number; totalTips: number;
      totalDiscounts: number; totalVoids: number;
    }> = {};

    orders.forEach((o) => {
      if (!staffMap[o.serverId]) {
        staffMap[o.serverId] = {
          userId: o.serverId,
          name: o.serverName,
          role: '',
          totalSales: 0, totalOrders: 0, totalTips: 0,
          totalDiscounts: 0, totalVoids: 0,
        };
      }
      staffMap[o.serverId].totalSales += o.total;
      staffMap[o.serverId].totalOrders++;
      staffMap[o.serverId].totalTips += o.tipTotal;
      staffMap[o.serverId].totalDiscounts += o.discountTotal;
    });

    voids.forEach((v) => {
      if (v.userId && staffMap[v.userId]) {
        staffMap[v.userId].totalVoids++;
      }
    });

    // Enrich with roles
    const userIds = Object.keys(staffMap);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, role: true },
    });
    users.forEach((u) => {
      if (staffMap[u.id]) staffMap[u.id].role = u.role;
    });

    const report = Object.values(staffMap).map((s) => ({
      ...s,
      totalSales: parseFloat(s.totalSales.toFixed(2)),
      totalTips: parseFloat(s.totalTips.toFixed(2)),
      totalDiscounts: parseFloat(s.totalDiscounts.toFixed(2)),
    }));

    return reply.send({ success: true, data: report });
  });

  // Item mix report
  app.get('/item-mix', managerAuth, async (request, reply) => {
    const user = (request as any).user;
    const { dateFrom, dateTo, categoryId } = request.query as Record<string, string>;

    const start = dateFrom ? new Date(dateFrom) : (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
    const end = dateTo ? new Date(dateTo) : (() => { const d = new Date(); d.setHours(23,59,59,999); return d; })();

    const orderItems = await prisma.orderItem.findMany({
      where: {
        isVoided: false,
        order: {
          restaurantId: user.restaurantId,
          status: { in: ['PAID', 'REFUNDED'] },
          createdAt: { gte: start, lte: end },
        },
        ...(categoryId ? { menuItem: { categoryId } } : {}),
      },
      include: {
        menuItem: { include: { category: { select: { id: true, name: true } } } },
      },
    });

    const itemMap: Record<string, {
      itemId: string; name: string; categoryId: string; categoryName: string;
      quantity: number; revenue: number; avgPrice: number;
    }> = {};

    orderItems.forEach((oi) => {
      const key = oi.menuItemId;
      if (!itemMap[key]) {
        itemMap[key] = {
          itemId: oi.menuItemId,
          name: oi.menuItemName,
          categoryId: oi.menuItem.categoryId,
          categoryName: oi.menuItem.category.name,
          quantity: 0,
          revenue: 0,
          avgPrice: 0,
        };
      }
      itemMap[key].quantity += oi.quantity;
      itemMap[key].revenue += oi.totalPrice;
    });

    const totalRevenue = Object.values(itemMap).reduce((s, i) => s + i.revenue, 0);

    const items = Object.values(itemMap)
      .map((item) => ({
        ...item,
        avgPrice: item.quantity > 0 ? parseFloat((item.revenue / item.quantity).toFixed(2)) : 0,
        revenue: parseFloat(item.revenue.toFixed(2)),
        revenueShare: totalRevenue > 0 ? parseFloat(((item.revenue / totalRevenue) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return reply.send({ success: true, data: items });
  });

  // Voids & discounts report
  app.get('/voids-discounts', managerAuth, async (request, reply) => {
    const user = (request as any).user;
    const { dateFrom, dateTo } = request.query as Record<string, string>;

    const start = dateFrom ? new Date(dateFrom) : (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
    const end = dateTo ? new Date(dateTo) : (() => { const d = new Date(); d.setHours(23,59,59,999); return d; })();

    const [voidedItems, orderDiscounts] = await Promise.all([
      prisma.orderItem.findMany({
        where: {
          isVoided: true,
          voidedAt: { gte: start, lte: end },
          order: { restaurantId: user.restaurantId },
        },
        include: { order: { select: { id: true, tableName: true, serverName: true } } },
        orderBy: { voidedAt: 'desc' },
      }),
      prisma.orderDiscount.findMany({
        where: {
          order: {
            restaurantId: user.restaurantId,
            createdAt: { gte: start, lte: end },
          },
        },
        include: { order: { select: { id: true, tableName: true, serverName: true } } },
        orderBy: { order: { createdAt: 'desc' } },
      }),
    ]);

    const totalVoidValue = voidedItems.reduce((s, i) => s + i.totalPrice, 0);
    const totalDiscountValue = orderDiscounts.reduce((s, d) => s + d.amount, 0);

    return reply.send({
      success: true,
      data: {
        voids: {
          count: voidedItems.length,
          totalValue: parseFloat(totalVoidValue.toFixed(2)),
          items: voidedItems,
        },
        discounts: {
          count: orderDiscounts.length,
          totalValue: parseFloat(totalDiscountValue.toFixed(2)),
          items: orderDiscounts,
        },
      },
    });
  });

  // End-of-day summary
  app.get('/end-of-day', managerAuth, async (request, reply) => {
    const user = (request as any).user;
    const { date, locationId } = request.query as Record<string, string>;

    const day = date ? new Date(date) : new Date();
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const [orders, voids, auditLogs] = await Promise.all([
      prisma.order.findMany({
        where: {
          restaurantId: user.restaurantId,
          createdAt: { gte: day, lte: dayEnd },
          ...(locationId ? { locationId } : {}),
        },
        include: { payments: true, items: { where: { isVoided: false } } },
      }),
      prisma.orderItem.findMany({
        where: {
          isVoided: true,
          voidedAt: { gte: day, lte: dayEnd },
          order: { restaurantId: user.restaurantId },
        },
      }),
      prisma.auditLog.findMany({
        where: {
          restaurantId: user.restaurantId,
          action: { in: ['DISCOUNT_APPLIED', 'ORDER_VOIDED', 'PAYMENT_REFUNDED'] },
          createdAt: { gte: day, lte: dayEnd },
        },
      }),
    ]);

    const paidOrders = orders.filter((o) => o.status === 'PAID');
    const openOrders = orders.filter((o) => ['OPEN', 'SENT', 'IN_PROGRESS'].includes(o.status));
    const voidedOrders = orders.filter((o) => o.status === 'VOID');

    const grossSales = paidOrders.reduce((s, o) => s + o.subtotal, 0);
    const netSales = paidOrders.reduce((s, o) => s + o.total, 0);
    const totalTax = paidOrders.reduce((s, o) => s + o.taxTotal, 0);
    const totalTips = paidOrders.reduce((s, o) => s + o.tipTotal, 0);
    const totalDiscounts = paidOrders.reduce((s, o) => s + o.discountTotal, 0);

    const cashTotal = paidOrders.flatMap((o) => o.payments)
      .filter((p) => p.method === 'CASH' && p.status === 'CAPTURED')
      .reduce((s, p) => s + p.amount, 0);

    const cardTotal = paidOrders.flatMap((o) => o.payments)
      .filter((p) => ['CREDIT_CARD', 'DEBIT_CARD'].includes(p.method) && p.status === 'CAPTURED')
      .reduce((s, p) => s + p.amount, 0);

    return reply.send({
      success: true,
      data: {
        date: day.toISOString().split('T')[0],
        summary: {
          grossSales: parseFloat(grossSales.toFixed(2)),
          netSales: parseFloat(netSales.toFixed(2)),
          totalTax: parseFloat(totalTax.toFixed(2)),
          totalTips: parseFloat(totalTips.toFixed(2)),
          totalDiscounts: parseFloat(totalDiscounts.toFixed(2)),
          cashTotal: parseFloat(cashTotal.toFixed(2)),
          cardTotal: parseFloat(cardTotal.toFixed(2)),
        },
        counts: {
          totalOrders: orders.length,
          paidOrders: paidOrders.length,
          openOrders: openOrders.length,
          voidedOrders: voidedOrders.length,
          voidedItems: voids.length,
        },
        auditEvents: auditLogs.length,
      },
    });
  });
}
