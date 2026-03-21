
#!/bin/bash
# RestaurantOS Complete Setup Script
# Run: chmod +x setup.sh && ./setup.sh

set -e

echo "ð½ï¸  Creating RestaurantOS POS System..."
echo "======================================="

ROOT="restaurant-pos"
mkdir -p $ROOT
cd $ROOT

# âââââââââââââââââââââââââââââââââââââââââââââ
# ROOT FILES
# âââââââââââââââââââââââââââââââââââââââââââââ

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
    "db:migrate":  "npm run migrate:dev --workspace=packages/db",
    "db:seed":     "npm run seed --workspace=packages/db",
    "db:studio":   "npx prisma studio --schema=packages/db/prisma/schema.prisma",
    "db:reset":    "npm run migrate:dev --workspace=packages/db -- --name init && npm run seed --workspace=packages/db",
    "lint":        "eslint . --ext .ts,.tsx",
    "type-check":  "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "concurrently": "^8.2.2",
    "eslint": "^8.56.0",
    "typescript": "^5.3.3"
  }
}
PKGJSON

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020","DOM","DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": {
      "@pos/shared": ["packages/shared/src/index.ts"],
      "@pos/db":     ["packages/db/src/index.ts"]
    }
  },
  "exclude": ["node_modules","dist",".next"]
}
EOF

cat > .gitignore << 'EOF'
node_modules/
dist/
.next/
out/
build/
.env
.env.local
.env.*.local
*.log
npm-debug.log*
.DS_Store
Thumbs.db
.vscode/
.idea/
*.tsbuildinfo
apps/web/public/sw.js
apps/web/public/workbox-*.js
packages/db/prisma/migrations/dev/
EOF

echo "â Root files created"

# âââââââââââââââââââââââââââââââââââââââââââââ
# DOCKER FILES
# âââââââââââââââââââââââââââââââââââââââââââââ

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
      retries: 5

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
      context: ./apps/api
      dockerfile: Dockerfile
    container_name: pos_api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - ./apps/api/.env.production
    ports:
      - "3001:3001"
    networks:
      - pos_network

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    container_name: pos_web
    restart: unless-stopped
    depends_on:
      - api
    env_file:
      - ./apps/web/.env.production
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

# Development override â only databases in Docker
# Run: docker-compose -f docker-compose.dev.yml up -d

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

  # Optional: pgAdmin for database management
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: pos_pgadmin
    restart: unless-stopped
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

echo "â Docker Compose files created"

# âââââââââââââââââââââââââââââââââââââââââââââ
# API DOCKERFILE
# âââââââââââââââââââââââââââââââââââââââââââââ

mkdir -p apps/api

cat > apps/api/Dockerfile << 'EOF'
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --workspace=apps/api --workspace=packages/db --workspace=packages/shared

# Build shared packages
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/api ./apps/api

RUN npm run build --workspace=packages/shared
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma
RUN npm run build --workspace=apps/api

# Production image
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat dumb-init
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify

COPY --from=builder --chown=fastify:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/packages/db/prisma ./prisma
COPY --from=builder --chown=fastify:nodejs /app/apps/api/package.json ./

USER fastify
EXPOSE 3001

ENTRYPOINT ["dumb-init","--"]
CMD ["node","dist/index.js"]
EOF

echo "â API Dockerfile created"

# âââââââââââââââââââââââââââââââââââââââââââââ
# WEB DOCKERFILE
# âââââââââââââââââââââââââââââââââââââââââââââ

mkdir -p apps/web

cat > apps/web/Dockerfile << 'EOF'
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --workspace=apps/web --workspace=packages/shared

# Build
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

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/web

# Production image
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node","server.js"]
EOF

echo "â Web Dockerfile created"

# âââââââââââââââââââââââââââââââââââââââââââââ
# ENV FILES
# âââââââââââââââââââââââââââââââââââââââââââââ

cat > apps/api/.env << 'EOF'
# âââ DATABASE âââââââââââââââââââââââââââââââ
DATABASE_URL="postgresql://posuser:pospassword@localhost:5432/restaurant_pos"

# âââ REDIS ââââââââââââââââââââââââââââââââââ
REDIS_URL="redis://localhost:6379"

# âââ JWT ââââââââââââââââââââââââââââââââââââ
JWT_SECRET="dev-jwt-secret-change-in-production-min-32-chars!!"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production-min-32!!"
JWT_EXPIRES_IN="12h"
JWT_REFRESH_EXPIRES_IN="7d"

