
# ð½ï¸ RestaurantOS â Complete Professional POS System

> Full-featured, production-ready Restaurant POS built with Next.js 14, Fastify, PostgreSQL & WebSockets

---

## ð Table of Contents

- [Quick Start (Development)](#-quick-start-development)
- [Production Deployment](#-production-deployment)
- [Project Structure](#-project-structure)
- [Features](#-features)
- [Login Credentials](#-login-credentials)
- [Environment Variables](#-environment-variables)
- [Tech Stack](#-tech-stack)
- [API Documentation](#-api-documentation)

---

## ð Quick Start (Development)

### Prerequisites
- **Node.js** 18+
- **Docker** & Docker Compose
- **npm** 9+

### Step 1 â Clone & Install
```bash
unzip restaurant-pos-complete.zip
cd restaurant-pos
npm install
```

### Step 2 â Start Databases
```bash
docker-compose -f docker-compose.dev.yml up -d

# Wait for PostgreSQL to be ready (~10 seconds)
```

### Step 3 â Setup Database
```bash
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Run migrations
npm run db:seed       # Seed demo data
```

### Step 4 â Start Dev Servers
```bash
npm run dev
```

### Step 5 â Open in Browser
| Service | URL |
|---------|-----|
| ð¥ï¸ POS Terminal | http://localhost:3000/pos |
| ð³ KDS Screen | http://localhost:3000/kds |
| âï¸ Admin Panel | http://localhost:3000/admin |
| ð API Docs | http://localhost:3001/docs |
| ðï¸ pgAdmin | http://localhost:5050 |
| ð´ Redis Commander | http://localhost:8081 |

---

## ð³ Production Deployment

### Option A â Full Docker Stack (Recommended)

```bash
# 1. Copy and configure environment
cp .env.production .env
# Edit .env with your secure values

# 2. Generate secure secrets
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)"

# 3. Build and start everything
docker-compose up -d --build

# 4. Run database migrations
docker exec pos_api npx prisma migrate deploy --schema=/app/prisma/schema.prisma

# 5. Seed initial data (first time only)
docker exec pos_api node dist/seed.js
```

### Option B â Manual (VPS/Cloud)

```bash
# Build
npm run build

# Set production env vars, then:
node apps/api/dist/index.js &
node apps/web/.next/standalone/server.js &
```

### Using Make (Easiest)
```bash
make dev    # Start development
make prod   # Start production
make stop   # Stop everything
make backup # Backup database
```

---

## ð Project Structure

```
restaurant-pos/
âââ ð¦ apps/
â   âââ ð api/                    # Fastify REST API
â   â   âââ src/
â   â   â   âââ index.ts           # Server bootstrap
â   â   â   âââ routes/
â   â   â   â   âââ auth.ts        # PIN + email login
â   â   â   â   âââ orders.ts      # Full order lifecycle
â   â   â   â   âââ payments.ts    # Payments + refunds
â   â   â   â   âââ menu.ts        # Menu + modifiers
â   â   â   â   âââ kds.ts         # Kitchen display
â   â   â   â   âââ tables.ts      # Floor plan
â   â   â   â   âââ staff.ts       # Staff management
â   â   â   â   âââ reports.ts     # Analytics
â   â   â   â   âââ inventory.ts   # Stock tracking
â   â   â   â   âââ discounts.ts   # Discount rules
â   â   â   â   âââ happyHours.ts  # Time pricing
â   â   â   â   âââ stations.ts    # KDS routing
â   â   â   â   âââ taxes.ts       # Tax config
â   â   â   â   âââ giftCards.ts   # Gift cards
â   â   â   â   âââ combos.ts      # Combo meals
â   â   â   â   âââ workflows.ts   # Role workflows
â   â   â   â   âââ audit.ts       # Audit trail
â   â   â   â   âââ websocket.ts   # WS handler
â   â   â   âââ websocket/
â   â   â       âââ manager.ts     # WS client manager
â   â   âââ Dockerfile
â   â
â   âââ ð web/                    # Next.js 14 PWA
â       âââ src/
â       â   âââ app/
â       â   â   âââ login/         # PIN login page
â       â   â   âââ pos/           # POS terminal
â       â   â   âââ kds/           # Kitchen display
â       â   â   âââ admin/         # Admin panel
â       â   â       âââ page.tsx   # Dashboard
â       â   â       âââ menu/      # Menu builder
â       â   â       âââ orders/    # Order management
â       â   â       âââ floor/     # Floor plan editor
â       â   â       âââ staff/     # Staff management
â       â   â       âââ reports/   # Analytics
â       â   â       âââ inventory/ # Stock management
â       â   â       âââ taxes/     # Tax config
â       â   â       âââ discounts/ # Discount rules
â       â   â       âââ happy-hours/ # Happy hours
â       â   â       âââ audit/     # Audit log
â       â   â       âââ settings/  # Restaurant config
â       â   âââ components/
â       â   â   âââ pos/           # POS components
â       â   â   âââ admin/         # Admin forms
â       â   âââ hooks/             # useWebSocket, etc.
â       â   âââ lib/               # API client
â       â   âââ store/             # Zustand stores
â       âââ Dockerfile
â
âââ ð¦ packages/
â   âââ db/                        # Prisma + PostgreSQL
â   â   âââ prisma/
â   â       âââ schema.prisma      # Full DB schema
â   â       âââ seed.ts            # Demo data
â   âââ shared/                    # Shared TypeScript types
â
âââ ð³ docker-compose.yml          # Production
âââ ð³ docker-compose.dev.yml      # Development (DBs only)
âââ ð§ Makefile                    # Convenience commands
âââ ð README.md
```

---

## â Features

### POS Terminal (`/pos`)
- ð  **Table Map** â Visual floor plan, status colors, elapsed time
- ð **Menu Grid** â Touch-friendly, category tabs, search, 86'd overlay
- ð **Order Panel** â Live order, qty controls, seat/course assignment
- âï¸ **Modifier Modal** â Required/optional groups, auto-defaults
- ð¥ **Fire to Kitchen** â Per-course or all items, with priority
- ð³ **Payment Flow** â Cash/Card/Gift Card, tip presets, change calc
- âï¸ **Split Bills** â Equal / by seat / by item
- ð·ï¸ **Discounts** â With manager approval workflow
- ð **Table Transfer** â Move order between tables
- â©ï¸ **Void Items/Orders** â With audit trail
- ð¡ **Real-time Sync** â WebSocket updates across all devices

### Kitchen Display (`/kds`)
- â±ï¸ **Live Timers** â Green â Yellow â Red color warnings
- ð **Station Routing** â Items routed to correct kitchen station
- â **Bump / Recall** â One-tap ready confirmation
- ð¨ **RUSH Priority** â Highlight urgent tickets
- ð **Stats Bar** â Pending count, average time

### Admin Panel (`/admin`)
- ð **Dashboard** â Real-time sales charts, KDS status, activity
- ð½ï¸ **Menu Builder** â Categories, items, modifiers, combos, pricing
- ðºï¸ **Floor Plan Editor** â Drag-and-drop table layout
- ð¥ **Staff Management** â Roles, PINs, clock in/out
- ð **Reports** â Sales, Item Mix, Staff Performance, Voids
- ð¦ **Inventory** â Stock tracking, restock, low-stock alerts
- ð **Gift Cards** â Create, track, redeem
- ðº **Happy Hours** â Time-based pricing rules
- ð¸ **Discounts** â Percentage, flat, comp with approval levels
- ð§¾ **Taxes** â Multiple tax rules, default/custom
- âï¸ **Settings** â Full restaurant configuration
- ð **Audit Log** â Every action tracked with pagination

---

## ð Login Credentials

| Role | PIN | Access |
|------|-----|--------|
| **Owner** | `1234` | Full system â settings, reports, all features |
| **Manager** | `2222` | Operations + reports, approve voids/discounts |
| **Server** | `3333` | POS terminal, own orders |
| **Bartender** | `4444` | POS terminal, bar tabs |

---

## ð Environment Variables

### `apps/api/.env`
```env
DATABASE_URL="postgresql://posuser:pospassword@localhost:5432/restaurant_pos"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="min-32-chars-change-in-production"
JWT_REFRESH_SECRET="different-secret-min-32-chars"
JWT_EXPIRES_IN="12h"
PORT=3001
NODE_ENV="development"
CORS_ORIGINS="http://localhost:3000"
```

### `apps/web/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_DEMO_LOCATION_ID=main-location
```

---

## ð ï¸ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 + App Router | PWA, SSR, routing |
| **UI** | Tailwind CSS + Framer Motion | Styling, animations |
| **State** | Zustand + React Query | Client state + server cache |
| **Charts** | Recharts | Analytics visualizations |
| **Backend** | Fastify 4 + TypeScript | REST API + WebSocket |
| **Database** | PostgreSQL 16 + Prisma | Data persistence + ORM |
| **Cache** | Redis 7 | Session + rate limiting |
| **Auth** | JWT + Refresh Tokens | Stateless auth |
| **Real-time** | WebSockets (native ws) | Live order updates |
| **PWA** | next-pwa | Offline + installable |
| **Containers** | Docker + Compose | Deployment |
| **Proxy** | Nginx | Production routing |
| **Monorepo** | npm workspaces | Shared packages |

---

## ð API Documentation

Swagger UI available at **http://localhost:3001/docs**

### Key Endpoints

```
POST /api/auth/pin-login         PIN authentication
POST /api/orders                 Create order
POST /api/orders/:id/items       Add items
POST /api/orders/:id/fire        Fire to kitchen
POST /api/payments               Process payment
GET  /api/reports/sales          Sales report
GET  /api/kds/tickets            KDS tickets
POST /api/kds/tickets/:id/bump   Bump ticket
GET  /api/menu/full              Full menu (POS)
WS   /ws/live                    WebSocket connection
```

---

## ð§ Common Commands

```bash
# Development
npm run dev              # Start all dev servers
npm run db:studio        # Open Prisma Studio (DB GUI)
npm run db:seed          # Reseed demo data

# Docker
make dev                 # Start dev environment
make prod                # Start production
make stop                # Stop all containers
make backup              # Backup PostgreSQL

# Database
npm run db:generate      # Regenerate Prisma client
npm run db:migrate       # Run pending migrations
```

---

## ð± PWA Installation

The POS works as a Progressive Web App on any device:

1. Open in Chrome/Safari on iPad/Android/Desktop
2. Click **"Add to Home Screen"** / **"Install App"**
3. Launches full-screen, works offline for viewing

---

## ð Security Notes for Production

1. **Change all default passwords** in `.env`
2. **Generate strong JWT secrets**: `openssl rand -base64 32`
3. **Enable HTTPS** via Nginx + Let's Encrypt
4. **Restrict database access** to internal network only
5. **Set `NODE_ENV=production`** to disable debug logging

---

*Built with â¤ï¸ â RestaurantOS v1.0*
