import { FastifyInstance } from 'fastify';
import { prisma as _prisma } from '@pos/db';
import { wsManager } from '../websocket/manager';

// Cast to any so TypeScript doesn't reject models added after the last
// `prisma generate`. Once you run `prisma generate` in packages/db the
// cast can be removed.
const prisma = _prisma as any;

export default async function supportRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // ── Tickets ─────────────────────────────────────────────────────────────────

  // POST /api/support/tickets — create a new ticket + conversation
  app.post('/tickets', auth, async (request, reply) => {
    const user = (request as any).user;
    const {
      subject,
      channel = 'CHAT',
      priority = 'NORMAL',
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      body,
    } = request.body as {
      subject: string;
      channel?: string;
      priority?: string;
      customerId?: string;
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      body?: string;
    };

    if (!subject) {
      return reply.code(400).send({ success: false, error: 'subject is required' });
    }

    // Upsert customer record
    let customer = customerId
      ? await prisma.supportCustomer.findFirst({
          where: { id: customerId, restaurantId: user.restaurantId },
        })
      : null;

    if (!customer && (customerName || customerEmail || customerPhone)) {
      customer = await prisma.supportCustomer.create({
        data: {
          restaurantId: user.restaurantId,
          displayName: customerName || 'Guest',
          email: customerEmail,
          phone: customerPhone,
        },
      });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        restaurantId: user.restaurantId,
        subject,
        channel: channel as any,
        priority: priority as any,
        status: 'OPEN',
        customerId: customer?.id,
        conversation: {
          create: {
            status: 'ACTIVE',
            messages: body
              ? {
                  create: {
                    senderType: 'CUSTOMER',
                    senderId: customer?.id || user.id,
                    body,
                  },
                }
              : undefined,
          },
        },
      },
      include: {
        customer: true,
        conversation: { include: { messages: true } },
      },
    });

    // Notify agents via WS
    wsManager.broadcast(user.restaurantId, 'SUPPORT_TICKET_UPDATE' as any, {
      action: 'created',
      ticket,
    });

    return reply.code(201).send({ success: true, data: ticket });
  });

  // GET /api/support/tickets — list tickets for restaurant
  app.get('/tickets', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Access denied' });
    }

    const {
      status,
      channel,
      assignedAgentId,
      page = '1',
      limit = '20',
    } = request.query as {
      status?: string;
      channel?: string;
      assignedAgentId?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { restaurantId: user.restaurantId };
    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (assignedAgentId) where.assignedAgentId = assignedAgentId;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          customer: true,
          assignedAgent: true,
          conversation: {
            include: {
              messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: tickets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  });

  // GET /api/support/tickets/:id — get single ticket with conversation
  app.get('/tickets/:id', auth, async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const ticket = await prisma.supportTicket.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: {
        customer: true,
        assignedAgent: true,
        conversation: {
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
          },
        },
        callLogs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!ticket) {
      return reply.code(404).send({ success: false, error: 'Ticket not found' });
    }

    return reply.send({ success: true, data: ticket });
  });

  // PATCH /api/support/tickets/:id/status — update ticket status
  app.patch('/tickets/:id/status', auth, async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    const validStatuses = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      return reply.code(400).send({ success: false, error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: { id, restaurantId: user.restaurantId },
    });
    if (!ticket) {
      return reply.code(404).send({ success: false, error: 'Ticket not found' });
    }

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: status as any,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : undefined,
        conversation: status === 'CLOSED' || status === 'RESOLVED'
          ? { update: { status: 'ENDED' } }
          : undefined,
      },
      include: { customer: true, assignedAgent: true },
    });

    wsManager.broadcast(user.restaurantId, 'SUPPORT_TICKET_UPDATE' as any, {
      action: 'status_changed',
      ticket: updated,
    });

    return reply.send({ success: true, data: updated });
  });

  // POST /api/support/tickets/:id/assign — assign to agent
  app.post('/tickets/:id/assign', auth, async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { agentId } = request.body as { agentId: string };

    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Access denied' });
    }

    const [ticket, agent] = await Promise.all([
      prisma.supportTicket.findFirst({ where: { id, restaurantId: user.restaurantId } }),
      prisma.supportAgent.findFirst({ where: { id: agentId, restaurantId: user.restaurantId } }),
    ]);

    if (!ticket) return reply.code(404).send({ success: false, error: 'Ticket not found' });
    if (!agent) return reply.code(404).send({ success: false, error: 'Agent not found' });

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: { assignedAgentId: agentId },
      include: { customer: true, assignedAgent: true },
    });

    wsManager.broadcast(user.restaurantId, 'SUPPORT_TICKET_UPDATE' as any, {
      action: 'assigned',
      ticket: updated,
    });

    return reply.send({ success: true, data: updated });
  });

  // ── Messages ─────────────────────────────────────────────────────────────────

  // GET /api/support/tickets/:id/messages
  app.get('/tickets/:id/messages', auth, async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { page = '1', limit = '50' } = request.query as { page?: string; limit?: string };

    const ticket = await prisma.supportTicket.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: { conversation: true },
    });

    if (!ticket) return reply.code(404).send({ success: false, error: 'Ticket not found' });
    if (!ticket.conversation) return reply.send({ success: true, data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } });

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [messages, total] = await Promise.all([
      prisma.supportMessage.findMany({
        where: { conversationId: ticket.conversation.id },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.supportMessage.count({ where: { conversationId: ticket.conversation.id } }),
    ]);

    return reply.send({
      success: true,
      data: messages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  });

  // POST /api/support/tickets/:id/messages — HTTP fallback for sending messages
  app.post('/tickets/:id/messages', auth, async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { body, senderType = 'AGENT', clientMessageId } = request.body as {
      body: string;
      senderType?: string;
      clientMessageId?: string;
    };

    if (!body?.trim()) {
      return reply.code(400).send({ success: false, error: 'body is required' });
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: { conversation: true },
    });

    if (!ticket) return reply.code(404).send({ success: false, error: 'Ticket not found' });
    if (!ticket.conversation) {
      return reply.code(400).send({ success: false, error: 'Ticket has no active conversation' });
    }

    // Dedupe by clientMessageId
    if (clientMessageId) {
      const existing = await prisma.supportMessage.findFirst({
        where: { clientMessageId, conversationId: ticket.conversation.id },
      });
      if (existing) return reply.send({ success: true, data: existing });
    }

    const message = await prisma.supportMessage.create({
      data: {
        conversationId: ticket.conversation.id,
        senderType: senderType as any,
        senderId: user.id,
        body: body.trim(),
        clientMessageId,
        deliveredAt: new Date(),
      },
    });

    // Bump ticket updatedAt
    await prisma.supportTicket.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    // Broadcast to all agents viewing this ticket
    wsManager.broadcast(user.restaurantId, 'SUPPORT_MESSAGE' as any, {
      ticketId: id,
      message,
    });

    return reply.code(201).send({ success: true, data: message });
  });

  // ── Agents ───────────────────────────────────────────────────────────────────

  // GET /api/support/agents
  app.get('/agents', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Access denied' });
    }

    const agents = await prisma.supportAgent.findMany({
      where: { restaurantId: user.restaurantId },
      orderBy: { fullName: 'asc' },
    });

    return reply.send({ success: true, data: agents });
  });

  // POST /api/support/agents — create or upsert agent
  app.post('/agents', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Access denied' });
    }

    const { fullName, email, maxConcurrentChats = 3 } = request.body as {
      fullName: string;
      email: string;
      maxConcurrentChats?: number;
    };

    if (!fullName || !email) {
      return reply.code(400).send({ success: false, error: 'fullName and email are required' });
    }

    const agent = await prisma.supportAgent.upsert({
      where: { email },
      create: {
        restaurantId: user.restaurantId,
        fullName,
        email,
        maxConcurrentChats,
        presence: 'OFFLINE',
        isAvailable: false,
      },
      update: { fullName, maxConcurrentChats },
    });

    return reply.code(201).send({ success: true, data: agent });
  });

  // PATCH /api/support/agents/:id/presence — agent sets own presence
  app.patch('/agents/:id/presence', auth, async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { presence } = request.body as { presence: string };

    const validPresences = ['ONLINE', 'AWAY', 'OFFLINE'];
    if (!validPresences.includes(presence)) {
      return reply.code(400).send({ success: false, error: `presence must be one of: ${validPresences.join(', ')}` });
    }

    const agent = await prisma.supportAgent.findFirst({
      where: { id, restaurantId: user.restaurantId },
    });
    if (!agent) return reply.code(404).send({ success: false, error: 'Agent not found' });

    const updated = await prisma.supportAgent.update({
      where: { id },
      data: {
        presence: presence as any,
        isAvailable: presence === 'ONLINE',
        lastSeenAt: new Date(),
      },
    });

    wsManager.broadcast(user.restaurantId, 'SUPPORT_AGENT_PRESENCE' as any, {
      agentId: id,
      presence,
    });

    return reply.send({ success: true, data: updated });
  });

  // ── Customers ─────────────────────────────────────────────────────────────────

  // GET /api/support/customers
  app.get('/customers', auth, async (request, reply) => {
    const user = (request as any).user;
    const { q } = request.query as { q?: string };

    const customers = await prisma.supportCustomer.findMany({
      where: {
        restaurantId: user.restaurantId,
        ...(q
          ? {
              OR: [
                { displayName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { tickets: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return reply.send({ success: true, data: customers });
  });

  // ── Twilio Voice ─────────────────────────────────────────────────────────────

  // GET /api/support/twilio/voice-token — mint Twilio Access Token for browser softphone
  app.get('/twilio/voice-token', auth, async (request, reply) => {
    const user = (request as any).user;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKeySid = process.env.TWILIO_API_KEY_SID;
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

    if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
      return reply.code(503).send({
        success: false,
        error: 'Twilio voice is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, and TWILIO_TWIML_APP_SID environment variables.',
      });
    }

    try {
      // Dynamic import — only resolves if 'twilio' is installed.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const twilio = await (import('twilio' as any) as Promise<any>).catch(() => null);
      if (!twilio) {
        return reply.code(503).send({
          success: false,
          error: 'Twilio SDK not installed. Run: npm install twilio in apps/api',
        });
      }

      const { AccessToken } = twilio.default.jwt;
      const { VoiceGrant } = AccessToken;

      const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
        identity: `agent_${user.id}`,
        ttl: 3600,
      });

      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: twimlAppSid,
        incomingAllow: true,
      });

      token.addGrant(voiceGrant);

      return reply.send({ success: true, data: { token: token.toJwt(), identity: `agent_${user.id}` } });
    } catch (err: any) {
      app.log.error(err, 'Failed to mint Twilio token');
      return reply.code(500).send({ success: false, error: 'Failed to generate voice token' });
    }
  });

  // POST /api/support/twilio/voice/outbound — TwiML for outbound agent calls
  app.post('/twilio/voice/outbound', async (request, reply) => {
    const { To } = request.body as { To?: string };

    if (!To) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid call destination.</Say></Response>`;
      return reply.header('Content-Type', 'text/xml').send(twiml);
    }

    const callerId = process.env.TWILIO_CALLER_ID || '';
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${callerId}" timeout="30" record="record-from-ringing">
    <Number>${To.replace(/[^0-9+]/g, '')}</Number>
  </Dial>
</Response>`;

    return reply.header('Content-Type', 'text/xml').send(twiml);
  });

  // POST /api/support/twilio/voice/incoming — TwiML for inbound calls → enqueue
  app.post('/twilio/voice/incoming', async (request, reply) => {
    const queueName = process.env.TWILIO_QUEUE_NAME || 'support';
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you for calling. Please hold while we connect you with an agent.</Say>
  <Enqueue waitUrl="/api/support/twilio/voice/wait">${queueName}</Enqueue>
</Response>`;

    return reply.header('Content-Type', 'text/xml').send(twiml);
  });

  // POST /api/support/twilio/voice/wait — hold music TwiML
  app.post('/twilio/voice/wait', async (_request, reply) => {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Your call is important to us. Please continue to hold.</Say>
  <Play loop="10">https://com.twilio.sounds.music-on-hold.s3.amazonaws.com/MARKOVICHAMP-Saturdays-Guitar-Jam.mp3</Play>
</Response>`;

    return reply.header('Content-Type', 'text/xml').send(twiml);
  });

  // POST /api/support/twilio/voice/status — Twilio status callback, logs call
  app.post('/twilio/voice/status', async (request, reply) => {
    const {
      CallSid,
      CallStatus,
      Direction,
      Duration,
      From,
      To,
      RecordingUrl,
    } = request.body as {
      CallSid?: string;
      CallStatus?: string;
      Direction?: string;
      Duration?: string;
      From?: string;
      To?: string;
      RecordingUrl?: string;
    };

    if (!CallSid) return reply.code(200).send();

    try {
      // Try to match to an existing ticket/agent from call metadata in query params
      const { ticketId, restaurantId } = request.query as { ticketId?: string; restaurantId?: string };

      if (restaurantId) {
        const direction = (Direction || '').toLowerCase().includes('outbound') ? 'OUTBOUND' : 'INBOUND';
        const statusMap: Record<string, string> = {
          completed: 'COMPLETED',
          busy: 'BUSY',
          failed: 'FAILED',
          'no-answer': 'NO_ANSWER',
          canceled: 'CANCELED',
        };

        await prisma.supportCallLog.upsert({
          where: { twilioCallSid: CallSid },
          create: {
            restaurantId,
            twilioCallSid: CallSid,
            direction: direction as any,
            status: (statusMap[CallStatus || ''] || 'COMPLETED') as any,
            fromNumber: From,
            toNumber: To,
            durationSeconds: Duration ? parseInt(Duration, 10) : 0,
            recordingUrl: RecordingUrl,
            ticketId: ticketId || undefined,
          },
          update: {
            status: (statusMap[CallStatus || ''] || 'COMPLETED') as any,
            durationSeconds: Duration ? parseInt(Duration, 10) : 0,
            recordingUrl: RecordingUrl,
          },
        });
      }
    } catch (err) {
      app.log.error(err, 'Failed to log call status');
    }

    return reply.code(200).send();
  });

  // ── Queue Events ─────────────────────────────────────────────────────────────

  // POST /api/support/queue-events — audit trail for queue events
  app.post('/queue-events', auth, async (request, reply) => {
    const user = (request as any).user;
    const { ticketId, eventType, payload } = request.body as {
      ticketId: string;
      eventType: string;
      payload?: Record<string, unknown>;
    };

    const event = await prisma.supportQueueEvent.create({
      data: {
        restaurantId: user.restaurantId,
        ticketId,
        agentId: user.id,
        eventType,
        payload: payload || {},
      },
    });

    return reply.code(201).send({ success: true, data: event });
  });

  // ── Stats ─────────────────────────────────────────────────────────────────────

  // GET /api/support/stats — dashboard KPIs
  app.get('/stats', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Access denied' });
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const [openCount, pendingCount, resolvedToday, avgWait, onlineAgents] = await Promise.all([
      prisma.supportTicket.count({
        where: { restaurantId: user.restaurantId, status: 'OPEN' },
      }),
      prisma.supportTicket.count({
        where: { restaurantId: user.restaurantId, status: 'PENDING' },
      }),
      prisma.supportTicket.count({
        where: {
          restaurantId: user.restaurantId,
          status: { in: ['RESOLVED', 'CLOSED'] },
          resolvedAt: { gte: startOfDay },
        },
      }),
      prisma.supportCallLog.aggregate({
        where: { restaurantId: user.restaurantId, createdAt: { gte: startOfDay } },
        _avg: { queueWaitSeconds: true },
      }),
      prisma.supportAgent.count({
        where: { restaurantId: user.restaurantId, presence: 'ONLINE' },
      }),
    ]);

    return reply.send({
      success: true,
      data: {
        openTickets: openCount,
        pendingTickets: pendingCount,
        resolvedToday,
        avgQueueWaitSeconds: Math.round(avgWait._avg.queueWaitSeconds || 0),
        onlineAgents,
      },
    });
  });
}
