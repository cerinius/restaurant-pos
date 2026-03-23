
import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';
import crypto from 'crypto';
import {
  consumePendingDemoSignup,
  createPendingDemoSignup,
  getPendingDemoSignup,
  slugifyRestaurantName,
  type DemoSignupPayload,
} from '../lib/demo-signups';
import { notifySalesInbox, sendEmailOtp, sendSmsOtp } from '../lib/notifier';
import { mergeRestaurantSaasSettings } from '../lib/saas';
import { isTrialExpired } from '../lib/trial';

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin + 'pos-salt-2024').digest('hex');
}

function issueTokens(app: FastifyInstance, user: any, locationId?: string | null) {
  const tokenPayload = {
    id: user.id,
    name: user.name,
    role: user.role,
    restaurantId: user.restaurantId,
    locationId: locationId || user.locationId || user.locations?.[0]?.locationId || null,
    locationIds: user.locations?.map((location: any) => location.locationId) || [],
  };

  return {
    accessToken: app.jwt.sign(tokenPayload, { expiresIn: '12h' }),
    refreshToken: app.jwt.sign({ id: user.id }, { expiresIn: '7d' }),
    user: tokenPayload,
  };
}

function buildDemoFloorPlan() {
  return {
    version: 2,
    layoutMode: 'auto',
    canvasWidth: 1400,
    canvasHeight: 900,
    rooms: [
      { name: 'Dining Room', order: 1, x: 48, y: 48, width: 460, height: 340, type: 'room', bar: null },
      { name: 'Patio', order: 2, x: 564, y: 48, width: 420, height: 320, type: 'room', bar: null },
      {
        name: 'Bar',
        order: 3,
        x: 1040,
        y: 48,
        width: 420,
        height: 320,
        type: 'bar',
        bar: {
          enabled: true,
          style: 'rectangle',
          openingSide: 'south',
          aisleWidth: 88,
          counterX: 96,
          counterY: 78,
          counterWidth: 220,
          counterHeight: 130,
          counterRadius: 28,
          seatCount: 2,
        },
      },
    ],
    connections: [
      { id: 'Dining Room::Patio', from: 'Dining Room', to: 'Patio' },
      { id: 'Bar::Dining Room', from: 'Bar', to: 'Dining Room' },
    ],
    tableTemplates: [
      { id: 'two-top-round', name: '2 Top Round', shape: 'circle', width: 72, height: 72, capacity: 2 },
      { id: 'four-top-square', name: '4 Top Square', shape: 'square', width: 90, height: 90, capacity: 4 },
      { id: 'six-top-rect', name: '6 Top Rectangle', shape: 'rectangle', width: 124, height: 84, capacity: 6 },
    ],
    tableAssignments: [],
    tableMetadata: [],
  };
}

async function buildUniqueRestaurantSlug(name: string) {
  const base = slugifyRestaurantName(name);
  let attempt = 0;
  let slug = base;

  while (await prisma.restaurant.findUnique({ where: { slug }, select: { id: true } })) {
    attempt += 1;
    slug = `${base}-${attempt}`.slice(0, 60);
  }

  return slug;
}

