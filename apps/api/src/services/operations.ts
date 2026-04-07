import { prisma } from '@pos/db';

const MANAGER_ROLES = ['OWNER', 'MANAGER'];

function startOfDay(input = new Date()) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(input = new Date()) {
  const date = new Date(input);
  date.setHours(23, 59, 59, 999);
  return date;
}

function addDays(input: Date, amount: number) {
  const date = new Date(input);
  date.setDate(date.getDate() + amount);
  return date;
}

function normalizeName(value?: string | null) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizePhone(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

function splitName(fullName?: string | null) {
  const trimmed = String(fullName || '').trim();
  if (!trimmed) return { firstName: null, lastName: null, fullName: 'Guest' };
  const [firstName, ...rest] = trimmed.split(' ');
  return {
    firstName: firstName || null,
    lastName: rest.join(' ') || null,
    fullName: trimmed,
  };
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function calculateAverage(total: number, count: number) {
  if (!count) return 0;
  return Number((total / count).toFixed(2));
}

function getForecastBucket(hour: number) {
  if (hour < 11) return 'prep';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'mid';
  if (hour < 22) return 'dinner';
  return 'late';
}

export function canManageOperations(role?: string) {
  return MANAGER_ROLES.includes(String(role || '').toUpperCase());
}

export async function ensureIntegrationCatalog() {
  const count = await prisma.integrationApp.count();
  if (count > 0) return;

  await prisma.integrationApp.createMany({
    data: [
      {
        slug: 'toast-payroll-export',
        name: 'Payroll Export',
        category: 'payroll',
        authType: 'api_key',
        description: 'Export payable hours and tips to external payroll processors.',
      },
      {
        slug: 'open-table-sync',
        name: 'Reservation Sync',
        category: 'guest',
        authType: 'oauth',
        description: 'Sync reservation demand and guest signals into host operations.',
      },
      {
        slug: 'delivery-marketplace',
        name: 'Delivery Marketplace',
        category: 'orders',
        authType: 'oauth',
        description: 'Pull third-party order volume into the operating system.',
      },
      {
        slug: 'accounting-export',
        name: 'Accounting Export',
        category: 'finance',
        authType: 'api_key',
        description: 'Move payout, tax, and sales summaries into finance tools.',
      },
    ],
  });
}

export async function syncGuestsFromHistory(restaurantId: string) {
  const [existingGuests, reservations, orders] = await Promise.all([
    prisma.guest.findMany({
      where: { restaurantId },
      include: { tagLinks: { include: { tag: true } } },
    }),
    prisma.reservation.findMany({
      where: { restaurantId },
      orderBy: { reservationAt: 'desc' },
    }),
    prisma.order.findMany({
      where: {
        restaurantId,
        OR: [
          { customerName: { not: null } },
          { reservation: { isNot: null } },
        ],
      },
      include: { reservation: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const guestMap = new Map<string, any>();
  const addGuestMapKey = (guest: any) => {
    const phoneKey = normalizePhone(guest.phone);
    const emailKey = String(guest.email || '').trim().toLowerCase();
    const nameKey = normalizeName(guest.fullName);
    if (phoneKey) guestMap.set(`phone:${phoneKey}`, guest);
    if (emailKey) guestMap.set(`email:${emailKey}`, guest);
    if (nameKey) guestMap.set(`name:${nameKey}`, guest);
  };

  existingGuests.forEach(addGuestMapKey);

  const aggregates = new Map<
    string,
    {
      restaurantId: string;
      locationId?: string | null;
      fullName: string;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      phone?: string | null;
      isVip: boolean;
      notes: string[];
      dietaryPreferences: string[];
      allergens: string[];
      visitCount: number;
      totalSpend: number;
      firstVisitAt?: Date | null;
      lastVisitAt?: Date | null;
      reservationIds: string[];
      orderIds: string[];
    }
  >();

  const getAggregateKey = (payload: { phone?: string | null; email?: string | null; fullName?: string | null }) => {
    const phone = normalizePhone(payload.phone);
    const email = String(payload.email || '').trim().toLowerCase();
    if (phone) return `phone:${phone}`;
    if (email) return `email:${email}`;
    return `name:${normalizeName(payload.fullName)}`;
  };

  reservations.forEach((reservation) => {
    const key = getAggregateKey({
      phone: reservation.guestPhone,
      email: reservation.guestEmail,
      fullName: reservation.guestName,
    });
    const { firstName, lastName, fullName } = splitName(reservation.guestName);
    const current = aggregates.get(key) || {
      restaurantId,
      locationId: reservation.locationId,
      firstName,
      lastName,
      fullName,
      email: reservation.guestEmail,
      phone: reservation.guestPhone,
      isVip: reservation.isVip,
      notes: [],
      dietaryPreferences: [],
      allergens: [],
      visitCount: 0,
      totalSpend: 0,
      firstVisitAt: reservation.reservationAt,
      lastVisitAt: reservation.reservationAt,
      reservationIds: [],
      orderIds: [],
    };

    current.locationId = current.locationId || reservation.locationId;
    current.email = current.email || reservation.guestEmail;
    current.phone = current.phone || reservation.guestPhone;
    current.isVip = current.isVip || reservation.isVip;
    current.visitCount += reservation.status === 'CANCELLED' ? 0 : 1;
    current.firstVisitAt =
      !current.firstVisitAt || reservation.reservationAt < current.firstVisitAt
        ? reservation.reservationAt
        : current.firstVisitAt;
    current.lastVisitAt =
      !current.lastVisitAt || reservation.reservationAt > current.lastVisitAt
        ? reservation.reservationAt
        : current.lastVisitAt;
    if (reservation.specialRequests) current.notes.push(reservation.specialRequests);
    if (reservation.notes) current.notes.push(reservation.notes);
    current.reservationIds.push(reservation.id);
    aggregates.set(key, current);
  });

  orders.forEach((order) => {
    const guestName = order.customerName || order.reservation?.guestName;
    const guestPhone = order.customerPhone || order.reservation?.guestPhone;
    const guestEmail = order.customerEmail || order.reservation?.guestEmail;
    if (!guestName && !guestPhone && !guestEmail) return;

    const key = getAggregateKey({ phone: guestPhone, email: guestEmail, fullName: guestName });
    const { firstName, lastName, fullName } = splitName(guestName);
    const current = aggregates.get(key) || {
      restaurantId,
      locationId: order.locationId,
      firstName,
      lastName,
      fullName,
      email: guestEmail,
      phone: guestPhone,
      isVip: order.reservation?.isVip === true,
      notes: [],
      dietaryPreferences: [],
      allergens: [],
      visitCount: 0,
      totalSpend: 0,
      firstVisitAt: order.createdAt,
      lastVisitAt: order.closedAt || order.paidAt || order.createdAt,
      reservationIds: [],
      orderIds: [],
    };

    current.locationId = current.locationId || order.locationId;
    current.email = current.email || guestEmail;
    current.phone = current.phone || guestPhone;
    current.totalSpend += Number(order.total || 0);
    current.firstVisitAt =
      !current.firstVisitAt || order.createdAt < current.firstVisitAt ? order.createdAt : current.firstVisitAt;
    const visitDate = order.closedAt || order.paidAt || order.createdAt;
    current.lastVisitAt =
      !current.lastVisitAt || visitDate > current.lastVisitAt ? visitDate : current.lastVisitAt;
    current.orderIds.push(order.id);
    aggregates.set(key, current);
  });

  for (const [key, aggregate] of aggregates.entries()) {
    const matchedGuest =
      guestMap.get(key) ||
      guestMap.get(`phone:${normalizePhone(aggregate.phone)}`) ||
      guestMap.get(`email:${String(aggregate.email || '').trim().toLowerCase()}`) ||
      guestMap.get(`name:${normalizeName(aggregate.fullName)}`);

    const guest = matchedGuest
      ? await prisma.guest.update({
          where: { id: matchedGuest.id },
          data: {
            locationId: aggregate.locationId || matchedGuest.locationId,
            firstName: aggregate.firstName || matchedGuest.firstName,
            lastName: aggregate.lastName || matchedGuest.lastName,
            fullName: aggregate.fullName || matchedGuest.fullName,
            email: aggregate.email || matchedGuest.email,
            phone: aggregate.phone || matchedGuest.phone,
            isVip: aggregate.isVip || matchedGuest.isVip,
            notes: uniqueStrings([matchedGuest.notes, ...aggregate.notes]).join('\n'),
            visitCount: aggregate.visitCount,
            totalSpend: Number(aggregate.totalSpend.toFixed(2)),
            averageCheck: calculateAverage(aggregate.totalSpend, aggregate.visitCount),
            firstVisitAt: aggregate.firstVisitAt || matchedGuest.firstVisitAt,
            lastVisitAt: aggregate.lastVisitAt || matchedGuest.lastVisitAt,
          },
        })
      : await prisma.guest.create({
          data: {
            restaurantId,
            locationId: aggregate.locationId || null,
            firstName: aggregate.firstName,
            lastName: aggregate.lastName,
            fullName: aggregate.fullName,
            email: aggregate.email || null,
            phone: aggregate.phone || null,
            isVip: aggregate.isVip,
            marketingOptInSms: Boolean(aggregate.phone),
            marketingOptInEmail: Boolean(aggregate.email),
            notes: uniqueStrings(aggregate.notes).join('\n') || null,
            visitCount: aggregate.visitCount,
            totalSpend: Number(aggregate.totalSpend.toFixed(2)),
            averageCheck: calculateAverage(aggregate.totalSpend, aggregate.visitCount),
            firstVisitAt: aggregate.firstVisitAt || null,
            lastVisitAt: aggregate.lastVisitAt || null,
          },
        });

    addGuestMapKey(guest);

    await prisma.reservation.updateMany({
      where: { id: { in: aggregate.reservationIds }, guestId: null },
      data: { guestId: guest.id },
    });
    await prisma.order.updateMany({
      where: { id: { in: aggregate.orderIds }, guestId: null },
      data: { guestId: guest.id },
    });
  }
}

export async function getGuestAudience(restaurantId: string, rules: any, channel?: 'SMS' | 'EMAIL') {
  const guests = await prisma.guest.findMany({
    where: {
      restaurantId,
      ...(channel === 'SMS' ? { marketingOptInSms: true } : {}),
      ...(channel === 'EMAIL' ? { marketingOptInEmail: true } : {}),
    },
    include: {
      tagLinks: { include: { tag: true } },
      notesLog: { orderBy: { createdAt: 'desc' }, take: 3 },
    },
    orderBy: [{ isVip: 'desc' }, { totalSpend: 'desc' }],
  });

  const segmentType = String(rules?.type || 'all');
  const now = new Date();
  const thisMonth = now.getMonth();

  return guests.filter((guest) => {
    const lastVisitDays = guest.lastVisitAt
      ? Math.floor((Date.now() - new Date(guest.lastVisitAt).getTime()) / 86400000)
      : 999;

    if (segmentType === 'vip') return guest.isVip || guest.totalSpend >= 1000;
    if (segmentType === 'at-risk') return lastVisitDays >= Number(rules?.days || 30) && guest.visitCount >= 2;
    if (segmentType === 'birthday') return guest.birthday ? new Date(guest.birthday).getMonth() === thisMonth : false;
    if (segmentType === 'sms-opt-in') return guest.marketingOptInSms;
    if (segmentType === 'email-opt-in') return guest.marketingOptInEmail;
    if (segmentType === 'tag' && rules?.tag) {
      return guest.tagLinks.some((entry) => entry.tag.name === rules.tag);
    }

    return true;
  });
}

export async function buildPayrollPreview(restaurantId: string, locationId?: string | null, periodStart?: Date, periodEnd?: Date) {
  const start = periodStart || addDays(startOfDay(), -13);
  const end = periodEnd || endOfDay();
  const [users, orders, locations] = await Promise.all([
    prisma.user.findMany({
      where: {
        restaurantId,
        isActive: true,
        ...(locationId ? { OR: [{ role: 'OWNER' }, { locations: { some: { locationId } } }] } : {}),
      },
      include: { locations: true },
      orderBy: { name: 'asc' },
    }),
    prisma.order.findMany({
      where: {
        restaurantId,
        ...(locationId ? { locationId } : {}),
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        locationId: true,
        serverId: true,
        tipTotal: true,
        total: true,
        createdAt: true,
      },
    }),
    prisma.location.findMany({
      where: { restaurantId, isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  const workforceMap = new Map<string, any>();
  locations.forEach((location) => workforceMap.set(location.id, location));

  const rows = await Promise.all(
    users.map(async (user) => {
      const clockEvents = await prisma.clockEvent.findMany({
        where: {
          userId: user.id,
          timestamp: { gte: start, lte: end },
        },
        orderBy: { timestamp: 'asc' },
      });

      let workedMinutes = 0;
      let currentStart: Date | null = null;
      clockEvents.forEach((event) => {
        if (event.type === 'CLOCK_IN') currentStart = event.timestamp;
        if (event.type === 'CLOCK_OUT' && currentStart) {
          workedMinutes += Math.max(0, Math.round((event.timestamp.getTime() - currentStart.getTime()) / 60000));
          currentStart = null;
        }
      });

      const overtimeMinutes = Math.max(0, workedMinutes - 40 * 60);
      const regularMinutes = workedMinutes - overtimeMinutes;
      const payRate = ['OWNER', 'MANAGER'].includes(user.role) ? 28 : user.role === 'BARTENDER' ? 20 : 18;
      const overtimeRate = Number((payRate * 1.5).toFixed(2));
      const grossTips = orders
        .filter((order) => order.serverId === user.id)
        .reduce((sum, order) => sum + Number(order.tipTotal || 0), 0);
      const totalPay = Number(
        (((regularMinutes / 60) * payRate) + ((overtimeMinutes / 60) * overtimeRate) + grossTips).toFixed(2)
      );

      return {
        userId: user.id,
        userName: user.name,
        role: user.role,
        regularMinutes,
        overtimeMinutes,
        payRate,
        overtimeRate,
        grossTips: Number(grossTips.toFixed(2)),
        declaredTips: Number(grossTips.toFixed(2)),
        totalPay,
      };
    })
  );

  return {
    periodStart: start,
    periodEnd: end,
    rows,
    totals: {
      workedMinutes: rows.reduce((sum, row) => sum + row.regularMinutes + row.overtimeMinutes, 0),
      grossTips: Number(rows.reduce((sum, row) => sum + row.grossTips, 0).toFixed(2)),
      payrollCost: Number(rows.reduce((sum, row) => sum + row.totalPay, 0).toFixed(2)),
    },
  };
}

export async function buildLaborForecast(restaurantId: string, locationId?: string | null) {
  const windowStart = startOfDay();
  const windowEnd = endOfDay();
  const [reservations, orders, activeClockEvents] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        restaurantId,
        ...(locationId ? { locationId } : {}),
        reservationAt: { gte: windowStart, lte: windowEnd },
        status: { in: ['CONFIRMED', 'ARRIVED', 'WAITLIST', 'SEATED'] },
      },
    }),
    prisma.order.findMany({
      where: {
        restaurantId,
        ...(locationId ? { locationId } : {}),
        createdAt: { gte: addDays(windowStart, -14), lte: windowEnd },
      },
      select: { createdAt: true, total: true, guestCount: true, locationId: true },
    }),
    prisma.clockEvent.findMany({
      where: {
        user: { restaurantId },
        timestamp: { gte: windowStart, lte: windowEnd },
      },
      include: { user: true },
      orderBy: { timestamp: 'asc' },
    }),
  ]);

  const reservationsByBucket = reservations.reduce((acc, reservation) => {
    const bucket = getForecastBucket(new Date(reservation.reservationAt).getHours());
    acc[bucket] = (acc[bucket] || 0) + reservation.partySize;
    return acc;
  }, {} as Record<string, number>);

  const historicalDemand = orders.reduce((acc, order) => {
    const bucket = getForecastBucket(new Date(order.createdAt).getHours());
    acc[bucket] = (acc[bucket] || 0) + Number(order.total || 0);
    return acc;
  }, {} as Record<string, number>);

  const sessions = new Map<string, Date>();
  const workedToday = new Map<string, number>();
  activeClockEvents.forEach((event) => {
    const key = event.userId;
    if (event.type === 'CLOCK_IN') sessions.set(key, event.timestamp);
    if (event.type === 'CLOCK_OUT' && sessions.has(key)) {
      const startedAt = sessions.get(key)!;
      workedToday.set(
        key,
        (workedToday.get(key) || 0) + Math.max(0, Math.round((event.timestamp.getTime() - startedAt.getTime()) / 60000))
      );
      sessions.delete(key);
    }
  });

  const complianceAlerts = Array.from(workedToday.entries())
    .filter(([, minutes]) => minutes >= 300)
    .map(([userId, minutes]) => ({
      userId,
      minutes,
      severity: minutes >= 480 ? 'high' : 'medium',
      message: minutes >= 480 ? 'Approaching overtime threshold' : 'Approaching meal/break threshold',
    }));

  return {
    demandBuckets: Object.entries(reservationsByBucket).map(([bucket, covers]) => ({
      bucket,
      covers,
      projectedSales: Number(((historicalDemand[bucket] || 0) / 14).toFixed(2)),
    })),
    complianceAlerts,
    optimizationAlerts: Object.entries(reservationsByBucket)
      .filter(([, covers]) => covers >= 18)
      .map(([bucket, covers]) => ({
        bucket,
        covers,
        message: `Reservation volume suggests extra coverage during ${bucket}.`,
      })),
  };
}

export async function buildOperationsOverview(restaurantId: string, locationId?: string | null) {
  await ensureIntegrationCatalog();
  await syncGuestsFromHistory(restaurantId);

  const [guests, campaigns, managerLogs, taskLists, channels, documents, payrollPreview, tipPools, jobPostings, integrations, locations] =
    await Promise.all([
      prisma.guest.findMany({
        where: { restaurantId, ...(locationId ? { locationId } : {}) },
        include: {
          tagLinks: { include: { tag: true } },
          notesLog: { orderBy: { createdAt: 'desc' }, take: 2 },
        },
        orderBy: [{ isVip: 'desc' }, { totalSpend: 'desc' }],
        take: 30,
      }),
      prisma.campaign.findMany({
        where: { restaurantId },
        include: { recipients: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.managerLogEntry.findMany({
        where: { restaurantId, ...(locationId ? { locationId } : {}) },
        include: {
          createdBy: { select: { id: true, name: true } },
          acknowledgedBy: { select: { id: true, name: true } },
        },
        orderBy: [{ acknowledgedAt: 'asc' }, { createdAt: 'desc' }],
        take: 20,
      }),
      prisma.taskList.findMany({
        where: { restaurantId, ...(locationId ? { locationId } : {}) },
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
        take: 20,
      }),
      prisma.teamChannel.findMany({
        where: { restaurantId, ...(locationId ? { OR: [{ locationId }, { locationId: null }] } : {}) },
        include: {
          messages: {
            include: { sender: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: 12,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      prisma.employeeDocument.findMany({
        where: { restaurantId },
        include: {
          user: { select: { id: true, name: true, role: true } },
          acknowledgements: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      buildPayrollPreview(restaurantId, locationId || null),
      prisma.tipPool.findMany({
        where: { restaurantId, ...(locationId ? { locationId } : {}) },
        include: {
          shares: { include: { user: { select: { id: true, name: true, role: true } } } },
        },
        orderBy: { shiftDate: 'desc' },
        take: 12,
      }),
      prisma.jobPosting.findMany({
        where: { restaurantId, ...(locationId ? { locationId } : {}) },
        include: { candidates: { orderBy: { appliedAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      prisma.integrationConnection.findMany({
        where: { restaurantId, ...(locationId ? { OR: [{ locationId }, { locationId: null }] } : {}) },
        include: { app: true, location: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      prisma.location.findMany({
        where: { restaurantId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

  const [forecast, apps, multiLocation] = await Promise.all([
    buildLaborForecast(restaurantId, locationId || null),
    prisma.integrationApp.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
    Promise.all(
      locations.map(async (location) => {
        const [orderCount, reservationCount, openTasks, activePayrollBatches] = await Promise.all([
          prisma.order.count({ where: { restaurantId, locationId: location.id, createdAt: { gte: startOfDay() } } }),
          prisma.reservation.count({
            where: { restaurantId, locationId: location.id, reservationAt: { gte: startOfDay(), lte: endOfDay() } },
          }),
          prisma.taskItem.count({
            where: { taskList: { restaurantId, locationId: location.id }, status: { not: 'completed' } },
          }),
          prisma.payrollExportBatch.count({
            where: { restaurantId, locationId: location.id, periodEnd: { gte: addDays(startOfDay(), -14) } },
          }),
        ]);

        return {
          locationId: location.id,
          name: location.name,
          orderCount,
          reservationCount,
          openTasks,
          activePayrollBatches,
        };
      })
    ),
  ]);

  return {
    guests,
    campaigns,
    managerLogs,
    taskLists,
    channels,
    documents,
    payroll: payrollPreview,
    forecast,
    tipPools,
    hiring: jobPostings,
    integrations: {
      catalog: apps,
      connections: integrations,
    },
    multiLocation,
  };
}