# âââ SERVER âââââââââââââââââââââââââââââââââ
PORT=3001
HOST="0.0.0.0"
NODE_ENV="development"

# âââ CORS âââââââââââââââââââââââââââââââââââ
CORS_ORIGINS="http://localhost:3000"

# âââ STRIPE (optional) ââââââââââââââââââââââ
STRIPE_SECRET_KEY="sk_test_your_stripe_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
EOF

cat > apps/api/.env.example << 'EOF'
# âââ DATABASE âââââââââââââââââââââââââââââââ
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/restaurant_pos"

# âââ REDIS ââââââââââââââââââââââââââââââââââ
REDIS_URL="redis://HOST:6379"

# âââ JWT âââââââââââââââââââââââââââââââââââââ
# Generate with: openssl rand -base64 32
JWT_SECRET="CHANGE_ME_MIN_32_CHARS"
JWT_REFRESH_SECRET="CHANGE_ME_MIN_32_CHARS"
JWT_EXPIRES_IN="12h"
JWT_REFRESH_EXPIRES_IN="7d"

# âââ SERVER âââââââââââââââââââââââââââââââââ
PORT=3001
HOST="0.0.0.0"
NODE_ENV="production"

# âââ CORS âââââââââââââââââââââââââââââââââââ
CORS_ORIGINS="https://yourdomain.com"

# âââ STRIPE (optional) ââââââââââââââââââââââ
STRIPE_SECRET_KEY="sk_live_your_stripe_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
EOF

cat > apps/api/.env.production << 'EOF'
DATABASE_URL="postgresql://posuser:pospassword@postgres:5432/restaurant_pos"
REDIS_URL="redis://redis:6379"
JWT_SECRET="REPLACE_WITH_SECURE_SECRET_MIN_32_CHARS_IN_PROD"
JWT_REFRESH_SECRET="REPLACE_WITH_SECURE_REFRESH_SECRET_MIN_32_CHARS"
JWT_EXPIRES_IN="12h"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3001
HOST="0.0.0.0"
NODE_ENV="production"
CORS_ORIGINS="http://web:3000,http://localhost:3000"
EOF

cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_DEMO_LOCATION_ID=main-location
EOF

cat > apps/web/.env.example << 'EOF'
# API endpoint (no trailing slash)
NEXT_PUBLIC_API_URL=http://localhost:3001

# WebSocket endpoint
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Demo location ID (from seed)
NEXT_PUBLIC_DEMO_LOCATION_ID=main-location
EOF

cat > apps/web/.env.production << 'EOF'
NEXT_PUBLIC_API_URL=http://api:3001
NEXT_PUBLIC_WS_URL=ws://api:3001
NEXT_PUBLIC_DEMO_LOCATION_ID=main-location
EOF

echo "â Environment files created"

# âââââââââââââââââââââââââââââââââââââââââââââ
# PACKAGES - SHARED
# âââââââââââââââââââââââââââââââââââââââââââââ

mkdir -p packages/shared/src

cat > packages/shared/package.json << 'EOF'
{
  "name": "@pos/shared",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
EOF

cat > packages/shared/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "declarationMap": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules","dist"]
}
EOF

echo "â Shared package scaffolded"

# âââââââââââââââââââââââââââââââââââââââââââââ
# PACKAGES - DB
# âââââââââââââââââââââââââââââââââââââââââââââ

mkdir -p packages/db/src
mkdir -p packages/db/prisma

cat > packages/db/package.json << 'EOF'
{
  "name": "@pos/db",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "generate":    "prisma generate",
    "migrate:dev": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "seed":        "ts-node --project tsconfig.json prisma/seed.ts",
    "studio":      "prisma studio",
    "build":       "tsc"
  },
  "dependencies": {
    "@prisma/client": "^5.8.1"
  },
  "devDependencies": {
    "prisma": "^5.8.1",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
EOF

cat > packages/db/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules","dist"]
}
EOF

echo "â DB package scaffolded"

# âââââââââââââââââââââââââââââââââââââââââââââ
# API PACKAGE.JSON & TSCONFIG
# âââââââââââââââââââââââââââââââââââââââââââââ