async function provisionDemoWorkspace(payload: DemoSignupPayload) {
  const slug = await buildUniqueRestaurantSlug(payload.restaurantName);
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.create({
      data: {
        name: payload.restaurantName,
        slug,
        phone: payload.phone,
        email: payload.email,
        timezone: 'America/New_York',
        currency: 'USD',
        serviceMode: payload.serviceMode,
        settings: {
          ...mergeRestaurantSaasSettings(
            {
              requireTableForDineIn: true,
              allowSplitBills: true,
              defaultTipPercentages: [18, 20, 22],
              autoFireDelay: 0,
              receiptFooter: 'Thanks for trying RestaurantOS.',
              kdsEnabled: true,
              loyaltyEnabled: false,
              onlineOrderingEnabled: false,
              printerEnabled: false,
              taxIncluded: false,
              demoMode: true,
              trialEndsAt: trialEndsAt.toISOString(),
              trial: {
                endsAt: trialEndsAt.toISOString(),
                seats: payload.seats,
                locationsPlanned: payload.locationsPlanned,
              },
            },
            {
              tier: 'ADVANCED',
              billingStatus: 'demo',
              monthlyPrice: 0,
              demoMode: true,
              trialEndsAt: trialEndsAt.toISOString(),
            },
          ),
        },
      },
    });

    const location = await tx.location.create({
      data: {
        restaurantId: restaurant.id,
        name: payload.locationName,
        phone: payload.phone,
        timezone: 'America/New_York',
        isActive: true,
        settings: {
          floorPlan: buildDemoFloorPlan(),
        },
      },
    });

    const owner = await tx.user.create({
      data: {
        restaurantId: restaurant.id,
        name: payload.contactName,
        email: payload.email,
        pin: hashPin(payload.password),
        role: 'OWNER',
        isActive: true,
      },
    });

    await tx.userLocation.create({
      data: {
        userId: owner.id,
        locationId: location.id,
      },
    });

    await tx.tax.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Sales Tax',
        type: 'PERCENTAGE',
        rate: 8.875,
        isDefault: true,
        appliesToAll: true,
        isActive: true,
      },
    });

    const kitchenStation = await tx.station.create({
      data: {
        restaurantId: restaurant.id,
        locationId: location.id,
        name: 'Kitchen',
        type: 'KITCHEN',
        color: '#ef4444',
        isActive: true,
        displayOrder: 1,
      },
    });

    const barStation = await tx.station.create({
      data: {
        restaurantId: restaurant.id,
        locationId: location.id,
        name: 'Bar',
        type: 'BAR',
        color: '#f59e0b',
        isActive: true,
        displayOrder: 2,
      },
    });

    const starters = await tx.menuCategory.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Starters',
        sortOrder: 1,
        isActive: true,
        dayParts: ['ALL_DAY'],
      },
    });
    const mains = await tx.menuCategory.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Mains',
        sortOrder: 2,
        isActive: true,
        dayParts: ['ALL_DAY'],
      },
    });
    const drinks = await tx.menuCategory.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Drinks',
        sortOrder: 3,
        isActive: true,
        dayParts: ['ALL_DAY'],
      },
    });

    await Promise.all([
      tx.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: starters.id,
          name: 'Crispy Calamari',
          description: 'Starter sample item',
          basePrice: 14,
          status: 'ACTIVE',
          prepTime: 9,
          sortOrder: 1,
          stationId: kitchenStation.id,
          dayParts: ['ALL_DAY'],
        },
      }),
      tx.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: mains.id,
          name: 'House Burger',
          description: 'Main sample item',
          basePrice: 18,
          status: 'ACTIVE',
          prepTime: 14,
          sortOrder: 1,
          stationId: kitchenStation.id,
          dayParts: ['ALL_DAY'],
        },
      }),
      tx.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: drinks.id,
          name: 'Signature Old Fashioned',
          description: 'Bar sample item',
          basePrice: 15,
          status: 'ACTIVE',
          prepTime: 3,
          sortOrder: 1,
          stationId: barStation.id,
          dayParts: ['ALL_DAY'],
        },
      }),
    ]);

    await tx.discount.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Manager Comp',
        type: 'COMP',
        value: 100,
        requiresManagerApproval: true,
        isActive: true,
      },
    });

    const createdTables = await Promise.all([
      tx.table.create({
        data: { locationId: location.id, name: 'D1', capacity: 4, status: 'AVAILABLE', positionX: 88, positionY: 92, shape: 'square', section: 'Dining Room', width: 90, height: 90, isActive: true },
      }),
      tx.table.create({
        data: { locationId: location.id, name: 'D2', capacity: 4, status: 'AVAILABLE', positionX: 228, positionY: 92, shape: 'square', section: 'Dining Room', width: 90, height: 90, isActive: true },
      }),
      tx.table.create({
        data: { locationId: location.id, name: 'P1', capacity: 2, status: 'AVAILABLE', positionX: 92, positionY: 94, shape: 'circle', section: 'Patio', width: 72, height: 72, isActive: true },
      }),
      tx.table.create({
        data: { locationId: location.id, name: 'P2', capacity: 2, status: 'AVAILABLE', positionX: 214, positionY: 94, shape: 'circle', section: 'Patio', width: 72, height: 72, isActive: true },
      }),
      tx.table.create({
        data: { locationId: location.id, name: 'Bar 1', capacity: 1, status: 'AVAILABLE', positionX: 128, positionY: 228, shape: 'circle', section: 'Bar', width: 44, height: 44, isActive: true },
      }),
      tx.table.create({
        data: { locationId: location.id, name: 'Bar 2', capacity: 1, status: 'AVAILABLE', positionX: 246, positionY: 228, shape: 'circle', section: 'Bar', width: 44, height: 44, isActive: true },
      }),
    ]);

    await tx.location.update({
      where: { id: location.id },
      data: {
        settings: {
          floorPlan: {
            ...buildDemoFloorPlan(),
            tableMetadata: createdTables
              .filter((table) => table.section === 'Bar')
              .map((table) => ({ tableId: table.id, kind: 'bar-seat' })),
          },
        },
      },
    });

    const ownerWithLocations = await tx.user.findUnique({
      where: { id: owner.id },
      include: { locations: { select: { locationId: true } } },
    });

    return {
      restaurant,
      location,
      owner: ownerWithLocations,
      trialEndsAt,
      slug,
    };
  });
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

    const [user, restaurant] = await Promise.all([
      prisma.user.findFirst({
        where: {
          restaurantId,
          pin: hashedPin,
          isActive: true,
        },
        include: {
          locations: { select: { locationId: true } },
        },
      }),
      prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { settings: true, isActive: true },
      }),
    ]);

    if (!restaurant || !restaurant.isActive) {
      return reply.code(403).send({ success: false, error: 'Restaurant account is not active' });
    }

    if (isTrialExpired(restaurant.settings)) {
      return reply.code(403).send({ success: false, error: 'Your 7-day demo has expired' });
    }

    if (!user) {
      return reply.code(401).send({ success: false, error: 'Invalid PIN' });
    }

    const hasAccess = user.locations.some((l:any) => l.locationId === locationId)
      || user.role === 'OWNER';

    if (!hasAccess) {
      return reply.code(403).send({ success: false, error: 'No access to this location' });
    }

    const tokens = issueTokens(app, user, locationId);

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
      data: tokens,
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

    if (!restaurant.isActive) {
      return reply.code(403).send({ success: false, error: 'Restaurant account is not active' });
    }

    if (isTrialExpired(restaurant.settings)) {
      return reply.code(403).send({ success: false, error: 'Your 7-day demo has expired' });
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

    return reply.send({ success: true, data: issueTokens(app, user, user.locations[0]?.locationId) });
  });

  app.post('/demo/request-otp', async (request, reply) => {
    const {
      contactName,
      restaurantName,
      locationName,
      email,
      phone,
      password,
      seats,
      locationsPlanned,
      serviceMode,
    } = request.body as DemoSignupPayload;

    if (!contactName || !restaurantName || !locationName || !email || !phone || !password) {
      return reply.code(400).send({ success: false, error: 'All required demo fields must be provided' });
    }

    if (password.length < 4) {
      return reply.code(400).send({ success: false, error: 'Password / PIN must be at least 4 characters' });
    }

    const pendingSignup = createPendingDemoSignup({
      contactName: contactName.trim(),
      restaurantName: restaurantName.trim(),
      locationName: locationName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      seats: Math.max(1, Number(seats || 1)),
      locationsPlanned: Math.max(1, Number(locationsPlanned || 1)),
      serviceMode: serviceMode || 'FULL_SERVICE',
    });

    await Promise.allSettled([
      sendEmailOtp(pendingSignup.email, pendingSignup.code),
      pendingSignup.phone ? sendSmsOtp(pendingSignup.phone, pendingSignup.code) : Promise.resolve(),
    ]);

    return reply.send({
      success: true,
      data: {
        verificationId: pendingSignup.verificationId,
        expiresInMinutes: 10,
        otpPreview: process.env.NODE_ENV !== 'production' ? pendingSignup.code : undefined,
      },
    });
  });

  app.post('/demo/verify-otp', async (request, reply) => {
    const { verificationId, code } = request.body as { verificationId: string; code: string };

    if (!verificationId || !code) {
      return reply.code(400).send({ success: false, error: 'verificationId and code are required' });
    }

    const pendingSignup = getPendingDemoSignup(verificationId);
    if (!pendingSignup) {
      return reply.code(400).send({ success: false, error: 'Verification request expired. Please request a new code.' });
    }

    const verifiedSignup = consumePendingDemoSignup(verificationId, code);
    if (!verifiedSignup) {
      return reply.code(400).send({ success: false, error: 'Invalid verification code' });
    }

    const workspace = await provisionDemoWorkspace(verifiedSignup);
    const tokens = issueTokens(app, workspace.owner, workspace.location.id);

    await prisma.auditLog.create({
      data: {
        restaurantId: workspace.restaurant.id,
        userId: workspace.owner.id,
        userName: workspace.owner.name,
        action: 'DEMO_PROVISIONED',
        entityType: 'RESTAURANT',
        entityId: workspace.restaurant.id,
        details: {
          contactName: verifiedSignup.contactName,
          email: verifiedSignup.email,
          phone: verifiedSignup.phone,
          trialEndsAt: workspace.trialEndsAt.toISOString(),
        },
        ipAddress: request.ip,
      },
    });

    return reply.send({
      success: true,
      data: {
        ...tokens,
        restaurantSlug: workspace.slug,
        trialEndsAt: workspace.trialEndsAt.toISOString(),
      },
    });
  });

  app.post('/contact-sales', async (request, reply) => {
    const {
      name,
      email,
      phone,
      restaurantName,
      locations,
      goals,
    } = request.body as {
      name: string;
      email: string;
      phone?: string;
      restaurantName?: string;
      locations?: number;
      goals?: string;
    };

    if (!name || !email) {
      return reply.code(400).send({ success: false, error: 'name and email are required' });
    }

    await notifySalesInbox(
      `New RestaurantOS sales inquiry from ${name}`,
      [
        `Name: ${name}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : null,
        restaurantName ? `Restaurant: ${restaurantName}` : null,
        locations ? `Locations: ${locations}` : null,
        goals ? `Goals: ${goals}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    );

    return reply.send({ success: true, message: 'Sales inquiry received' });
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
        include: {
          locations: { select: { locationId: true } },
          restaurant: { select: { settings: true, isActive: true } },
        },
      });

      if (!user || !user.isActive) {
        return reply.code(401).send({ success: false, error: 'Invalid refresh token' });
      }

      if (!user.restaurant?.isActive) {
        return reply.code(403).send({ success: false, error: 'Restaurant account is not active' });
      }

      if (isTrialExpired(user.restaurant?.settings)) {
        return reply.code(403).send({ success: false, error: 'Your 7-day demo has expired' });
      }

      const accessToken = app.jwt.sign(
        {
          id: user.id,
          name: user.name,
          role: user.role,
          restaurantId: user.restaurantId,
          locationIds: user.locations.map((l: any) => l.locationId),
        },
        { expiresIn: '12h' }
      );
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
