
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { prisma } from '@pos/db';
import { wsManager } from './websocket/manager';

// Routes
import authRoutes from './routes/auth';
import restaurantRoutes from './routes/restaurants';
import locationRoutes from './routes/locations';
import menuRoutes from './routes/menu';
import orderRoutes from './routes/orders';
import tableRoutes from './routes/tables';
import paymentRoutes from './routes/payments';
import kdsRoutes from './routes/kds';
import staffRoutes from './routes/staff';
import reportRoutes from './routes/reports';
import inventoryRoutes from './routes/inventory';
import discountRoutes from './routes/discounts';
import happyHourRoutes from './routes/happyHours';
import stationRoutes from './routes/stations';
import workflowRoutes from './routes/workflows';
import wsRoutes from './routes/websocket';
import taxRoutes from './routes/taxes';
import giftCardRoutes from './routes/giftCards';
import comboRoutes from './routes/combos';
import auditRoutes from './routes/audit';
const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
  trustProxy: true,
});

async function bootstrap() {
  // ââ Security ââââââââââââââââââââââââââââââââââââââââââââââ
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });

  await app.register(cors, {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    skipOnError: true,
  });

  // ââ Auth ââââââââââââââââââââââââââââââââââââââââââââââââââ
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-me',
    sign: { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
  });

  // ââ WebSocket âââââââââââââââââââââââââââââââââââââââââââââ
  await app.register(websocket);

  // ââ Swagger Docs âââââââââââââââââââââââââââââââââââââââââ
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Restaurant POS API',
        description: 'Complete Restaurant Point of Sale System API',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: false },
  });

  // ââ Decorators ââââââââââââââââââââââââââââââââââââââââââââ
  app.decorate('prisma', prisma);
  app.decorate('wsManager', wsManager);

  // Auth decorator
  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ success: false, error: 'Unauthorized' });
    }
  });

  app.decorate('requireRole', function (roles: string[]) {
    return async function (request: any, reply: any) {
      try {
        await request.jwtVerify();
        if (!roles.includes(request.user.role)) {
          return reply.code(403).send({ success: false, error: 'Forbidden: insufficient permissions' });
        }
      } catch {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }
    };
  });

  // ââ Health Check âââââââââââââââââââââââââââââââââââââââââ
  app.get('/health', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'connected', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'degraded', db: 'disconnected', timestamp: new Date().toISOString() };
    }
  });

  // ââ Routes ââââââââââââââââââââââââââââââââââââââââââââââââ
  await app.register(authRoutes,       { prefix: '/api/auth' });
  await app.register(restaurantRoutes, { prefix: '/api/restaurants' });
  await app.register(locationRoutes,   { prefix: '/api/locations' });
  await app.register(menuRoutes,       { prefix: '/api/menu' });
  await app.register(orderRoutes,      { prefix: '/api/orders' });
  await app.register(tableRoutes,      { prefix: '/api/tables' });
  await app.register(paymentRoutes,    { prefix: '/api/payments' });
  await app.register(kdsRoutes,        { prefix: '/api/kds' });
  await app.register(staffRoutes,      { prefix: '/api/staff' });
  await app.register(reportRoutes,     { prefix: '/api/reports' });
  await app.register(inventoryRoutes,  { prefix: '/api/inventory' });
  await app.register(discountRoutes,   { prefix: '/api/discounts' });
  await app.register(happyHourRoutes,  { prefix: '/api/happy-hours' });
  await app.register(stationRoutes,    { prefix: '/api/stations' });
  await app.register(workflowRoutes,   { prefix: '/api/workflows' });
  await app.register(taxRoutes,        { prefix: '/api/taxes' });
  await app.register(giftCardRoutes,   { prefix: '/api/gift-cards' });
  await app.register(comboRoutes,      { prefix: '/api/combos' });
  await app.register(auditRoutes,      { prefix: '/api/audit' });
  await app.register(wsRoutes,         { prefix: '/ws' });

  // ââ Start âââââââââââââââââââââââââââââââââââââââââââââââââ
  const port = parseInt(process.env.PORT || '3001');
  const host = process.env.HOST || '0.0.0.0';

  await app.listen({ port, host });
  console.log(`\nð POS API running on http://${host}:${port}`);
  console.log(`ð Swagger docs: http://${host}:${port}/docs`);
  console.log(`ð WebSocket: ws://${host}:${port}/ws/live\n`);
}

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\n${signal} received, shutting down...`);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  });
});

bootstrap().catch((err) => {
  console.error('â Failed to start:', err);
  process.exit(1);
});

export default app;