cat > apps/api/package.json << 'EOF'
{
  "name": "@pos/api",
  "version": "1.0.0",
  "scripts": {
    "dev":   "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "migrate": "prisma migrate deploy --schema=../../packages/db/prisma/schema.prisma"
  },
  "dependencies": {
    "@fastify/cors":       "^9.0.1",
    "@fastify/helmet":     "^11.1.1",
    "@fastify/jwt":        "^8.0.1",
    "@fastify/multipart":  "^8.1.0",
    "@fastify/rate-limit": "^9.1.0",
    "@fastify/swagger":    "^8.14.0",
    "@fastify/swagger-ui": "^3.0.0",
    "@fastify/websocket":  "^10.0.1",
    "@pos/db":             "*",
    "@pos/shared":         "*",
    "@prisma/client":      "^5.8.1",
    "bcryptjs":            "^2.4.3",
    "dotenv":              "^16.4.1",
    "fastify":             "^4.26.2",
    "uuid":                "^9.0.1",
    "zod":                 "^3.22.4"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node":     "^20.11.0",
    "@types/uuid":     "^9.0.7",
    "tsx":             "^4.7.0",
    "typescript":      "^5.3.3"
  }
}
EOF

cat > apps/api/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "paths": {
      "@pos/shared": ["../../packages/shared/src/index.ts"],
      "@pos/db":     ["../../packages/db/src/index.ts"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules","dist"]
}
EOF

echo "â API config created"

# âââââââââââââââââââââââââââââââââââââââââââââ
# WEB PACKAGE.JSON, TSCONFIG, NEXT CONFIG
# âââââââââââââââââââââââââââââââââââââââââââââ

cat > apps/web/package.json << 'EOF'
{
  "name": "@pos/web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev":   "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "lint":  "next lint"
  },
  "dependencies": {
    "@headlessui/react":            "^1.7.18",
    "@heroicons/react":             "^2.1.1",
    "@tanstack/react-query":        "^5.17.19",
    "@tanstack/react-query-devtools":"^5.17.19",
    "axios":                        "^1.6.7",
    "clsx":                         "^2.1.0",
    "date-fns":                     "^3.3.1",
    "framer-motion":                "^11.0.3",
    "next":                         "14.1.0",
    "next-pwa":                     "^5.6.0",
    "react":                        "^18.2.0",
    "react-dom":                    "^18.2.0",
    "react-hot-toast":              "^2.4.1",
    "recharts":                     "^2.12.0",
    "tailwind-merge":               "^2.2.1",
    "zustand":                      "^4.5.0"
  },
  "devDependencies": {
    "@types/node":      "^20.11.0",
    "@types/react":     "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "autoprefixer":     "^10.4.17",
    "postcss":          "^8.4.33",
    "tailwindcss":      "^3.4.1",
    "typescript":       "^5.3.3"
  }
}
EOF

cat > apps/web/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom","dom.iterable","esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name":"next"}],
    "paths": {
      "@/*":         ["./src/*"],
      "@pos/shared": ["../../packages/shared/src/index.ts"]
    }
  },
  "include": ["next-env.d.ts","**/*.ts","**/*.tsx",".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

cat > apps/web/next.config.js << 'EOF'
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    domains: ['localhost','via.placeholder.com','images.unsplash.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_WS_URL:  process.env.NEXT_PUBLIC_WS_URL  || 'ws://localhost:3001',
  },
};

module.exports = withPWA(nextConfig);
EOF

cat > apps/web/tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',
          400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',
          800:'#1e40af',900:'#1e3a8a',
        },
      },
      fontFamily: { sans: ['Inter','system-ui','sans-serif'] },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4,0,0.6,1) infinite',
        'slide-up':   'slideUp 0.2s ease-out',
        'fade-in':    'fadeIn 0.15s ease-out',
      },
      keyframes: {
        slideUp: { '0%':{ transform:'translateY(10px)',opacity:'0' }, '100%':{ transform:'translateY(0)',opacity:'1' } },
        fadeIn:  { '0%':{ opacity:'0' }, '100%':{ opacity:'1' } },
      },
    },
  },
  plugins: [],
};
EOF

cat > apps/web/postcss.config.js << 'EOF'
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
EOF

echo "â Web config created"

# âââââââââââââââââââââââââââââââââââââââââââââ
# PWA MANIFEST
# âââââââââââââââââââââââââââââââââââââââââââââ

mkdir -p apps/web/public

