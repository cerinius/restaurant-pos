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
}
