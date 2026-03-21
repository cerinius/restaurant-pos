
import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';
import crypto from 'crypto';

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin + 'pos-salt-2024').digest('hex');
}

export default async function authRoutes(app: FastifyInstance) {
  // PIN Login
  app.post('/pin-login', async (request, reply) => {
    const { pin, restaurantId, locationId } = request.body as {
      pin: string;
      restaurantId: string;
      locationId: string;
    };

    if (!pin || !restaurantId || !locationId) {
      return reply.code(400).send({ success: false, error: 'pin, restaurantId, and locationId are required' });
    }

    const hashedPin = hashPin(pin);

    const user = await prisma.user.findFirst({
      where: {
        restaurantId,
        pin: hashedPin,
        isActive: true,
      },
      include: {
        locations: { select: { locationId: true } },
      },
    });

    if (!user) {
      return reply.code(401).send({ success: false, error: 'Invalid PIN' });
    }

    const hasAccess = user.locations.some((l:any) => l.locationId === locationId)
      || user.role === 'OWNER';

    if (!hasAccess) {
      return reply.code(403).send({ success: false, error: 'No access to this location' });
    }

    const tokenPayload = {
      id: user.id,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId,
      locationId,
      locationIds: user.locations.map((l:any) => l.locationId),
    };

    const accessToken = app.jwt.sign(tokenPayload, { expiresIn: '12h' });
    const refreshToken = app.jwt.sign({ id: user.id }, { expiresIn: '7d' });

    await prisma.auditLog.create({
      data: {
        restaurantId,
        userId: user.id,
        userName: user.name,
        action: 'LOGIN',
        entityType: 'USER',
        entityId: user.id,
        details: { method: 'PIN', locationId },
        ipAddress: request.ip,
      },
    });

    return reply.send({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: tokenPayload,
      },
    });
  });

  // Email Login (owner/admin)
  app.post('/login', async (request, reply) => {
    const { email, password, restaurantSlug } = request.body as {
      email: string;
      password: string;
      restaurantSlug: string;
    };

    if (!email || !password || !restaurantSlug) {
      return reply.code(400).send({ success: false, error: 'email, password, and restaurantSlug are required' });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
    });
    if (!restaurant) {
      return reply.code(404).send({ success: false, error: 'Restaurant not found' });
    }

    const user = await prisma.user.findFirst({
      where: {
        restaurantId: restaurant.id,
        email,
        isActive: true,
      },
      include: { locations: { select: { locationId: true } } },
    });

    if (!user) {
      return reply.code(401).send({ success: false, error: 'Invalid credentials' });
    }

    // For email login, we verify using the same hash mechanism
    const hashedPassword = hashPin(password);
    if (user.pin !== hashedPassword) {
      return reply.code(401).send({ success: false, error: 'Invalid credentials' });
    }

    const tokenPayload = {
      id: user.id,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId,
      locationId: user.locations[0]?.locationId,
      locationIds: user.locations.map((l:any) => l.locationId),
    };

    const accessToken = app.jwt.sign(tokenPayload, { expiresIn: '12h' });
    const refreshToken = app.jwt.sign({ id: user.id }, { expiresIn: '7d' });

    return reply.send({ success: true, data: { accessToken, refreshToken, user: tokenPayload } });
  });

  // Refresh Token
  app.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    if (!refreshToken) {
      return reply.code(400).send({ success: false, error: 'refreshToken is required' });
    }

    try {
      const decoded = app.jwt.verify(refreshToken) as { id: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { locations: { select: { locationId: true } } },
      });

      if (!user || !user.isActive) {
        return reply.code(401).send({ success: false, error: 'Invalid refresh token' });
      }

      const tokenPayload = {
        id: user.id,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurantId,
        locationIds: user.locations.map((l:any) => l.locationId),
      };

      const accessToken = app.jwt.sign(tokenPayload, { expiresIn: '12h' });
      return reply.send({ success: true, data: { accessToken } });
    } catch {
      return reply.code(401).send({ success: false, error: 'Invalid or expired refresh token' });
    }
  });

  // Get current user
  app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = (request as any).user;
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { locations: { select: { locationId: true } } },
    });
    if (!dbUser) return reply.code(404).send({ success: false, error: 'User not found' });

    return reply.send({
      success: true,
      data: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        restaurantId: dbUser.restaurantId,
        locationIds: dbUser.locations.map((l:any) => l.locationId),
        isActive: dbUser.isActive,
      },
    });
  });

  // Logout
  app.post('/logout', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = (request as any).user;
    await prisma.auditLog.create({
      data: {
        restaurantId: user.restaurantId,
        userId: user.id,
        userName: user.name,
        action: 'LOGOUT',
        entityType: 'USER',
        entityId: user.id,
        ipAddress: request.ip,
      },
    });
    return reply.send({ success: true, message: 'Logged out' });
  });

  // Change PIN
  app.put('/change-pin', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = (request as any).user;
    const { currentPin, newPin } = request.body as { currentPin: string; newPin: string };

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return reply.code(404).send({ success: false, error: 'User not found' });

    if (dbUser.pin !== hashPin(currentPin)) {
      return reply.code(401).send({ success: false, error: 'Current PIN is incorrect' });
    }

    if (newPin.length < 4) {
      return reply.code(400).send({ success: false, error: 'New PIN must be at least 4 digits' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { pin: hashPin(newPin) },
    });

    return reply.send({ success: true, message: 'PIN changed successfully' });
  });
}