cat > apps/web/public/manifest.json << 'EOF'
{
  "name": "RestaurantOS POS",
  "short_name": "RestaurantOS",
  "description": "Professional Restaurant Point of Sale",
  "start_url": "/pos",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "orientation": "any",
  "icons": [
    {"src":"/icon-192.png","sizes":"192x192","type":"image/png","purpose":"any maskable"},
    {"src":"/icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}
  ],
  "shortcuts": [
    {"name":"POS Terminal","url":"/pos","description":"Open POS"},
    {"name":"KDS","url":"/kds","description":"Kitchen display"},
    {"name":"Admin","url":"/admin","description":"Admin panel"}
  ],
  "categories": ["business","food"]
}
EOF

echo "â PWA manifest created"

# âââââââââââââââââââââââââââââââââââââââââââââ
# DIRECTORY STRUCTURE CREATION
# âââââââââââââââââââââââââââââââââââââââââââââ

# API source directories
mkdir -p apps/api/src/routes
mkdir -p apps/api/src/websocket

# Web source directories
mkdir -p apps/web/src/app/login
mkdir -p apps/web/src/app/pos
mkdir -p apps/web/src/app/kds
mkdir -p apps/web/src/app/admin/menu
mkdir -p apps/web/src/app/admin/orders
mkdir -p apps/web/src/app/admin/floor
mkdir -p apps/web/src/app/admin/staff
mkdir -p apps/web/src/app/admin/reports
mkdir -p apps/web/src/app/admin/inventory
mkdir -p apps/web/src/app/admin/taxes
mkdir -p apps/web/src/app/admin/discounts
mkdir -p apps/web/src/app/admin/happy-hours
mkdir -p apps/web/src/app/admin/stations
mkdir -p apps/web/src/app/admin/audit
mkdir -p apps/web/src/app/admin/settings
mkdir -p apps/web/src/app/admin/gift-cards
mkdir -p apps/web/src/app/admin/workflows
mkdir -p apps/web/src/components/pos
mkdir -p apps/web/src/components/admin
mkdir -p apps/web/src/hooks
mkdir -p apps/web/src/lib
mkdir -p apps/web/src/store

echo "â Directory structure created"

# âââââââââââââââââââââââââââââââââââââââââââââ
# HEALTHCHECK & UTILITY SCRIPTS
# âââââââââââââââââââââââââââââââââââââââââââââ

mkdir -p scripts

cat > scripts/start-dev.sh << 'SCRIPT'
#!/bin/bash
echo "ð Starting RestaurantOS development environment..."

# Start databases
docker-compose -f docker-compose.dev.yml up -d
echo "â³ Waiting for PostgreSQL..."
until docker exec pos_postgres_dev pg_isready -U posuser -d restaurant_pos 2>/dev/null; do
  sleep 1
done
echo "â PostgreSQL ready"

# Generate and migrate
npm run db:generate
npm run db:migrate
npm run db:seed

# Start dev servers
npm run dev
SCRIPT

cat > scripts/start-prod.sh << 'SCRIPT'
#!/bin/bash
echo "ð Starting RestaurantOS production..."

docker-compose up -d --build

echo "â³ Waiting for services..."
sleep 10

# Run migrations in API container
docker exec pos_api npx prisma migrate deploy --schema=/app/prisma/schema.prisma
docker exec pos_api node -e "
  const { execSync } = require('child_process');
  try { execSync('node dist/seed.js', { stdio: 'inherit' }); } catch(e) { console.log('Seed skipped (already seeded)'); }
"

echo ""
echo "â RestaurantOS is running!"
echo "   POS Terminal: http://localhost:3000/pos"
echo "   Admin Panel:  http://localhost:3000/admin"
echo "   KDS Screen:   http://localhost:3000/kds"
echo "   API Docs:     http://localhost:3001/docs"
echo "   pgAdmin:      Not available in production mode"
echo ""
echo "ð Default PINs: Owner=1234, Manager=2222, Server=3333, Bar=4444"
SCRIPT

cat > scripts/reset-db.sh << 'SCRIPT'
#!/bin/bash
echo "â ï¸  Resetting database..."
read -p "Are you sure? This will delete all data. (y/N): " confirm
if [ "$confirm" = "y" ]; then
  docker exec pos_postgres_dev psql -U posuser -c "DROP DATABASE IF EXISTS restaurant_pos;"
  docker exec pos_postgres_dev psql -U posuser -c "CREATE DATABASE restaurant_pos;"
  npm run db:migrate
  npm run db:seed
  echo "â Database reset complete"
else
  echo "Cancelled"
fi
SCRIPT

cat > scripts/backup-db.sh << 'SCRIPT'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/pos_backup_$TIMESTAMP.sql"
mkdir -p backups
docker exec pos_postgres pg_dump -U posuser restaurant_pos > $BACKUP_FILE
echo "â Database backed up to $BACKUP_FILE"
SCRIPT

chmod +x scripts/*.sh

echo "â Utility scripts created"

# âââââââââââââââââââââââââââââââââââââââââââââ
# NGINX CONFIG (for production)
# âââââââââââââââââââââââââââââââââââââââââââââ

mkdir -p nginx

cat > nginx/nginx.conf << 'EOF'
events {
  worker_connections 1024;
}

http {
  upstream api {
    server api:3001;
  }

  upstream web {
    server web:3000;
  }

  # Rate limiting
  limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

  server {
    listen 80;
    server_name _;

    # Redirect HTTP to HTTPS in production
    # return 301 https://$host$request_uri;

    # API
    location /api/ {
      limit_req zone=api burst=20 nodelay;
      proxy_pass http://api;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws/ {
      proxy_pass http://api;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "Upgrade";
      proxy_set_header Host $host;
      proxy_read_timeout 86400;
    }

    # Swagger docs
    location /docs {
      proxy_pass http://api;
      proxy_set_header Host $host;
    }

    # Next.js web app
    location / {
      proxy_pass http://web;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
    }
  }
}
EOF

# Add nginx to docker-compose
cat >> docker-compose.yml << 'EOF'

  nginx:
    image: nginx:alpine
    container_name: pos_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
      - web
    networks:
      - pos_network
EOF

echo "â Nginx config created"

# âââââââââââââââââââââââââââââââââââââââââââââ
# MAKEFILE
# âââââââââââââââââââââââââââââââââââââââââââââ

cat > Makefile << 'EOF'
.PHONY: help install dev prod stop clean reset-db backup logs

help:
	@echo ""
	@echo "ð½ï¸  RestaurantOS POS â Available Commands"
	@echo "========================================="
	@echo "  make install    Install all dependencies"
	@echo "  make dev        Start development environment"
	@echo "  make prod       Start production environment"
	@echo "  make stop       Stop all containers"
	@echo "  make clean      Remove containers and volumes"
	@echo "  make reset-db   Reset and reseed database"
	@echo "  make backup     Backup database"
	@echo "  make logs       Show container logs"
	@echo ""

install:
	npm install
	npm run db:generate

dev:
	@bash scripts/start-dev.sh

prod:
	@bash scripts/start-prod.sh

stop:
	docker-compose down

stop-dev:
	docker-compose -f docker-compose.dev.yml down

clean:
	docker-compose down -v --remove-orphans
	docker-compose -f docker-compose.dev.yml down -v --remove-orphans

reset-db:
	@bash scripts/reset-db.sh

backup:
	@bash scripts/backup-db.sh

logs:
	docker-compose logs -f

logs-api:
	docker-compose logs -f api

logs-web:
	docker-compose logs -f web

migrate:
	npm run db:migrate

seed:
	npm run db:seed

studio:
	npm run db:studio
EOF

echo "â Makefile created"

# âââââââââââââââââââââââââââââââââââââââââââââ
# FINAL SUMMARY
# âââââââââââââââââââââââââââââââââââââââââââââ

echo ""
echo "ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ"
echo "â         ð½ï¸  RestaurantOS POS â Setup Complete!         â"
echo "â âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ£"
echo "â                                                        â"
echo "â  Next Steps:                                           â"
echo "â                                                        â"
echo "â  1. Copy all source files from the artifacts into      â"
echo "â     their respective directories (see README.md)       â"
echo "â                                                        â"
echo "â  2. Start development:                                 â"
echo "â     make dev                                           â"
echo "â     â OR â                                             â"
echo "â     docker-compose -f docker-compose.dev.yml up -d    â"
echo "â     npm install && npm run db:generate                 â"
echo "â     npm run db:migrate && npm run db:seed              â"
echo "â     npm run dev                                        â"
echo "â                                                        â"
echo "â  3. Start production:                                  â"
echo "â     make prod                                          â"
echo "â     â OR â                                             â"
echo "â     docker-compose up -d --build                       â"
echo "â                                                        â"
echo "â  URLs:                                                 â"
echo "â  â¢ POS Terminal  â http://localhost:3000/pos           â"
echo "â  â¢ KDS Screen    â http://localhost:3000/kds           â"
echo "â  â¢ Admin Panel   â http://localhost:3000/admin         â"
echo "â  â¢ API Docs      â http://localhost:3001/docs          â"
echo "â  â¢ pgAdmin       â http://localhost:5050               â"
echo "â                                                        â"
echo "â  Demo PINs:                                            â"
echo "â  â¢ Owner    â 1234                                     â"
echo "â  â¢ Manager  â 2222                                     â"
echo "â  â¢ Server   â 3333                                     â"
echo "â  â¢ Bartenderâ 4444                                     â"
echo "â                                                        â"
echo "ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ"
echo ""
