
import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';
import { WSEventType } from '@pos/shared';
import { wsManager } from '../websocket/manager';

export default async function kdsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // Get tickets for a station
  app.get('/tickets', auth, async (request, reply) => {
    const user = (request as any).user;
    const { stationId, status, locationId } = request.query as Record<string, string>;

    const tickets = await prisma.kDSTicket.findMany({
      where: {
        station: { restaurantId: user.restaurantId },
        ...(stationId ? { stationId } : {}),
        ...(locationId ? { station: { locationId } } : {}),
        status: status ? (status as any) : { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: {
        order: {
          select: {
            id: true,
            type: true,
            tableName: true,
            serverName: true,
            guestCount: true,
            createdAt: true,
            firedAt: true,
          },
        },
        station: { select: { id: true, name: true, color: true, type: true } },
      },
      orderBy: [{ priority: 'desc' }, { firedAt: 'asc' }],
    });

    const ticketsWithElapsed = tickets.map((t:any) => ({
      ...t,
      elapsedSeconds: t.firedAt
        ? Math.floor((Date.now() - t.firedAt.getTime()) / 1000)
        : 0,
    }));

    return reply.send({ success: true, data: ticketsWithElapsed });
  });

  // Get single ticket
  app.get('/tickets/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const ticket = await prisma.kDSTicket.findFirst({
      where: { id, station: { restaurantId: user.restaurantId } },
      include: {
        order: true,
        station: true,
      },
    });
    if (!ticket) return reply.code(404).send({ success: false, error: 'Ticket not found' });
    return reply.send({ success: true, data: ticket });
  });

  // BUMP ticket (mark as ready/done)
  app.post('/tickets/:id/bump', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const ticket = await prisma.kDSTicket.update({
      where: { id },
      data: { status: 'READY', bumpedAt: new Date() },
      include: { order: true, station: true },
    });

    // Update order items linked to this ticket
    const ticketItems = ticket.items as any[];
    if (ticketItems?.length > 0) {
      const itemIds = ticketItems.map((i: any) => i.id).filter(Boolean);
      if (itemIds.length > 0) {
        await prisma.orderItem.updateMany({
          where: { id: { in: itemIds } },
          data: { status: 'READY' },
        });
      }
    }

    // Check if all tickets for this order are bumped
    const allTickets = await prisma.kDSTicket.findMany({
      where: { orderId: ticket.orderId, status: { not: 'VOIDED' } },
    });
    const allReady = allTickets.every((t:any) => ['READY', 'SERVED'].includes(t.status));
    if (allReady) {
      await prisma.order.update({
        where: { id: ticket.orderId },
        data: { status: 'READY' },
      });
    }

    wsManager.broadcast(
      user.restaurantId,
      WSEventType.KDS_BUMP,
      { ticketId: id, orderId: ticket.orderId, stationId: ticket.stationId },
    );

    return reply.send({ success: true, data: ticket });
  });

  // RECALL ticket (un-bump)
  app.post('/tickets/:id/recall', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const ticket = await prisma.kDSTicket.update({
      where: { id },
      data: { status: 'IN_PROGRESS', bumpedAt: null, recalledAt: new Date() },
    });

    wsManager.broadcast(
      user.restaurantId,
      WSEventType.KDS_RECALL,
      { ticketId: id, orderId: ticket.orderId },
    );

    return reply.send({ success: true, data: ticket });
  });

  // Mark item within ticket as done
  app.patch('/tickets/:id/items/:itemId', auth, async (request, reply) => {
    const { id, itemId } = request.params as { id: string; itemId: string };
    const { status } = request.body as { status: string };
    const user = (request as any).user;

    const ticket = await prisma.kDSTicket.findUnique({ where: { id } });
    if (!ticket) return reply.code(404).send({ success: false, error: 'Ticket not found' });

    const items = (ticket.items as any[]).map((item: any) =>
      item.id === itemId ? { ...item, status } : item
    );

    const updatedTicket = await prisma.kDSTicket.update({
      where: { id },
      data: { items },
    });

    await prisma.orderItem.update({
      where: { id: itemId },
      data: { status: status as any },
    });

    wsManager.broadcast(user.restaurantId, WSEventType.ITEM_STATUS_CHANGED, {
      ticketId: id,
      itemId,
      status,
    });

    return reply.send({ success: true, data: updatedTicket });
  });

  // Set ticket priority (rush)
  app.patch('/tickets/:id/priority', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { priority } = request.body as { priority: string };
    const user = (request as any).user;

    const ticket = await prisma.kDSTicket.update({
      where: { id },
      data: { priority },
    });

    wsManager.broadcast(user.restaurantId, WSEventType.KDS_RUSH, {
      ticketId: id,
      orderId: ticket.orderId,
      priority,
    });

    return reply.send({ success: true, data: ticket });
  });

  // Get all stations
  app.get('/stations', auth, async (request, reply) => {
    const user = (request as any).user;
    const { locationId } = request.query as { locationId?: string };

    const stations = await prisma.station.findMany({
      where: {
        restaurantId: user.restaurantId,
        isActive: true,
        ...(locationId ? { locationId } : {}),
      },
      include: {
        categories: { include: { category: { select: { id: true, name: true } } } },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return reply.send({ success: true, data: stations });
  });

  // Get KDS stats
  app.get('/stats', auth, async (request, reply) => {
    const user = (request as any).user;
    const { locationId } = request.query as { locationId?: string };

    const pendingCount = await prisma.kDSTicket.count({
      where: {
        station: { restaurantId: user.restaurantId, ...(locationId ? { locationId } : {}) },
        status: 'PENDING',
      },
    });

    const inProgressCount = await prisma.kDSTicket.count({
      where: {
        station: { restaurantId: user.restaurantId, ...(locationId ? { locationId } : {}) },
        status: 'IN_PROGRESS',
      },
    });

    const now = new Date();
    const firedTickets = await prisma.kDSTicket.findMany({
      where: {
        station: { restaurantId: user.restaurantId },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        firedAt: { not: null },
      },
      select: { firedAt: true },
    });

    const avgTime =
      firedTickets.length > 0
        ? firedTickets.reduce((sum:number, t:any) => {
            return sum + (now.getTime() - (t.firedAt?.getTime() || now.getTime()));
          }, 0) /
          firedTickets.length /
          1000
        : 0;

    return reply.send({
      success: true,
      data: {
        pending: pendingCount,
        inProgress: inProgressCount,
        averageTicketSeconds: Math.round(avgTime),
        total: pendingCount + inProgressCount,
      },
    });
  });
}
