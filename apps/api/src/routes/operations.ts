import type { FastifyInstance } from 'fastify';

import { prisma } from '@pos/db';
import {
  buildOperationsOverview,
  buildPayrollPreview,
  canManageOperations,
  ensureIntegrationCatalog,
  getGuestAudience,
  syncGuestsFromHistory,
} from '../services/operations';

function parseDate(value?: string | null, fallback?: Date) {
  if (!value) return fallback || new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback || new Date() : parsed;
}

function getClientIp(request: any) {
  return request.headers['x-forwarded-for'] || request.ip || null;
}

async function writeAuditLog(user: any, action: string, entityType: string, entityId?: string, details?: any) {
  await prisma.auditLog.create({
    data: {
      restaurantId: user.restaurantId,
      userId: user.id,
      userName: user.name,
      action,
      entityType,
      entityId: entityId || null,
      details: details || {},
      ipAddress: details?.ipAddress || null,
    },
  });
}

export default async function operationsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get('/overview', auth, async (request: any, reply) => {
    const user = request.user;
    const { locationId } = request.query as { locationId?: string };
    const data = await buildOperationsOverview(user.restaurantId, locationId || null);
    return reply.send({ success: true, data });
  });

  app.get('/guests', auth, async (request: any, reply) => {
    const user = request.user;
    const { locationId, search } = request.query as { locationId?: string; search?: string };
    await syncGuestsFromHistory(user.restaurantId);
    const guests = await prisma.guest.findMany({
      where: {
        restaurantId: user.restaurantId,
        ...(locationId ? { locationId } : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        tagLinks: { include: { tag: true } },
        notesLog: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: [{ isVip: 'desc' }, { totalSpend: 'desc' }],
    });
    return reply.send({ success: true, data: guests });
  });

  app.get('/guests/:id', auth, async (request: any, reply) => {
    const user = request.user;
    const { id } = request.params as { id: string };
    const guest = await prisma.guest.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: {
        tagLinks: { include: { tag: true } },
        notesLog: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        reservations: { orderBy: { reservationAt: 'desc' }, take: 20 },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            total: true,
            tipTotal: true,
            status: true,
            tableName: true,
            serverName: true,
            createdAt: true,
          },
        },
      },
    });
    if (!guest) return reply.code(404).send({ success: false, error: 'Guest not found' });
    return reply.send({ success: true, data: guest });
  });

  app.post('/guests', auth, async (request: any, reply) => {
    const user = request.user;
    if (!canManageOperations(user.role)) {
      return reply.code(403).send({ success: false, error: 'Manager access required' });
    }

    const payload = request.body as any;
    const guest = payload?.id
      ? await prisma.guest.update({
          where: { id: payload.id },
          data: {
            locationId: payload.locationId || null,
            firstName: payload.firstName || null,
            lastName: payload.lastName || null,
            fullName: payload.fullName,
            email: payload.email || null,
            phone: payload.phone || null,
            birthday: payload.birthday ? new Date(payload.birthday) : null,
            notes: payload.notes || null,
            dietaryPreferences: Array.isArray(payload.dietaryPreferences) ? payload.dietaryPreferences : [],
            allergens: Array.isArray(payload.allergens) ? payload.allergens : [],
            isVip: payload.isVip === true,
            marketingOptInSms: payload.marketingOptInSms === true,
            marketingOptInEmail: payload.marketingOptInEmail === true,
          },
        })
      : await prisma.guest.create({
          data: {
            restaurantId: user.restaurantId,
            locationId: payload.locationId || null,
            firstName: payload.firstName || null,
            lastName: payload.lastName || null,
            fullName: payload.fullName,
            email: payload.email || null,
            phone: payload.phone || null,
            birthday: payload.birthday ? new Date(payload.birthday) : null,
            notes: payload.notes || null,
            dietaryPreferences: Array.isArray(payload.dietaryPreferences) ? payload.dietaryPreferences : [],
            allergens: Array.isArray(payload.allergens) ? payload.allergens : [],
            isVip: payload.isVip === true,
            marketingOptInSms: payload.marketingOptInSms === true,
            marketingOptInEmail: payload.marketingOptInEmail === true,
          },
        });

    await writeAuditLog(user, payload?.id ? 'GUEST_UPDATED' : 'GUEST_CREATED', 'guest', guest.id, payload);
    return reply.send({ success: true, data: guest });
  });

  app.post('/guests/:id/notes', auth, async (request: any, reply) => {
    const user = request.user;
    const { id } = request.params as { id: string };
    const payload = request.body as any;
    const note = await prisma.guestNote.create({
      data: {
        guestId: id,
        restaurantId: user.restaurantId,
        authorUserId: user.id,
        noteType: payload?.noteType || 'service',
        body: String(payload?.body || '').trim(),
      },
      include: { author: { select: { id: true, name: true } } },
    });
    await writeAuditLog(user, 'GUEST_NOTE_ADDED', 'guest', id, { noteType: payload?.noteType });
    return reply.send({ success: true, data: note });
  });

  app.post('/guests/:id/tags', auth, async (request: any, reply) => {
    const user = request.user;
    const { id } = request.params as { id: string };
    const payload = request.body as any;
    const tags = Array.isArray(payload?.tags) ? payload.tags.map((tag: any) => String(tag).trim()).filter(Boolean) : [];

    const definitions = [];
    for (const tagName of tags) {
      const tag = await prisma.guestTag.upsert({
        where: { restaurantId_name: { restaurantId: user.restaurantId, name: tagName } },
        update: {},
        create: { restaurantId: user.restaurantId, name: tagName },
      });
      definitions.push(tag);
    }

    await prisma.guestTagAssignment.deleteMany({ where: { guestId: id } });
    if (definitions.length > 0) {
      await prisma.guestTagAssignment.createMany({
        data: definitions.map((tag) => ({ guestId: id, tagId: tag.id })),
      });
    }

    await writeAuditLog(user, 'GUEST_TAGS_UPDATED', 'guest', id, { tags });
    return reply.send({ success: true, data: definitions });
  });

  app.get('/campaigns', auth, async (request: any, reply) => {
    const user = request.user;
    const campaigns = await prisma.campaign.findMany({
      where: { restaurantId: user.restaurantId },
      include: { recipients: true },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: campaigns });
  });

  app.post('/campaigns', auth, async (request: any, reply) => {
    const user = request.user;
    if (!canManageOperations(user.role)) {
      return reply.code(403).send({ success: false, error: 'Manager access required' });
    }

    const payload = request.body as any;
    const campaign = await prisma.campaign.create({
      data: {
        restaurantId: user.restaurantId,
        createdByUserId: user.id,
        name: payload.name,
        channel: payload.channel || 'EMAIL',
        trigger: payload.trigger || 'MANUAL',
        status: payload.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        segmentName: payload.segmentName || 'All Guests',
        segmentRules: payload.segmentRules || { type: 'all' },
        subject: payload.subject || null,
        message: payload.message,
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
      },
    });
    await writeAuditLog(user, 'CAMPAIGN_CREATED', 'campaign', campaign.id, payload);
    return reply.send({ success: true, data: campaign });
  });

  app.post('/campaigns/:id/send', auth, async (request: any, reply) => {
    const user = request.user;
    if (!canManageOperations(user.role)) {
      return reply.code(403).send({ success: false, error: 'Manager access required' });
    }

    const { id } = request.params as { id: string };
    const campaign = await prisma.campaign.findFirst({
      where: { id, restaurantId: user.restaurantId },
    });
    if (!campaign) return reply.code(404).send({ success: false, error: 'Campaign not found' });

    const audience = await getGuestAudience(user.restaurantId, campaign.segmentRules, campaign.channel as any);
    for (const guest of audience) {
      await prisma.campaignRecipient.upsert({
        where: {
          campaignId_guestId_channel: {
            campaignId: campaign.id,
            guestId: guest.id,
            channel: campaign.channel,
          },
        },
        update: {
          status: 'SENT',
          sentAt: new Date(),
          revenueAttributed: 0,
        },
        create: {
          campaignId: campaign.id,
          guestId: guest.id,
          channel: campaign.channel,
          status: 'SENT',
          sentAt: new Date(),
        },
      });
    }

    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'ACTIVE',
        lastSentAt: new Date(),
      },
      include: { recipients: true },
    });

    await writeAuditLog(user, 'CAMPAIGN_SENT', 'campaign', campaign.id, { audienceSize: audience.length });
    return reply.send({ success: true, data: updated });
  });

  app.get('/manager-log', auth, async (request: any, reply) => {
    const user = request.user;
    const { locationId } = request.query as { locationId?: string };
    const entries = await prisma.managerLogEntry.findMany({
      where: { restaurantId: user.restaurantId, ...(locationId ? { locationId } : {}) },
      include: {
        createdBy: { select: { id: true, name: true } },
        acknowledgedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ acknowledgedAt: 'asc' }, { createdAt: 'desc' }],
    });
    return reply.send({ success: true, data: entries });
  });

  app.post('/manager-log', auth, async (request: any, reply) => {
    const user = request.user;
    const payload = request.body as any;
    const entry = await prisma.managerLogEntry.create({
      data: {
        restaurantId: user.restaurantId,
        locationId: payload.locationId || null,
        createdByUserId: user.id,
        shiftDate: parseDate(payload.shiftDate),
        category: payload.category || 'service',
        title: payload.title,
        body: payload.body,
        priority: payload.priority || 'normal',
        followUpRequired: payload.followUpRequired === true,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        acknowledgedBy: { select: { id: true, name: true } },
      },
    });
    await writeAuditLog(user, 'MANAGER_LOG_CREATED', 'manager-log', entry.id, payload);
    return reply.send({ success: true, data: entry });
  });

  app.post('/manager-log/:id/acknowledge', auth, async (request: any, reply) => {
    const user = request.user;
    const { id } = request.params as { id: string };
    const entry = await prisma.managerLogEntry.update({
      where: { id },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedByUserId: user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        acknowledgedBy: { select: { id: true, name: true } },
      },
    });
    await writeAuditLog(user, 'MANAGER_LOG_ACKNOWLEDGED', 'manager-log', id);
    return reply.send({ success: true, data: entry });
  });

  app.get('/tasks', auth, async (request: any, reply) => {
    const user = request.user;
    const { locationId } = request.query as { locationId?: string };
    const lists = await prisma.taskList.findMany({
      where: { restaurantId: user.restaurantId, ...(locationId ? { locationId } : {}) },
      include: {
        items: {
          include: {
            assignedUser: { select: { id: true, name: true } },
            completedBy: { select: { id: true, name: true } },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: lists });
  });

  app.post('/tasks', auth, async (request: any, reply) => {
    const user = request.user;
    const payload = request.body as any;
    const list = await prisma.taskList.create({
      data: {
        restaurantId: user.restaurantId,
        locationId: payload.locationId || null,
        createdByUserId: user.id,
        name: payload.name,
        category: payload.category || 'ops',
        shiftDate: payload.shiftDate ? new Date(payload.shiftDate) : null,
        dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
      },
      include: { items: true },
    });
    await writeAuditLog(user, 'TASK_LIST_CREATED', 'task-list', list.id, payload);
    return reply.send({ success: true, data: list });
  });

  app.post('/tasks/:id/items', auth, async (request: any, reply) => {
    const user = request.user;
    const { id } = request.params as { id: string };
    const payload = request.body as any;
    const item = await prisma.taskItem.create({
      data: {
        taskListId: id,
        title: payload.title,
        notes: payload.notes || null,
        assignedUserId: payload.assignedUserId || null,
        sortOrder: Number(payload.sortOrder || 0),
      },
      include: {
        assignedUser: { select: { id: true, name: true } },
        completedBy: { select: { id: true, name: true } },
      },
    });
    await writeAuditLog(user, 'TASK_ITEM_CREATED', 'task-item', item.id, payload);
    return reply.send({ success: true, data: item });
  });

  app.post('/task-items/:id/toggle', auth, async (request: any, reply) => {
    const user = request.user;
    const { id } = request.params as { id: string };
    const existing = await prisma.taskItem.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ success: false, error: 'Task item not found' });
    const item = await prisma.taskItem.update({
      where: { id },
      data: {
        status: existing.status === 'completed' ? 'open' : 'completed',
        completedAt: existing.status === 'completed' ? null : new Date(),
        completedByUserId: existing.status === 'completed' ? null : user.id,
      },
      include: {
        assignedUser: { select: { id: true, name: true } },
        completedBy: { select: { id: true, name: true } },
      },
    });
    await writeAuditLog(user, 'TASK_ITEM_TOGGLED', 'task-item', id, { status: item.status });
    return reply.send({ success: true, data: item });
  });

  app.get('/channels', auth, async (request: any, reply) => {
    const user = request.user;
    const { locationId } = request.query as { locationId?: string };
    const channels = await prisma.teamChannel.findMany({
      where: {
        restaurantId: user.restaurantId,
        ...(locationId ? { OR: [{ locationId }, { locationId: null }] } : {}),
      },
      include: {
        messages: {
          include: { sender: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          take: 40,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return reply.send({ success: true, data: channels });
  });

  app.post('/channels', auth, async (request: any, reply) => {
    const user = request.user;
    const payload = request.body as any;
    const channel = await prisma.teamChannel.create({
      data: {
        restaurantId: user.restaurantId,
        locationId: payload.locationId || null,
        createdByUserId: user.id,
        name: payload.name,
        channelType: payload.channelType || 'ops',
        isPrivate: payload.isPrivate === true,
      },
      include: { messages: true },
    });
    await writeAuditLog(user, 'TEAM_CHANNEL_CREATED', 'team-channel', channel.id, payload);
    return reply.send({ success: true, data: channel });
  });

  app.post('/channels/:id/messages', auth, async (request: any, reply) => {
    const user = request.user;
    const { id } = request.params as { id: string };
    const payload = request.body as any;
    const message = await prisma.teamMessage.create({
      data: {
        channelId: id,
        senderUserId: user.id,
        body: String(payload.body || '').trim(),
      },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });
    await writeAuditLog(user, 'TEAM_MESSAGE_SENT', 'team-channel', id);
    (app as any).wsManager.broadcast(user.restaurantId, 'SUPPORT_MESSAGE' as any, { channelId: id, message });
    return reply.send({ success: true, data: message });
  });

  app.get('/documents', auth, async (request: any, reply) => {
    const user = request.user;
    const documents = await prisma.employeeDocument.findMany({
      where: { restaurantId: user.restaurantId },
      include: {
        user: { select: { id: true, name: true, role: true } },
        acknowledgements: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: documents });
  });

  app.post('/documents', auth, async (request: any, reply) => {
    const user = request.user;
    const payload = request.body as any;
    const document = await prisma.employeeDocument.create({
      data: {
        restaurantId: user.restaurantId,
        userId: payload.userId,
        uploadedByUserId: user.id,
        documentType: payload.documentType,
        title: payload.title,
        storageKey: payload.storageKey || null,
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
        metadata: payload.metadata || {},
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
        acknowledgements: true,
      },
    });
    await writeAuditLog(user, 'EMPLOYEE_DOCUMENT_CREATED', 'employee-document', document.id, payload);
    return reply.send({ success: true, data: document });
  });

  app.post('/documents/:id/acknowledge', auth, async (request: any, reply) => {
    const user = request.user;
    const { id } = request.params as { id: string };
    const payload = request.body as any;
    const acknowledgement = await prisma.employeeAcknowledgement.upsert({
      where: { documentId_userId: { documentId: id, userId: user.id } },
      update: {
        signedName: payload.signedName || user.name || 'Staff',
        signatureData: payload.signatureData || null,
        ipAddress: String(getClientIp(request) || ''),
        signedAt: new Date(),
      },
      create: {
        documentId: id,
        userId: user.id,
        signedName: payload.signedName || user.name || 'Staff',
        signatureData: payload.signatureData || null,
        ipAddress: String(getClientIp(request) || ''),
      },
    });
    await writeAuditLog(user, 'EMPLOYEE_DOCUMENT_ACKNOWLEDGED', 'employee-document', id);
    return reply.send({ success: true, data: acknowledgement });
  });

  app.get('/payroll/preview', auth, async (request: any, reply) => {
    const user = request.user;
    const { locationId, periodStart, periodEnd } = request.query as {
      locationId?: string;
      periodStart?: string;
      periodEnd?: string;
    };
    const data = await buildPayrollPreview(
      user.restaurantId,
      locationId || null,
      periodStart ? new Date(periodStart) : undefined,
      periodEnd ? new Date(periodEnd) : undefined
    );
    return reply.send({ success: true, data });
  });

  app.post('/payroll/exports', auth, async (request: any, reply) => {
    const user = request.user;
    const payload = request.body as any;
    const preview = await buildPayrollPreview(
      user.restaurantId,
      payload.locationId || null,
      parseDate(payload.periodStart),
      parseDate(payload.periodEnd)
    );

    const batch = await prisma.payrollExportBatch.create({
      data: {
        restaurantId: user.restaurantId,
        locationId: payload.locationId || null,
        createdByUserId: user.id,
        provider: payload.provider || 'csv',
        status: 'exported',
        periodStart: preview.periodStart,
        periodEnd: preview.periodEnd,
        totals: preview.totals,
        entries: {
          create: preview.rows.map((row) => ({
            userId: row.userId,
            regularMinutes: row.regularMinutes,
            overtimeMinutes: row.overtimeMinutes,
            payRate: row.payRate,
            overtimeRate: row.overtimeRate,
            grossTips: row.grossTips,
            declaredTips: row.declaredTips,
            totalPay: row.totalPay,
          })),
        },
      },
      include: {
        entries: { include: { user: { select: { id: true, name: true, role: true } } } },
      },
    });
    await writeAuditLog(user, 'PAYROLL_EXPORT_CREATED', 'payroll-export', batch.id, {
      locationId: payload.locationId || null,
      provider: payload.provider || 'csv',
    });
    return reply.send({ success: true, data: batch });
  });

  app.get('/tip-pools', auth, async (request: any, reply) => {
    const user = request.user;
    const { locationId } = request.query as { locationId?: string };
    const pools = await prisma.tipPool.findMany({
      where: { restaurantId: user.restaurantId, ...(locationId ? { locationId } : {}) },
      include: { shares: { include: { user: { select: { id: true, name: true, role: true } } } } },
      orderBy: { shiftDate: 'desc' },
    });
    return reply.send({ success: true, data: pools });
  });

  app.post('/tip-pools', auth, async (request: any, reply) => {
    const user = request.user;
    const payload = request.body as any;
    const shares = Array.isArray(payload.shares) ? payload.shares : [];
    const totalPoints = shares.reduce((sum: number, share: any) => sum + Number(share.points || 0), 0) || 1;
    const totalTips = Number(payload.totalTips || 0);
    const pool = await prisma.tipPool.create({
      data: {
        restaurantId: user.restaurantId,
        locationId: payload.locationId || null,
        createdByUserId: user.id,
        shiftDate: parseDate(payload.shiftDate),
        name: payload.name,
        status: payload.status || 'draft',
        totalTips,
        notes: payload.notes || null,
        shares: {
          create: shares.map((share: any) => ({
            userId: share.userId,
            role: share.role || 'SERVER',
            points: Number(share.points || 1),
            amount: Number(((totalTips * Number(share.points || 1)) / totalPoints).toFixed(2)),
          })),
        },
      },
      include: { shares: { include: { user: { select: { id: true, name: true, role: true } } } } },
    });
    await writeAuditLog(user, 'TIP_POOL_CREATED', 'tip-pool', pool.id, payload);
    return reply.send({ success: true, data: pool });
  });

  app.get('/hiring', auth, async (request: any, reply) => {
    const user = request.user;
    const { locationId } = request.query as { locationId?: string };
    const postings = await prisma.jobPosting.findMany({
      where: { restaurantId: user.restaurantId, ...(locationId ? { locationId } : {}) },
      include: { candidates: { orderBy: { appliedAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: postings });
  });

  app.post('/hiring/postings', auth, async (request: any, reply) => {
    const user = request.user;
    const payload = request.body as any;
    const posting = await prisma.jobPosting.create({
      data: {
        restaurantId: user.restaurantId,
        locationId: payload.locationId || null,
        createdByUserId: user.id,
        title: payload.title,
        department: payload.department || 'Front of House',
        employmentType: payload.employmentType || 'part-time',
        description: payload.description || null,
      },
      include: { candidates: true },
    });
    await writeAuditLog(user, 'JOB_POSTING_CREATED', 'job-posting', posting.id, payload);
    return reply.send({ success: true, data: posting });
  });

  app.post('/hiring/postings/:id/candidates', auth, async (request: any, reply) => {
    const user = request.user;
    const { id } = request.params as { id: string };
    const payload = request.body as any;
    const candidate = await prisma.candidate.create({
      data: {
        restaurantId: user.restaurantId,
        jobPostingId: id,
        assignedManagerId: payload.assignedManagerId || null,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email || null,
        phone: payload.phone || null,
        stage: payload.stage || 'applied',
        source: payload.source || 'manual',
        notes: payload.notes || null,
      },
    });
    await writeAuditLog(user, 'CANDIDATE_CREATED', 'candidate', candidate.id, payload);
    return reply.send({ success: true, data: candidate });
  });

  app.get('/integrations', auth, async (request: any, reply) => {
    const user = request.user;
    await ensureIntegrationCatalog();
    const [catalog, connections] = await Promise.all([
      prisma.integrationApp.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
      prisma.integrationConnection.findMany({
        where: { restaurantId: user.restaurantId },
        include: { app: true, location: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return reply.send({ success: true, data: { catalog, connections } });
  });

  app.post('/integrations/connections', auth, async (request: any, reply) => {
    const user = request.user;
    const payload = request.body as any;
    const connection = await prisma.integrationConnection.create({
      data: {
        restaurantId: user.restaurantId,
        locationId: payload.locationId || null,
        appId: payload.appId,
        displayName: payload.displayName,
        status: payload.status || 'connected',
        config: payload.config || {},
        lastSyncAt: payload.status === 'connected' ? new Date() : null,
      },
      include: { app: true, location: { select: { id: true, name: true } } },
    });
    await writeAuditLog(user, 'INTEGRATION_CONNECTED', 'integration-connection', connection.id, payload);
    return reply.send({ success: true, data: connection });
  });
}
