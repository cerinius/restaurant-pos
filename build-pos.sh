
#!/bin/bash
set -e

echo "ð½ï¸  Building RestaurantOS POS System..."
echo "======================================="

ROOT="restaurant-pos"
rm -rf $ROOT
mkdir -p $ROOT
cd $ROOT

# ââ ROOT ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
cat > package.json << 'PKGJSON'
{
  "name": "restaurant-pos",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "concurrently \"npm run dev --workspace=apps/api\" \"npm run dev --workspace=apps/web\"",
    "build": "npm run build --workspace=packages/shared && npm run build --workspace=packages/db && npm run build --workspace=apps/api && npm run build --workspace=apps/web",
    "db:generate": "npm run generate --workspace=packages/db",
    "db:migrate": "npm run migrate:dev --workspace=packages/db",
    "db:seed": "npm run seed --workspace=packages/db",
    "db:studio": "npx prisma studio --schema=packages/db/prisma/schema.prisma"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "concurrently": "^8.2.2",
    "typescript": "^5.3.3"
  }
}
PKGJSON

cat > .gitignore << 'EOF'
node_modules/
dist/
.next/
.env
*.log
.DS_Store
EOF

# ââ DOCKER COMPOSE ââââââââââââââââââââââââââââââââââââââââââââ
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: pos_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: posuser
      POSTGRES_PASSWORD: pospassword
      POSTGRES_DB: restaurant_pos
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL","pg_isready -U posuser -d restaurant_pos"]
      interval: 10s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    container_name: pos_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD","redis-cli","ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: pos_api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: "postgresql://posuser:pospassword@postgres:5432/restaurant_pos"
      REDIS_URL: "redis://redis:6379"
      JWT_SECRET: "${JWT_SECRET:-changeme-min-32-chars-in-production!!}"
      JWT_REFRESH_SECRET: "${JWT_REFRESH_SECRET:-changeme-refresh-32-chars-prod!!}"
      PORT: "3001"
      HOST: "0.0.0.0"
      NODE_ENV: "production"
      CORS_ORIGINS: "http://localhost:3000"
    ports:
      - "3001:3001"
    networks:
      - pos_network

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        NEXT_PUBLIC_API_URL: "http://localhost:3001"
        NEXT_PUBLIC_WS_URL: "ws://localhost:3001"
    container_name: pos_web
    restart: unless-stopped
    depends_on:
      - api
    environment:
      NEXT_PUBLIC_API_URL: "http://localhost:3001"
      NEXT_PUBLIC_WS_URL: "ws://localhost:3001"
      PORT: "3000"
      HOSTNAME: "0.0.0.0"
    ports:
      - "3000:3000"
    networks:
      - pos_network

volumes:
  postgres_data:
  redis_data:

networks:
  pos_network:
    driver: bridge
EOF

cat > docker-compose.dev.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: pos_postgres_dev
    restart: unless-stopped
    environment:
      POSTGRES_USER: posuser
      POSTGRES_PASSWORD: pospassword
      POSTGRES_DB: restaurant_pos
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL","pg_isready -U posuser -d restaurant_pos"]
      interval: 5s
      timeout: 3s
      retries: 10

  redis:
    image: redis:7-alpine
    container_name: pos_redis_dev
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: pos_pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@pos.local
      PGADMIN_DEFAULT_PASSWORD: admin123
    ports:
      - "5050:80"
    depends_on:
      - postgres

volumes:
  postgres_dev_data:
  redis_dev_data:
EOF

echo "â Root + Docker files created"

# ââ ENV FILES âââââââââââââââââââââââââââââââââââââââââââââââââ
mkdir -p apps/api apps/web

cat > apps/api/.env << 'EOF'
DATABASE_URL="postgresql://posuser:pospassword@localhost:5432/restaurant_pos"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="dev-jwt-secret-change-in-production-min-32-chars!!"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production-min-32!!"
JWT_EXPIRES_IN="12h"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3001
HOST="0.0.0.0"
NODE_ENV="development"
CORS_ORIGINS="http://localhost:3000"
EOF

cat > apps/api/.env.example << 'EOF'
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/restaurant_pos"
REDIS_URL="redis://HOST:6379"
JWT_SECRET="GENERATE: openssl rand -base64 32"
JWT_REFRESH_SECRET="GENERATE: openssl rand -base64 32"
JWT_EXPIRES_IN="12h"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3001
HOST="0.0.0.0"
NODE_ENV="production"
CORS_ORIGINS="https://yourdomain.com"
EOF

cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_DEMO_LOCATION_ID=main-location
EOF

cat > apps/web/.env.example << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_DEMO_LOCATION_ID=main-location
EOF

echo "â Env files created"

# ââ PACKAGES ââââââââââââââââââââââââââââââââââââââââââââââââââ
mkdir -p packages/shared/src packages/db/src packages/db/prisma

# shared package.json
cat > packages/shared/package.json << 'EOF'
{
  "name": "@pos/shared",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": { "build": "tsc", "dev": "tsc --watch" },
  "devDependencies": { "typescript": "^5.3.3" }
}
EOF

cat > packages/shared/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020","module": "CommonJS","moduleResolution": "node",
    "outDir": "./dist","rootDir": "./src","strict": true,
    "esModuleInterop": true,"declaration": true,"skipLibCheck": true
  },
  "include": ["src/**/*"],"exclude": ["node_modules","dist"]
}
EOF

# db package.json
cat > packages/db/package.json << 'EOF'
{
  "name": "@pos/db",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "generate": "prisma generate",
    "migrate:dev": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "seed": "ts-node --project tsconfig.json prisma/seed.ts",
    "studio": "prisma studio",
    "build": "tsc"
  },
  "dependencies": { "@prisma/client": "^5.8.1" },
  "devDependencies": {
    "prisma": "^5.8.1","ts-node": "^10.9.2","typescript": "^5.3.3"
  }
}
EOF

cat > packages/db/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020","module": "CommonJS","moduleResolution": "node",
    "outDir": "./dist","rootDir": "./src","strict": true,
    "esModuleInterop": true,"skipLibCheck": true,"declaration": true
  },
  "include": ["src/**/*"],"exclude": ["node_modules","dist"]
}
EOF

# db index
cat > packages/db/src/index.ts << 'EOF'
import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error','warn'] : ['error'],
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
export { PrismaClient } from '@prisma/client';
export * from '@prisma/client';
EOF

echo "â Packages created"

# ââ API âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
mkdir -p apps/api/src/routes apps/api/src/websocket

cat > apps/api/package.json << 'EOF'
{
  "name": "@pos/api",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@fastify/cors": "^9.0.1",
    "@fastify/helmet": "^11.1.1",
    "@fastify/jwt": "^8.0.1",
    "@fastify/multipart": "^8.1.0",
    "@fastify/rate-limit": "^9.1.0",
    "@fastify/swagger": "^8.14.0",
    "@fastify/swagger-ui": "^3.0.0",
    "@fastify/websocket": "^10.0.1",
    "@pos/db": "*",
    "@pos/shared": "*",
    "@prisma/client": "^5.8.1",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.4.1",
    "fastify": "^4.26.2",
    "uuid": "^9.0.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20.11.0",
    "@types/uuid": "^9.0.7",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
EOF

cat > apps/api/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020","module": "CommonJS","moduleResolution": "node",
    "outDir": "./dist","rootDir": "./src","strict": true,
    "esModuleInterop": true,"skipLibCheck": true,"sourceMap": true,
    "paths": {
      "@pos/shared": ["../../packages/shared/src/index.ts"],
      "@pos/db": ["../../packages/db/src/index.ts"]
    }
  },
  "include": ["src/**/*"],"exclude": ["node_modules","dist"]
}
EOF

# ââ WEB âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
cat > apps/web/package.json << 'EOF'
{
  "name": "@pos/web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@headlessui/react": "^1.7.18",
    "@heroicons/react": "^2.1.1",
    "@tanstack/react-query": "^5.17.19",
    "@tanstack/react-query-devtools": "^5.17.19",
    "axios": "^1.6.7",
    "clsx": "^2.1.0",
    "date-fns": "^3.3.1",
    "framer-motion": "^11.0.3",
    "next": "14.1.0",
    "next-pwa": "^5.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hot-toast": "^2.4.1",
    "recharts": "^2.12.0",
    "tailwind-merge": "^2.2.1",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3"
  }
}
EOF

