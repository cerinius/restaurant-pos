import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';

import { getRestaurantUrls, mergeRestaurantSaasSettings, normalizeRestaurantSaasSettings } from '../lib/saas';

function getConfiguredSaasCredentials() {
  return {
    email: process.env.SAAS_ADMIN_EMAIL || 'admin@restaurantos.local',
    password: process.env.SAAS_ADMIN_PASSWORD || 'ChangeMe123!',
  };
}

async function authenticateSaasAdmin(request: any, reply: any, app: FastifyInstance) {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return reply.code(401).send({ success: false, error: 'SaaS admin authorization required' });
  }

  try {
    const payload = app.jwt.verify(token) as any;
    if (payload?.scope !== 'saas_admin') {
      return reply.code(401).send({ success: false, error: 'Invalid SaaS admin session' });
    }
    request.saasAdmin = payload;
  } catch {
    return reply.code(401).send({ success: false, error: 'Invalid or expired SaaS admin session' });
  }
}

export default async function saasRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const { email, password } = request.body as { email?: string; password?: string };
    const configured = getConfiguredSaasCredentials();

    if (!email || !password) {
      return reply.code(400).send({ success: false, error: 'Email and password are required' });
    }

    if (email !== configured.email || password !== configured.password) {
      return reply.code(401).send({ success: false, error: 'Invalid SaaS admin credentials' });
    }

    const accessToken = app.jwt.sign(
      {
        scope: 'saas_admin',
        email,
        role: 'SAAS_ADMIN',
      },
      { expiresIn: '12h' },
    );

    return reply.send({
      success: true,
      data: {
        accessToken,
        user: {
          email,
          role: 'SAAS_ADMIN',
        },
      },
    });
  });

  app.get('/restaurants', async (request, reply) => {
    const authResult = await authenticateSaasAdmin(request, reply, app);
    if (authResult) return authResult;

    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { role: 'OWNER' },
          select: { id: true, name: true, email: true },
          take: 1,
        },
        _count: {
          select: {
            locations: true,
            users: true,
            orders: true,
          },
        },
      },
    });

    return reply.send({
      success: true,
      data: restaurants.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        isActive: restaurant.isActive,
        createdAt: restaurant.createdAt,
        updatedAt: restaurant.updatedAt,
        owner: restaurant.users[0] || null,
        counts: restaurant._count,
        saas: normalizeRestaurantSaasSettings(restaurant.settings),
        urls: getRestaurantUrls(restaurant.id),
      })),
    });
  });

  app.patch('/restaurants/:id', async (request, reply) => {
    const authResult = await authenticateSaasAdmin(request, reply, app);
    if (authResult) return authResult;

    const { id } = request.params as { id: string };
    const { isActive, saas, name, phone, email } = request.body as any;
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: {
        id: true,
        settings: true,
      },
    });

    if (!existingRestaurant) {
      return reply.code(404).send({ success: false, error: 'Restaurant not found' });
    }

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(saas !== undefined && {
          settings: mergeRestaurantSaasSettings(existingRestaurant.settings, saas),
        }),
      },
      include: {
        users: {
          where: { role: 'OWNER' },
          select: { id: true, name: true, email: true },
          take: 1,
        },
        _count: {
          select: {
            locations: true,
            users: true,
            orders: true,
          },
        },
      },
    });

    return reply.send({
      success: true,
      data: {
        id: updatedRestaurant.id,
        name: updatedRestaurant.name,
        slug: updatedRestaurant.slug,
        isActive: updatedRestaurant.isActive,
        createdAt: updatedRestaurant.createdAt,
        updatedAt: updatedRestaurant.updatedAt,
        owner: updatedRestaurant.users[0] || null,
        counts: updatedRestaurant._count,
        saas: normalizeRestaurantSaasSettings(updatedRestaurant.settings),
        urls: getRestaurantUrls(updatedRestaurant.id),
      },
    });
  });
  // Get single restaurant detail with full user list
  app.get('/restaurants/:id', async (request, reply) => {
    const authResult = await authenticateSaasAdmin(request, reply, app);
    if (authResult) return authResult;

    const { id } = request.params as { id: string };

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        locations: {
          select: { id: true, name: true, isActive: true, createdAt: true },
        },
        _count: {
          select: { orders: true, users: true, locations: true },
        },
      },
    });

    if (!restaurant) {
      return reply.code(404).send({ success: false, error: 'Restaurant not found' });
    }

    // Calculate recent activity
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentOrderCount = await prisma.order.count({
      where: { restaurantId: id, createdAt: { gte: thirtyDaysAgo } },
    });
    const recentRevenue = await prisma.payment.aggregate({
      where: {
        order: { restaurantId: id },
        status: 'CAPTURED',
        processedAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
    });

    return reply.send({
      success: true,
      data: {
        ...restaurant,
        saas: normalizeRestaurantSaasSettings(restaurant.settings),
        urls: getRestaurantUrls(restaurant.id),
        activity: {
          ordersLast30Days: recentOrderCount,
          revenueLast30Days: recentRevenue._sum.amount || 0,
        },
      },
    });
  });

  // Extend trial for a restaurant
  app.post('/restaurants/:id/extend-trial', async (request, reply) => {
    const authResult = await authenticateSaasAdmin(request, reply, app);
    if (authResult) return authResult;

    const { id } = request.params as { id: string };
    const { days = 7, reason } = request.body as { days?: number; reason?: string };

    if (!Number.isInteger(days) || days < 1 || days > 90) {
      return reply.code(400).send({ success: false, error: 'days must be an integer between 1 and 90' });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: { id: true, name: true, settings: true },
    });

    if (!restaurant) {
      return reply.code(404).send({ success: false, error: 'Restaurant not found' });
    }

    const settings = restaurant.settings as any;
    const currentTrialEnd = settings?.trial?.endsAt || settings?.trialEndsAt
      ? new Date(settings?.trial?.endsAt || settings?.trialEndsAt)
      : new Date();

    // Extend from current end date (or now if already expired)
    const baseDate = currentTrialEnd < new Date() ? new Date() : currentTrialEnd;
    const newTrialEndsAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    const updatedSettings = {
      ...settings,
      trialEndsAt: newTrialEndsAt.toISOString(),
      trial: {
        ...(settings?.trial || {}),
        endsAt: newTrialEndsAt.toISOString(),
        extendedDays: (settings?.trial?.extendedDays || 0) + days,
        lastExtendedAt: new Date().toISOString(),
        extensionReason: reason || 'SaaS admin extension',
      },
      saas: {
        ...(settings?.saas || {}),
        billingStatus: 'demo',
        demoMode: true,
        trialEndsAt: newTrialEndsAt.toISOString(),
      },
    };

    await prisma.restaurant.update({
      where: { id },
      data: { settings: updatedSettings, isActive: true },
    });

    return reply.send({
      success: true,
      data: {
        restaurantId: id,
        newTrialEndsAt: newTrialEndsAt.toISOString(),
        daysAdded: days,
      },
    });
  });

  // Get platform-level stats
  app.get('/stats', async (request, reply) => {
    const authResult = await authenticateSaasAdmin(request, reply, app);
    if (authResult) return authResult;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalRestaurants,
      activeRestaurants,
      newThisWeek,
      newThisMonth,
      totalUsers,
      totalOrders,
      recentOrders,
    ] = await Promise.all([
      prisma.restaurant.count(),
      prisma.restaurant.count({ where: { isActive: true } }),
      prisma.restaurant.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.restaurant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count(),
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    return reply.send({
      success: true,
      data: {
        restaurants: {
          total: totalRestaurants,
          active: activeRestaurants,
          inactive: totalRestaurants - activeRestaurants,
          newThisWeek,
          newThisMonth,
        },
        users: { total: totalUsers },
        orders: { total: totalOrders, last30Days: recentOrders },
      },
    });
  });

  // Reset / force-expire trial for a restaurant
  app.post('/restaurants/:id/expire-trial', async (request, reply) => {
    const authResult = await authenticateSaasAdmin(request, reply, app);
    if (authResult) return authResult;

    const { id } = request.params as { id: string };

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: { id: true, settings: true },
    });

    if (!restaurant) {
      return reply.code(404).send({ success: false, error: 'Restaurant not found' });
    }

    const settings = restaurant.settings as any;
    const expiredDate = new Date(Date.now() - 1000).toISOString();

    await prisma.restaurant.update({
      where: { id },
      data: {
        settings: {
          ...settings,
          trialEndsAt: expiredDate,
          trial: { ...(settings?.trial || {}), endsAt: expiredDate },
        },
      },
    });

    return reply.send({ success: true, message: 'Trial expired' });
  });

  // Block/unblock a restaurant account
  app.post('/restaurants/:id/toggle-active', async (request, reply) => {
    const authResult = await authenticateSaasAdmin(request, reply, app);
    if (authResult) return authResult;

    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason?: string };

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: { id: true, isActive: true, settings: true },
    });

    if (!restaurant) {
      return reply.code(404).send({ success: false, error: 'Restaurant not found' });
    }

    const newActive = !restaurant.isActive;
    const settings = restaurant.settings as any;

    await prisma.restaurant.update({
      where: { id },
      data: {
        isActive: newActive,
        ...(newActive === false && reason
          ? {
              settings: {
                ...settings,
                saas: { ...(settings?.saas || {}), blockedReason: reason },
              },
            }
          : {}),
      },
    });

    return reply.send({ success: true, data: { isActive: newActive } });
  });
}