cat > apps/web/next.config.js << 'EOF'
const withPWA = require('next-pwa')({
  dest: 'public', register: true, skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: { domains: ['localhost','via.placeholder.com'] },
};
module.exports = withPWA(nextConfig);
EOF

cat > apps/web/tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/pages/**/*.{js,ts,jsx,tsx}','./src/components/**/*.{js,ts,jsx,tsx}','./src/app/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {
    colors: { brand: { 500:'#3b82f6',600:'#2563eb',700:'#1d4ed8' } },
    animation: { 'pulse-fast': 'pulse 1s cubic-bezier(0.4,0,0.6,1) infinite' },
  }},
  plugins: [],
};
EOF

cat > apps/web/postcss.config.js << 'EOF'
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
EOF

cat > apps/web/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es5","lib": ["dom","dom.iterable","esnext"],"allowJs": true,
    "skipLibCheck": true,"strict": true,"noEmit": true,"esModuleInterop": true,
    "module": "esnext","moduleResolution": "bundler","resolveJsonModule": true,
    "isolatedModules": true,"jsx": "preserve","incremental": true,
    "plugins": [{"name": "next"}],
    "paths": { "@/*": ["./src/*"], "@pos/shared": ["../../packages/shared/src/index.ts"] }
  },
  "include": ["next-env.d.ts","**/*.ts","**/*.tsx",".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# ââ DOCKERFILES âââââââââââââââââââââââââââââââââââââââââââââââ
cat > apps/api/Dockerfile << 'EOF'
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/api ./apps/api
RUN cd packages/shared && npx tsc
RUN cd packages/db && npx prisma generate && npx tsc
RUN cd apps/api && npx tsc

FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat dumb-init
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 fastify
COPY --from=builder --chown=fastify:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/packages/db/prisma ./prisma
COPY --from=builder --chown=fastify:nodejs /app/apps/api/package.json ./
USER fastify
EXPOSE 3001
ENTRYPOINT ["dumb-init","--"]
CMD ["node","dist/index.js"]
EOF

cat > apps/web/Dockerfile << 'EOF'
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_WS_URL=ws://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd packages/shared && npx tsc
RUN cd apps/web && npx next build

FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node","server.js"]
EOF

echo "â Dockerfiles created"

# ââ PRISMA SCHEMA âââââââââââââââââââââââââââââââââââââââââââââ
cat > packages/db/prisma/schema.prisma << 'SCHEMA'
generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
model Restaurant {
  id          String      @id @default(cuid())
  name        String
  slug        String      @unique
  logo        String?
  address     String?
  phone       String?
  email       String?
  timezone    String      @default("America/New_York")
  currency    String      @default("USD")
  serviceMode ServiceMode @default(FULL_SERVICE)
  settings    Json        @default("{}")
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  locations      Location[]
  users          User[]
  categories     MenuCategory[]
  menuItems      MenuItem[]
  modifierGroups ModifierGroup[]
  orders         Order[]
  taxes          Tax[]
  discounts      Discount[]
  stations       Station[]
  happyHours     HappyHour[]
  combos         Combo[]
  workflows      WorkflowConfig[]
  inventory      InventoryItem[]
  vendors        Vendor[]
  giftCards      GiftCard[]
  @@map("restaurants")
}
model Location {
  id           String   @id @default(cuid())
  restaurantId String
  name         String
  address      String?
  phone        String?
  timezone     String?
  isActive     Boolean  @default(true)
  settings     Json     @default("{}")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  restaurant    Restaurant    @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  tables        Table[]
  orders        Order[]
  stations      Station[]
  userLocations UserLocation[]
  @@map("locations")
}
model User {
  id           String   @id @default(cuid())
  restaurantId String
  name         String
  email        String?
  pin          String
  role         UserRole
  isActive     Boolean  @default(true)
  avatar       String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  restaurant  Restaurant    @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  locations   UserLocation[]
  orders      Order[]
  auditLogs   AuditLog[]
  clockEvents ClockEvent[]
  @@unique([restaurantId, email])
  @@map("users")
}
model UserLocation {
  userId     String
  locationId String
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  location Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  @@id([userId, locationId])
  @@map("user_locations")
}
model ClockEvent {
  id        String         @id @default(cuid())
  userId    String
  type      ClockEventType
  timestamp DateTime       @default(now())
  notes     String?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("clock_events")
}
model MenuCategory {
  id           String    @id @default(cuid())
  restaurantId String
  name         String
  description  String?
  image        String?
  sortOrder    Int       @default(0)
  isActive     Boolean   @default(true)
  dayParts     DayPart[] @default([ALL_DAY])
  color        String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  items      MenuItem[]
  taxes      CategoryTax[]
  stations   StationCategory[]
  @@map("menu_categories")
}
model MenuItem {
  id           String         @id @default(cuid())
  restaurantId String
  categoryId   String
  name         String
  description  String?
  image        String?
  basePrice    Float
  status       MenuItemStatus @default(ACTIVE)
  isPopular    Boolean        @default(false)
  isFeatured   Boolean        @default(false)
  prepTime     Int            @default(10)
  sortOrder    Int            @default(0)
  sku          String?
  barcode      String?
  calories     Int?
  allergens    String[]       @default([])
  tags         String[]       @default([])
  dayParts     DayPart[]      @default([ALL_DAY])
  stationId    String?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  restaurant       Restaurant              @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  category         MenuCategory            @relation(fields: [categoryId], references: [id])
  modifierGroups   MenuItemModifierGroup[]
  pricingOverrides PricingOverride[]
  taxes            MenuItemTax[]
  orderItems       OrderItem[]
  comboItems       ComboItem[]
  quickButtons     QuickButton[]
  autoPrompts      AutoPrompt[]
  upsellTriggers   UpsellRule[]   @relation("UpsellTrigger")
  upsellTargets    UpsellRule[]   @relation("UpsellTarget")
  inventoryLinks   InventoryItemLink[]
  @@map("menu_items")
}
model ModifierGroup {
  id            String       @id @default(cuid())
  restaurantId  String
  name          String
  description   String?
  type          ModifierType @default(SINGLE)
  isRequired    Boolean      @default(false)
  minSelections Int          @default(0)
  maxSelections Int          @default(1)
  sortOrder     Int          @default(0)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  restaurant  Restaurant              @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  modifiers   Modifier[]
  menuItems   MenuItemModifierGroup[]
  autoPrompts AutoPrompt[]
  @@map("modifier_groups")
}
model Modifier {
  id              String  @id @default(cuid())
  groupId         String
  name            String
  priceAdjustment Float   @default(0)
  isDefault       Boolean @default(false)
  isAvailable     Boolean @default(true)
  sortOrder       Int     @default(0)
  group ModifierGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  @@map("modifiers")
}
model MenuItemModifierGroup {
  menuItemId      String
  modifierGroupId String
  sortOrder       Int    @default(0)
  menuItem      MenuItem      @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  modifierGroup ModifierGroup @relation(fields: [modifierGroupId], references: [id], onDelete: Cascade)
  @@id([menuItemId, modifierGroupId])
  @@map("menu_item_modifier_groups")
}
model PricingOverride {
  id         String   @id @default(cuid())
  menuItemId String
  name       String
  price      Float
  startTime  String
  endTime    String
  daysOfWeek Int[]
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  menuItem MenuItem @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  @@map("pricing_overrides")
}
model Tax {
  id           String   @id @default(cuid())
  restaurantId String
  name         String
  type         TaxType  @default(PERCENTAGE)
  rate         Float
  isDefault    Boolean  @default(false)
  appliesToAll Boolean  @default(true)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  restaurant Restaurant  @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  categories  CategoryTax[]
  menuItems   MenuItemTax[]
  @@map("taxes")
}
model CategoryTax {
  categoryId String
  taxId      String
  category MenuCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  tax      Tax          @relation(fields: [taxId], references: [id], onDelete: Cascade)
  @@id([categoryId, taxId])
  @@map("category_taxes")
}
model MenuItemTax {
  menuItemId String
  taxId      String
  menuItem MenuItem @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  tax      Tax      @relation(fields: [taxId], references: [id], onDelete: Cascade)
  @@id([menuItemId, taxId])
  @@map("menu_item_taxes")
}
model Discount {
  id                     String       @id @default(cuid())
  restaurantId           String
  name                   String
  type                   DiscountType @default(PERCENTAGE)
  value                  Float
  requiresManagerApproval Boolean     @default(false)
  isActive               Boolean      @default(true)
  code                   String?
  maxUses                Int?
  useCount               Int          @default(0)
  expiresAt              DateTime?
  createdAt              DateTime     @default(now())
  restaurant     Restaurant      @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  orderDiscounts OrderDiscount[]
  @@map("discounts")
}
model HappyHour {
  id            String       @id @default(cuid())
  restaurantId  String
  name          String
  startTime     String
  endTime       String
  daysOfWeek    Int[]
  discountType  DiscountType @default(PERCENTAGE)
  discountValue Float
  categoryIds   String[]     @default([])
  itemIds       String[]     @default([])
  isActive      Boolean      @default(true)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  @@map("happy_hours")
}
model Table {
  id         String      @id @default(cuid())
  locationId String
  name       String
  capacity   Int         @default(4)
  status     TableStatus @default(AVAILABLE)
  positionX  Float       @default(0)
  positionY  Float       @default(0)
  shape      String      @default("rectangle")
  section    String?
  width      Float       @default(80)
  height     Float       @default(80)
  isActive   Boolean     @default(true)
  createdAt  DateTime    @default(now())
  location Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  orders   Order[]
  @@map("tables")
}
model Order {
  id            String      @id @default(cuid())
  restaurantId  String
  locationId    String
  tableId       String?
  tableName     String?
  serverId      String
  serverName    String
  status        OrderStatus @default(OPEN)
  type          OrderType   @default(DINE_IN)
  guestCount    Int?
  subtotal      Float       @default(0)
  taxTotal      Float       @default(0)
  discountTotal Float       @default(0)
  tipTotal      Float       @default(0)
  total         Float       @default(0)
  notes         String?
  customerName  String?
  customerPhone String?
  customerEmail String?
  firedAt       DateTime?
  paidAt        DateTime?
  closedAt      DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  restaurant Restaurant      @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  location   Location        @relation(fields: [locationId], references: [id])
  table      Table?          @relation(fields: [tableId], references: [id])
  server     User            @relation(fields: [serverId], references: [id])
  items      OrderItem[]
  payments   Payment[]
  discounts  OrderDiscount[]
  kdsTickets KDSTicket[]
  auditLogs  AuditLog[]
  @@map("orders")
}
model OrderItem {
  id           String        @id @default(cuid())
  orderId      String
  menuItemId   String
  menuItemName String
  quantity     Int           @default(1)
  unitPrice    Float
  totalPrice   Float
  modifiers    Json          @default("[]")
  notes        String?
  status       KDSItemStatus @default(PENDING)
  courseNumber Int           @default(1)
  seatNumber   Int?
  isFired      Boolean       @default(false)
  firedAt      DateTime?
  isVoided     Boolean       @default(false)
  voidReason   String?
  voidedBy     String?
  voidedAt     DateTime?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  order    Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menuItem MenuItem @relation(fields: [menuItemId], references: [id])
  @@map("order_items")
}
model OrderDiscount {
  id         String  @id @default(cuid())
  orderId    String
  discountId String?
  name       String
  type       String
  value      Float
  amount     Float
  appliedBy  String
  order    Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  discount Discount? @relation(fields: [discountId], references: [id])
  @@map("order_discounts")
}
model Payment {
  id          String        @id @default(cuid())
  orderId     String
  method      PaymentMethod
  status      PaymentStatus @default(PENDING)
  amount      Float
  tipAmount   Float         @default(0)
  referenceId String?
  processedBy String
  giftCardId  String?
  notes       String?
  processedAt DateTime?
  createdAt   DateTime      @default(now())
  order    Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  giftCard GiftCard? @relation(fields: [giftCardId], references: [id])
  @@map("payments")
}
model GiftCard {
  id           String    @id @default(cuid())
  restaurantId String
  code         String    @unique
  balance      Float
  initialValue Float
  isActive     Boolean   @default(true)
  expiresAt    DateTime?
  createdAt    DateTime  @default(now())
  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  payments   Payment[]
  @@map("gift_cards")
}
model KDSTicket {
  id           String        @id @default(cuid())
  orderId      String
  stationId    String
  status       KDSItemStatus @default(PENDING)
  priority     String        @default("normal")
  courseNumber Int           @default(1)
  items        Json          @default("[]")
  firedAt      DateTime?
  bumpedAt     DateTime?
  recalledAt   DateTime?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  station Station @relation(fields: [stationId], references: [id])
  @@map("kds_tickets")
}
model Station {
  id           String      @id @default(cuid())
  restaurantId String
  locationId   String
  name         String
  type         StationType @default(KITCHEN)
  color        String      @default("#3B82F6")
  isActive     Boolean     @default(true)
  displayOrder Int         @default(0)
  createdAt    DateTime    @default(now())
  restaurant Restaurant        @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  location   Location          @relation(fields: [locationId], references: [id])
  categories StationCategory[]
  kdsTickets KDSTicket[]
  @@map("stations")
}
model StationCategory {
  stationId  String
  categoryId String
  station  Station      @relation(fields: [stationId], references: [id], onDelete: Cascade)
  category MenuCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  @@id([stationId, categoryId])
  @@map("station_categories")
}
model InventoryItem {
  id              String    @id @default(cuid())
  restaurantId    String
  name            String
  unit            String    @default("unit")
  currentStock    Float     @default(0)
  minimumStock    Float     @default(0)
  costPerUnit     Float     @default(0)
  vendorId        String?
  lastRestockedAt DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  restaurant     Restaurant          @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  vendor         Vendor?             @relation(fields: [vendorId], references: [id])
  menuItemLinks  InventoryItemLink[]
  stockMovements StockMovement[]
  @@map("inventory_items")
}
model InventoryItemLink {
  inventoryItemId String
  menuItemId      String
  quantityPerUnit Float  @default(1)
  inventoryItem InventoryItem @relation(fields: [inventoryItemId], references: [id], onDelete: Cascade)
  menuItem      MenuItem      @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  @@id([inventoryItemId, menuItemId])
  @@map("inventory_item_links")
}
model StockMovement {
  id              String   @id @default(cuid())
  inventoryItemId String
  type            String
  quantity        Float
  notes           String?
  createdBy       String
  createdAt       DateTime @default(now())
  inventoryItem InventoryItem @relation(fields: [inventoryItemId], references: [id], onDelete: Cascade)
  @@map("stock_movements")
}
model Vendor {
  id           String   @id @default(cuid())
  restaurantId String
  name         String
  email        String?
  phone        String?
  website      String?
  notes        String?
  createdAt    DateTime @default(now())
  restaurant     Restaurant      @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  inventoryItems InventoryItem[]
  @@map("vendors")
}
model Combo {
  id           String   @id @default(cuid())
  restaurantId String
  name         String
  description  String?
  image        String?
  price        Float
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  items      ComboItem[]
  @@map("combos")
}
model ComboItem {
  id                 String  @id @default(cuid())
  comboId            String
  menuItemId         String
  quantity           Int     @default(1)
  allowSubstitutions Boolean @default(false)
  combo    Combo    @relation(fields: [comboId], references: [id], onDelete: Cascade)
  menuItem MenuItem @relation(fields: [menuItemId], references: [id])
  @@map("combo_items")
}
model WorkflowConfig {
  id           String   @id @default(cuid())
  restaurantId String
  role         UserRole
  screenLayout Json     @default("{}")
  isDefault    Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  restaurant   Restaurant   @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  quickButtons QuickButton[]
  autoPrompts  AutoPrompt[]
  upsellRules  UpsellRule[]
  @@unique([restaurantId, role])
  @@map("workflow_configs")
}
model QuickButton {
  id               String @id @default(cuid())
  workflowConfigId String
  menuItemId       String
  position         Int
  color            String?
  workflowConfig WorkflowConfig @relation(fields: [workflowConfigId], references: [id], onDelete: Cascade)
  menuItem       MenuItem       @relation(fields: [menuItemId], references: [id])
  @@map("quick_buttons")
}
model AutoPrompt {
  id               String @id @default(cuid())
  workflowConfigId String
  triggerItemId    String
  modifierGroupId  String
  message          String
  workflowConfig WorkflowConfig @relation(fields: [workflowConfigId], references: [id], onDelete: Cascade)
  triggerItem    MenuItem       @relation(fields: [triggerItemId], references: [id])
  modifierGroup  ModifierGroup  @relation(fields: [modifierGroupId], references: [id])
  @@map("auto_prompts")
}
model UpsellRule {
  id               String  @id @default(cuid())
  workflowConfigId String
  triggerItemId    String
  message          String
  isActive         Boolean @default(true)
  workflowConfig WorkflowConfig @relation(fields: [workflowConfigId], references: [id], onDelete: Cascade)
  triggerItem    MenuItem       @relation("UpsellTrigger", fields: [triggerItemId], references: [id])
  suggestedItems MenuItem[]     @relation("UpsellTarget")
  @@map("upsell_rules")
}
model AuditLog {
  id           String   @id @default(cuid())
  restaurantId String
  userId       String?
  userName     String?
  action       String
  entityType   String
  entityId     String?
  details      Json?
  orderId      String?
  ipAddress    String?
  createdAt    DateTime @default(now())
  user  User?  @relation(fields: [userId], references: [id])
  order Order? @relation(fields: [orderId], references: [id])
  @@map("audit_logs")
}
enum UserRole { OWNER MANAGER SERVER BARTENDER CASHIER EXPO KDS }
enum ServiceMode { FULL_SERVICE QUICK_SERVICE BAR FOOD_TRUCK }
enum DayPart { BREAKFAST LUNCH DINNER LATE_NIGHT ALL_DAY }
enum MenuItemStatus { ACTIVE INACTIVE OUT_OF_STOCK }
enum ModifierType { SINGLE MULTIPLE }
enum TableStatus { AVAILABLE OCCUPIED RESERVED DIRTY BLOCKED }
enum OrderStatus { DRAFT OPEN SENT IN_PROGRESS READY SERVED PAID VOID REFUNDED }
enum OrderType { DINE_IN TAKEOUT DELIVERY BAR }
enum KDSItemStatus { PENDING IN_PROGRESS READY SERVED VOIDED }
enum PaymentMethod { CASH CREDIT_CARD DEBIT_CARD GIFT_CARD SPLIT COMP }
enum PaymentStatus { PENDING AUTHORIZED CAPTURED FAILED VOIDED REFUNDED }
enum TaxType { PERCENTAGE FLAT }
enum DiscountType { PERCENTAGE FLAT COMP }
enum StationType { KITCHEN BAR EXPO GRILL FRY DESSERT CUSTOM }
enum ClockEventType { CLOCK_IN CLOCK_OUT BREAK_START BREAK_END }
SCHEMA

echo "â Prisma schema created"

# ââ MAKEFILE ââââââââââââââââââââââââââââââââââââââââââââââââââ
cat > Makefile << 'EOF'
.PHONY: help install dev prod stop clean reset seed backup

help:
	@echo "ð½ï¸  RestaurantOS Commands:"
	@echo "  make install  â Install dependencies"
	@echo "  make dev      â Start development (DBs in Docker + app locally)"
	@echo "  make prod     â Start full production stack"
	@echo "  make stop     â Stop all containers"
	@echo "  make clean    â Remove containers + volumes"
	@echo "  make seed     â Reseed database"
	@echo "  make backup   â Backup PostgreSQL"

install:
	npm install && npm run db:generate

dev:
	docker-compose -f docker-compose.dev.yml up -d
	@echo "â³ Waiting for PostgreSQL..."
	@sleep 8
	npm run db:generate
	npm run db:migrate
	npm run db:seed
	npm run dev

prod:
	docker-compose up -d --build

stop:
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

clean:
	docker-compose down -v --remove-orphans
	docker-compose -f docker-compose.dev.yml down -v --remove-orphans

seed:
	npm run db:seed

backup:
	@mkdir -p backups
	docker exec pos_postgres_dev pg_dump -U posuser restaurant_pos > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "â Backup saved to backups/"
EOF

echo "â Makefile created"

# ââ FINISH ââââââââââââââââââââââââââââââââââââââââââââââââââââ
cd ..

echo ""
echo "ð¦ Creating ZIP archive..."
zip -r restaurant-pos-complete.zip restaurant-pos/ \
  --exclude "*/node_modules/*" \
  --exclude "*/.next/*" \
  --exclude "*/dist/*" \
  --exclude "*/.git/*"

echo ""
echo "ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ"
echo "â     â  restaurant-pos-complete.zip is ready!        â"
echo "â âââââââââââââââââââââââââââââââââââââââââââââââââââââââ£"
echo "â                                                      â"
echo "â  The ZIP contains the complete scaffolding.          â"
echo "â  Now copy the source files from the Claude chat      â"
echo "â  artifacts into their directories, then run:         â"
echo "â                                                      â"
echo "â    make install                                      â"
echo "â    make dev                                          â"
echo "â                                                      â"
echo "â  URLs after starting:                                â"
echo "â  â¢ POS  â http://localhost:3000/pos                  â"
echo "â  â¢ KDS  â http://localhost:3000/kds                  â"
echo "â  â¢ Adminâ http://localhost:3000/admin                â"
echo "â  â¢ API  â http://localhost:3001/docs                 â"
echo "â                                                      â"
echo "â  Demo PINs: 1234 / 2222 / 3333 / 4444               â"
echo "ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ"
