# RestaurantOS UX Blueprint

---

## 1. Product Summary

### What it is
RestaurantOS is a cloud-native, multi-tenant SaaS platform that unifies point-of-sale, kitchen display, floor management, reservations, workforce scheduling, guest CRM, marketing, and back-office administration into a single operational system for restaurants.

### What problem it solves
Restaurants currently juggle 5–10 disconnected tools for POS, scheduling, reservations, guest management, inventory, payroll, and reporting. Each tool has its own login, data silo, and learning curve. Staff lose time context-switching, managers lose visibility, and owners lose money to operational friction. RestaurantOS consolidates these into one real-time platform purpose-built for restaurant operations under pressure.

### Who it is for
- Independent restaurant owners and operators (1–20 locations)
- Restaurant group / multi-unit operators
- Front-of-house staff (servers, bartenders, cashiers, hosts)
- Back-of-house staff (kitchen, expo, prep)
- Restaurant managers and shift leads
- Administrative and HR personnel

### Primary outcomes

**For the business:**
- Recurring SaaS revenue at $149–$399+/location/month
- Land-and-expand through multi-location growth
- Reduce churn by consolidating all operations into one platform (high switching cost)
- Upsell from Starter → Growth → Premium tiers

**For users:**
- Reduce per-order time by 30%+ via touch-optimized POS
- Eliminate double-entry across reservations, orders, and guest records
- Give managers real-time labor, sales, and floor visibility from one screen
- Enable staff self-service for schedules, shifts, and availability

---

## 2. User Types / Personas

### 2.1 Owner — "Alex"
- **Goals:** Maximize revenue, control labor cost, maintain quality across locations, understand business health at a glance
- **Motivations:** Growth, profitability, brand consistency, less time spent on admin
- **Frustrations:** Logging into multiple systems, unreliable reporting, staff scheduling headaches, no single view of multi-location performance
- **Main tasks:** Review dashboard KPIs, approve payroll, configure menu/pricing, monitor reports, manage staff roles, review audit logs
- **Technical comfort:** Medium — comfortable with tablets and web apps but not a power user

### 2.2 Manager — "Jordan"
- **Goals:** Execute smooth shifts, respond to rush conditions, manage staff in real-time, close shift accurately
- **Motivations:** Operational control, earning trust from ownership, minimizing crisis moments
- **Frustrations:** Context-switching between POS, scheduling tools, reservation books; approving comps/voids under pressure; scrambling for coverage
- **Main tasks:** Approve discounts/voids, manage floor assignments, review open orders, handle reservation conflicts, clock in/out staff, write shift log, run end-of-day reports
- **Technical comfort:** Medium-high — daily tablet/POS user, some desktop admin

### 2.3 Server — "Maria"
- **Goals:** Turn tables quickly, get accurate orders to kitchen fast, maximize tips
- **Motivations:** Speed, accuracy, tip income, minimal re-fires
- **Frustrations:** Slow POS, confusing modifiers, not knowing when food is ready, losing track of open tables
- **Main tasks:** Open/manage tables, enter orders with modifiers, fire courses, process payments, split checks
- **Technical comfort:** High on touch interfaces, low on back-office tools

### 2.4 Bartender — "Carlos"
- **Goals:** Manage bar tabs quickly, handle high-volume drink orders, maintain bar section flow
- **Motivations:** Speed during rush, accurate tab tracking, tip income
- **Frustrations:** Losing track of open tabs, slow payment splits, items routed to wrong station
- **Main tasks:** Open/close bar tabs, quick-add drinks, process cash/card payments, manage bar seating
- **Technical comfort:** High on touch interfaces

### 2.5 Host — "Priya"
- **Goals:** Seat guests efficiently, manage waitlist, honor reservations, minimize wait complaints
- **Motivations:** Smooth guest experience, avoiding overbooking, clear communication with servers
- **Frustrations:** Reservation conflicts, no visibility into table turn times, walk-in surges with no waitlist tool
- **Main tasks:** Check reservation book, seat arrivals, manage waitlist, assign tables, communicate with floor
- **Technical comfort:** Medium — comfortable with dedicated host station

### 2.6 Kitchen Staff — "Diego"
- **Goals:** Receive clear tickets, cook in correct order, communicate readiness
- **Motivations:** Clarity, reducing re-fires, keeping ticket times low
- **Frustrations:** Illegible tickets, unclear modifications, rush orders with no priority signal
- **Main tasks:** View KDS tickets, bump completed items, mark rush orders, recall tickets
- **Technical comfort:** Low-medium — needs large, obvious touch targets

### 2.7 Cashier — "Taylor"
- **Goals:** Process payments accurately and fast, handle splits/comps/gift cards
- **Motivations:** Accuracy, speed, minimal customer wait
- **Frustrations:** Complex split scenarios, gift card balance confusion, voiding items under pressure
- **Main tasks:** Process payments, apply discounts, handle refunds, manage gift cards
- **Technical comfort:** Medium

---

## 3. Core Jobs To Be Done

| # | Job | Primary Persona |
|---|-----|-----------------|
| 1 | Take an accurate order with modifiers in under 30 seconds | Server, Bartender |
| 2 | Fire courses to the correct kitchen station at the right time | Server, Manager |
| 3 | Process payment (single, split, comp, gift card) in under 15 seconds | Server, Cashier |
| 4 | See all open tables, their status, and time on current check | Server, Manager, Host |
| 5 | Seat a guest from reservation or waitlist with one tap | Host |
| 6 | View, bump, and prioritize kitchen tickets without confusion | Kitchen Staff |
| 7 | Know real-time sales, labor cost, and covers at any moment | Owner, Manager |
| 8 | Build and publish a weekly staff schedule in under 10 minutes | Manager |
| 9 | Request a shift swap or update availability from a phone | Server, Staff |
| 10 | Create/edit menu items, modifiers, combos, and pricing rules | Owner, Manager |
| 11 | Manage reservations, prevent overbooking, and handle no-shows | Host, Manager |
| 12 | Track guest preferences, visit history, and VIP status | Host, Manager |
| 13 | Run end-of-day, sales, item-mix, and void reports | Owner, Manager |
| 14 | Monitor inventory levels and receive low-stock alerts | Manager |
| 15 | Set up and manage happy hours, discounts, and gift cards | Owner, Manager |
| 16 | Onboard a new restaurant location with minimal friction | Owner |
| 17 | Evaluate the product and convert from demo to paid | Prospective Owner |

---

## 4. Feature Inventory

### Core Features
- **POS Terminal** — Touch-optimized order entry with table map, menu grid, modifier selection, course/seat assignment, quick buttons
- **Kitchen Display System (KDS)** — Real-time ticket routing by station, bump/recall, rush priority, timer-based urgency colors
- **Floor Management** — Visual floor plan with drag-and-drop table layout, room/section management, live table status
- **Payment Processing** — Cash, card, gift card, split (equal/by-seat/by-item), comp, tip presets, change calculation, refunds
- **Menu Management** — Categories, items, modifier groups, combos, daypart filtering, pricing overrides, item status control
- **Order Management** — Order lifecycle (draft → open → sent → in-progress → ready → served → paid), void with audit trail, order transfer
- **Reservations** — Reservation book, confirmation codes, status tracking, table/server suggestions, guest linking, external source tracking
- **Waitlist** — Queue management, estimated wait times, SMS notifications, walk-in to waitlist conversion
- **Real-time Sync** — WebSocket-based live updates across all POS terminals, KDS stations, and host stands

### Secondary Features
- **Happy Hours** — Time-of-day and day-of-week promotional pricing rules
- **Discounts** — Percentage, flat, and comp discounts with manager approval workflow
- **Gift Cards** — Issuance, redemption, balance tracking
- **Tax Configuration** — Percentage and flat tax rules per category or item
- **Combo Builder** — Bundled items with component pricing
- **Pricing Overrides** — Time/day-based item-level price adjustments
- **Quick Buttons** — Customizable shortcut grids per role
- **Auto-Prompts** — Automatic modifier suggestions when specific items are added
- **Upsell Rules** — Trigger-based item suggestions during order entry
- **Public Online Ordering** — Guest-facing ordering experience with restaurant branding
- **Offline Mode** — Offline queue with sync recovery for connectivity interruptions

### Admin Features
- **Dashboard** — Real-time KPIs (sales, covers, labor cost, avg check), activity feed, KDS status
- **Staff Management** — CRUD staff records, role assignment, PIN management, clock in/out tracking
- **Workforce Scheduling** — Weekly schedule builder, auto-schedule, section assignments, labor forecasting
- **Payroll** — Export batches, hourly breakdowns, overtime tracking, tip pool distribution
- **People Ops** — Employee documents (I-9, W-4), acknowledgement signatures
- **Hiring** — Job postings, candidate tracking, pipeline stages
- **Floor Plan Editor** — Drag-and-drop table placement, room management, section definition
- **Station Configuration** — Kitchen station setup with category routing rules
- **Workflow Builder** — Role-based screen layout customization
- **Settings** — Restaurant configuration, timezone, currency, service mode
- **Audit Log** — Complete action history with user, action type, entity, IP, timestamp

### Support Features
- **Support Tickets** — In-app ticket creation and tracking
- **Live Chat** — Real-time support chat widget
- **Voice Support** — In-app voice call support
- **WebSocket Status Banner** — Connection health indicator across all operational screens
- **API Keep-Alive** — Background connection maintenance

### Analytics / Reporting Features
- **Sales Reports** — Revenue by period, payment method, order type
- **Item Mix Reports** — Item popularity, category breakdown, sales volume
- **Staff Performance** — Sales per server, covers handled, average check
- **Void Reports** — Void audit with reason tracking and approval chain
- **Labor Reports** — Hours worked, labor cost vs. revenue, overtime
- **Inventory Reports** — Stock levels, movement history, low-stock alerts

### Guest & Marketing Features
- **Guest CRM** — Profiles with dietary preferences, allergies, VIP levels, visit history, spend tracking
- **Guest Tagging** — Color-coded custom tags with segmentation
- **Guest Notes** — Service, dietary, and preference notes
- **Campaign Builder** — SMS/email campaigns with manual and automated triggers
- **Campaign Triggers** — Birthday, lapse, loyalty, post-visit, slow-period automations
- **Guest Segmentation** — Rule-based audience filters for targeted campaigns
- **Campaign Analytics** — Delivery status, open rates, conversion tracking, revenue attribution

### Future / Optional Features
- **Loyalty Program** — Points/rewards system with redemption at POS
- **Catering / Invoicing** — Future-date large orders with invoice generation
- **Hardware Abstraction** — Printer, scanner, cash drawer, payment terminal integration layer
- **App Marketplace** — Third-party integration registry with webhook management
- **AI Operations Intelligence** — Demand forecasting, staffing recommendations, menu engineering insights
- **Reservation Widget** — Embeddable booking widget for restaurant websites
- **Curbside Pickup** — Arrival notifications and pickup stage tracking
- **Multi-location Benchmarking** — Cross-location KPI comparison and rollup dashboards
- **Labor Compliance Engine** — Overtime, break, minor labor, and spread-of-hours rule enforcement
- **Performance Management** — Staff reviews, coaching notes, scorecards

---

## 5. Information Architecture

### 5.1 Global Navigation Structure

```
PUBLIC (Unauthenticated)
├── / .......................... Landing page / marketing site
├── /login ..................... PIN or email authentication
├── /demo ...................... Demo request form
├── /contact-sales ............. Sales inquiry form
├── /staff ..................... Staff lookup / clock-in portal
└── /[restaurantId] ........... Public restaurant page + online ordering

OPERATIONAL (Authenticated — POS token)
├── /[restaurantId]/pos ........ POS terminal
├── /[restaurantId]/kds ........ Kitchen display system
├── /[restaurantId]/host ....... Host / reservation station
└── /[restaurantId]/team ....... Staff self-service hub
    ├── My Schedule
    ├── Availability
    ├── Time Off
    └── Shift Marketplace

ADMIN (Authenticated — Manager/Owner)
└── /[restaurantId]/admin
    ├── Dashboard .............. Real-time KPIs and activity
    │
    ├── OPERATIONS
    │   ├── Orders ............. Order history and management
    │   ├── Floor .............. Floor plan editor
    │   ├── Tables ............. Table configuration
    │   ├── Stations ........... KDS station routing
    │   ├── Reservations ....... Reservation book management
    │   └── Workflows .......... Role-based screen customization
    │
    ├── MENU & PRICING
    │   ├── Menu ............... Menu categories and items
    │   ├── Modifiers .......... Modifier group configuration
    │   ├── Combos ............. Combo meal builder
    │   ├── Pricing ............ Pricing overrides / dayparts
    │   ├── Discounts .......... Discount rules
    │   ├── Happy Hours ........ Time-based promotions
    │   ├── Taxes .............. Tax rule configuration
    │   └── Gift Cards ......... Gift card management
    │
    ├── PEOPLE
    │   ├── Staff .............. Staff records, roles, PINs
    │   ├── Workforce .......... Scheduling, labor forecasting
    │   ├── Payroll ............ Payroll export and processing
    │   ├── People Ops ......... Employee documents
    │   └── Hiring ............. Job postings, candidates
    │
    ├── GUESTS & MARKETING
    │   ├── Guests ............. Guest CRM and segmentation
    │   └── Marketing .......... Campaign builder
    │
    ├── INTELLIGENCE
    │   ├── Reports ............ Sales, item mix, staff, voids
    │   ├── Audit .............. Complete audit log
    │   └── Intelligence ....... Operations insights (gated)
    │
    └── SYSTEM
        ├── Settings ........... Restaurant configuration
        ├── Integrations ....... Third-party connections
        ├── Control Center ..... System controls
        └── Support ............ Support tickets

SAAS PLATFORM ADMIN (Authenticated — SaaS admin token)
└── /admin
    ├── Dashboard .............. Platform-wide metrics
    ├── Restaurants ............ Tenant management
    ├── Pricing ................ SaaS billing / plans
    └── [All admin subsections via tenant context]
```

### 5.2 Hidden / System Pages
- `/api/*` — API endpoints (not user-facing)
- `/ws/live` — WebSocket connection endpoint
- Error pages (404, 500, offline)
- Auth callback / token refresh pages
- Print layouts for receipts and reports

### 5.3 Authenticated vs Unauthenticated

| Area | Auth Required | Token Type | Roles |
|------|---------------|-----------|-------|
| Landing, demo, contact | No | — | — |
| Public restaurant page | No | — | — |
| Online ordering | No | — | — |
| POS terminal | Yes | `pos_token` | SERVER, BARTENDER, CASHIER, MANAGER, OWNER |
| KDS | Yes | `pos_token` | KDS, EXPO, MANAGER |
| Host station | Yes | `pos_token` | SERVER, MANAGER, OWNER |
| Staff hub | Yes | `pos_token` | All roles |
| Admin panel | Yes | `pos_token` | MANAGER, OWNER |
| SaaS admin | Yes | `saas_admin_token` | Platform admins |

---

## 6. Primary User Flows

### 6.1 First-Time Visitor (Marketing → Demo)

**User goal:** Understand the product and request a demo.

**Steps:**
1. Land on `/` — see hero section with value proposition
2. Scroll through feature pillars (Live reporting, Reservations, Guest intelligence, SmartSchedule, Floor & POS, Marketing)
3. See pricing tiers (Starter $149, Growth $279, Premium)
4. See social proof / trust signals
5. Click "Get a demo" or "Start free trial"
6. Fill out demo signup form (name, email, restaurant name, phone, location count)
7. Submit → confirmation screen with next steps
8. Receive email confirmation with scheduling link

**Decision points:**
- Pricing page vs. demo form — user evaluating cost before committing
- "Contact Sales" for larger operators who want custom pricing

**Failure points:**
- Form validation errors (missing required fields)
- Server error on submission
- User abandons at pricing (too expensive / unclear value)

**UX opportunities:**
- Show interactive product screenshots or video on landing
- Pre-fill location count = 1 as default to reduce friction
- Add live chat widget for real-time questions during evaluation
- Show competitor comparison positioning

### 6.2 Sign Up / Onboarding

**User goal:** Set up a new restaurant on the platform.

**Steps:**
1. Receive onboarding email with account activation link
2. Set password and confirm account
3. Enter restaurant details (name, address, timezone, currency, service mode)
4. Enter first location details
5. Choose plan tier
6. Enter payment information
7. **Guided setup wizard:**
   - a. Create first floor plan (or use template)
   - b. Add initial menu categories and items (or import)
   - c. Configure tax rules
   - d. Add first staff members with roles and PINs
   - e. Configure kitchen stations
8. Complete setup → redirected to admin dashboard
9. First-use coach marks highlight key features

**Decision points:**
- Plan selection (Starter vs. Growth vs. Premium)
- Skip optional setup steps vs. complete them now
- Import menu vs. manual entry

**Failure points:**
- Payment processing failure
- Complex menu import errors
- User overwhelm during multi-step setup

**UX opportunities:**
- Allow skipping non-critical setup steps with "Complete later" prompts
- Provide menu templates by cuisine type
- Show progress indicator through setup wizard
- Offer 14-day trial without payment

### 6.3 Login / Returning User

**User goal:** Authenticate and reach the appropriate workspace quickly.

**Flow A — Staff PIN Login (Primary for service):**
1. Navigate to `/[restaurantId]/login` or `/staff`
2. See PIN pad with restaurant branding
3. Enter 4–6 digit PIN
4. System identifies role → routes to appropriate workspace:
   - SERVER/BARTENDER/CASHIER → POS terminal
   - KDS → Kitchen display
   - MANAGER → POS or Admin (based on last session)
   - OWNER → Admin dashboard

**Flow B — Email Login (Managers/Owners):**
1. Navigate to `/login`
2. Enter email and password
3. Select restaurant/location if multi-tenant
4. Route to admin dashboard

**Failure points:**
- Incorrect PIN → shake animation + "Invalid PIN" message, max 5 attempts then lockout
- Incorrect email/password → generic "Invalid credentials" (no email enumeration)
- Expired session → redirect to login with "Session expired" message

**UX opportunities:**
- Remember last location/restaurant on device
- Show staff name and avatar after PIN entry for confirmation
- Quick-switch between roles for managers who also serve

### 6.4 Core POS Order Flow

**User goal:** Take order, send to kitchen, and process payment.

**Steps:**
1. **Select table** — Tap table on floor map (or create quick order for takeout/bar)
2. **Choose order type** — DINE_IN / TAKEOUT / DELIVERY / BAR (modal)
3. **Enter items:**
   - a. Browse categories via tab bar
   - b. Tap item in menu grid
   - c. If item has required modifiers → modifier modal appears automatically
   - d. Select modifiers (single/multiple), confirm
   - e. Item appears in order panel with price
   - f. Adjust quantity, add seat/course assignment, add notes
   - g. Repeat for all items
4. **Fire to kitchen:**
   - a. Tap "Fire" (sends all unfired items)
   - b. Or fire by course (Fire Course 1, then Course 2 later)
   - c. Confirm fire → items route to assigned KDS stations
   - d. Ticket appears on KDS with timer
5. **Add more items** (optional — additional rounds)
6. **Process payment:**
   - a. Tap "Pay" on order panel → Payment modal opens
   - b. See order total with tax breakdown
   - c. Apply discount if needed (may require manager approval)
   - d. Select payment method:
      - Cash → enter amount tendered → show change
      - Card → process card payment
      - Gift card → scan/enter code → deduct balance
      - Split → choose split method (equal / by seat / by item)
      - Comp → select comp reason → requires manager approval
   - e. Add tip (preset percentages or custom amount)
   - f. Confirm payment → print/email receipt
7. **Table clears** — Status returns to AVAILABLE, table color resets on floor map

**Decision points:**
- Order type selection (dine-in vs. takeout changes the flow)
- Course assignment (fire all at once vs. coursed dining)
- Split check method selection
- Discount requiring manager approval

**Failure points:**
- WebSocket disconnect mid-order → offline queue activates, banner appears
- Payment processor timeout → retry mechanism with status feedback
- Modifier conflict (required modifier not selected) → prevent fire until resolved
- Item out of stock mid-order → visual indicator + server notification

**UX opportunities:**
- Quick buttons for most-ordered items (role-customizable)
- Auto-prompt modifiers for common pairings (e.g., steak → temp)
- Upsell suggestions at strategic moments (e.g., "Add side?" after entrée)
- Persistent order panel visibility — never auto-collapse during active order
- One-tap reorder for regulars via guest history

### 6.5 Kitchen Display Flow

**User goal:** Receive, triage, and complete tickets without errors.

**Steps:**
1. KDS screen shows live ticket grid filtered by station
2. New ticket animates in with audible chime
3. Ticket displays: table/order number, items with modifiers, time elapsed, priority
4. Timer color progression: Green (0–8min) → Yellow (8–15min) → Red (15min+)
5. Station lead works tickets left-to-right, oldest first
6. For RUSH tickets: red border + "RUSH" badge, pushed to front
7. When item(s) complete → tap "Bump" button on ticket
8. Bumped ticket moves to expo or clears
9. If bumped by mistake → "Recall" action brings it back
10. All-clear state when no active tickets

**Failure points:**
- WebSocket disconnect → stale tickets, missed orders (critical)
- Touch misfire on bump → recall must be fast and obvious
- Ticket overflow during rush → scrolling/pagination needed without losing urgency

**UX opportunities:**
- Station load indicator (active ticket count and average time)
- Sound differentiation for RUSH vs. normal tickets
- Batch bump for multi-item tickets that complete together
- Simplified header — maximize ticket grid real estate

### 6.6 Host / Reservation Flow

**User goal:** Seat guests efficiently from reservations or walk-ins.

**Steps:**
1. Host sees split view: reservation rail (left) + floor map (right)
2. **Seating a reservation:**
   - a. See upcoming reservations sorted by time
   - b. Guest arrives → tap reservation card → status changes to ARRIVED
   - c. System suggests best available table based on party size and section balance
   - d. Tap suggested table (or choose manually) → SEATED
   - e. Server assignment auto-populates based on section
3. **Seating a walk-in:**
   - a. Tap "Add Walk-in" in rail
   - b. Enter party size (and optionally guest name/phone)
   - c. If table available → suggest table → seat immediately
   - d. If no table → add to waitlist with estimated time → SMS notification when ready
4. **Managing waitlist:**
   - a. View ranked waitlist in rail
   - b. Table opens → system suggests next waitlist party by size fit
   - c. Tap to notify guest (SMS) → guest confirms → seat
5. **Handling no-shows:**
   - a. Reservation passes grace period (15 min default)
   - b. System flags as potential no-show
   - c. Host confirms no-show → frees table → available for walk-in/waitlist

**Failure points:**
- Overbooking (two reservations for same table/time) → conflict indicator in booking
- Guest doesn't respond to SMS → fallback notification, timeout
- Server section imbalanced → visual indicator showing section load

**UX opportunities:**
- Auto-suggest table + server in one action (reduce from 3 taps to 1)
- Turn-time estimates based on historical data per table
- "Pacing view" showing upcoming covers by 15-min interval
- Quick guest lookup by phone number

### 6.7 Account / Settings Flow

**User goal:** Configure restaurant operations.

**Steps:**
1. Navigate to Admin → Settings
2. **Restaurant profile:** Name, address, phone, timezone, currency, service mode, logo
3. **Location management:** Add/edit locations, set active/inactive
4. **Operational settings:**
   - Default order type
   - Auto-fire behavior
   - Receipt configuration
   - Printer assignments
   - Grace period for no-shows
5. **Notification preferences:** Email, SMS, in-app alert thresholds
6. **Billing:** View current plan, upgrade/downgrade, payment method, invoices
7. Save changes → confirmation toast

**Failure points:**
- Timezone change affects historical data display (warn before change)
- Plan downgrade may disable features (show impact before confirming)

### 6.8 Support / Help Flow

**User goal:** Get help with the system quickly.

**Steps:**
1. Click support icon (persistent in admin sidebar or via floating widget)
2. Choose channel: Live Chat, Phone, or Submit Ticket
3. **Live Chat:** Opens chat panel → type message → real-time agent response
4. **Phone:** Initiates in-app voice connection
5. **Ticket:** Fill form (category, priority, description) → submit → receive ticket ID
6. Track ticket status in Support section

**Failure points:**
- No agent available → queue position indicator + estimated wait
- Chat disconnect → conversation history preserved in ticket

### 6.9 Admin Workforce / Scheduling Flow

**User goal:** Build and publish the weekly schedule.

**Steps:**
1. Navigate to Admin → Workforce → Schedule tab
2. See weekly grid: columns = days, rows = staff members
3. **Manual scheduling:**
   - a. Click cell → set shift start/end, role, section
   - b. Drag to extend/shorten shifts
   - c. Copy previous week's schedule as template
4. **Auto-schedule:**
   - a. Click "Auto Schedule" → system generates optimal schedule based on:
      - Staff availability
      - Role requirements
      - Labor budget
      - Historical demand
   - b. Review and adjust auto-generated schedule
5. **Publish:** Click "Publish" → all affected staff receive notifications
6. **Monitor labor:** See projected labor cost vs. forecasted revenue in sidebar metrics
7. **Handle requests:**
   - a. Shift swap requests appear in queue
   - b. Approve/deny with one tap
   - c. Time-off requests appear separately

**Failure points:**
- Conflict detection failures (double-booked staff) → highlight conflicts in red
- Staff unavailable for auto-scheduled shift → show warning before publish
- Labor cost exceeds target → warning indicator with $ over/under

---

## 7. Page-by-Page UX Requirements

### 7.1 Landing Page (`/`)

- **Purpose:** Convert visitors into demo requests or trial signups
- **Primary user goal:** Understand what the product does and why it's better
- **Key content:**
  - Hero headline + subheadline with value proposition
  - Product screenshot or interactive demo
  - 6 feature pillar sections (Floor & POS, KDS, Reservations, Workforce, Guest Intelligence, Reporting)
  - Pricing table (3 tiers)
  - Social proof (restaurant logos, testimonials, stats)
  - FAQ section
  - Final CTA
- **Key components:** Hero section, feature cards, pricing table, testimonial carousel, CTA buttons, sticky nav
- **Actions:** "Get a Demo", "Start Free Trial", "Contact Sales", plan selection
- **Hierarchy:** Hero → Features → Pricing → Social Proof → CTA
- **Trust signals:** Restaurant count, uptime guarantee, security badges, testimonials
- **Conversion elements:** Primary CTA above fold, pricing with highlighted recommended plan, sticky header CTA
- **Edge cases:** Visitor on mobile (single-column layout), slow image loading (skeleton placeholders), referred visitor with promo code (auto-apply)

### 7.2 Login Page (`/login`, `/[restaurantId]/login`)

- **Purpose:** Authenticate users quickly
- **Primary user goal:** Get into the system in under 5 seconds
- **Key content:**
  - Restaurant logo/name (tenant-branded)
  - PIN pad (primary) or email/password form
  - Staff name display after PIN validation
- **Key components:** NumPad, email/password form, role indicator, error state
- **Actions:** Enter PIN, submit credentials, switch to email login, "Forgot PIN" link
- **Hierarchy:** Logo → Auth input → Submit → Secondary options
- **Trust signals:** Secure connection indicator, restaurant branding
- **Edge cases:**
  - 5 failed attempts → temporary lockout with countdown
  - Device offline → show cached PIN validation if available
  - Multi-location user → location selector after auth
  - Staff member deactivated → "Account disabled, contact manager"

### 7.3 POS Terminal (`/[restaurantId]/pos`)

- **Purpose:** Primary operational interface for order entry and payment
- **Primary user goal:** Take and process orders as fast as possible
- **Key content:**
  - Floor plan with live table statuses
  - Menu grid organized by categories
  - Active order panel with running total
  - Open orders / open checks list
- **Key components:**
  - `POSHeader` — shift info, location, notification bell, server name
  - `TableMap` — interactive floor plan with color-coded table status
  - `MenuGrid` — scrollable category tabs + item grid
  - `OrderPanel` — line items, modifiers, subtotal/tax/total, fire/pay actions
  - `OpenOrdersPanel` — all active checks with table, server, amount, time
  - `ModifierModal` — required/optional modifier selection
  - `PaymentModal` — full payment processing interface
  - `OrderTypeModal` — dine-in/takeout/delivery/bar selector
  - Quick buttons bar — customizable shortcuts
- **Actions:** Select table, add item, modify item, adjust quantity, add note, assign seat/course, fire order, open payment, apply discount, void item, transfer table
- **Hierarchy:**
  1. Active order (always visible)
  2. Menu/Floor (primary workspace, switchable)
  3. Header (minimal, essential info only)
  4. Open orders (accessible but not primary)
- **Trust signals:** WebSocket connection indicator, offline mode badge, last sync timestamp
- **Conversion elements:** N/A (operational screen)
- **Edge cases:**
  - Offline mode → queue orders locally, show offline banner, sync when reconnected
  - Item 86'd (out of stock) → grayed out item with "86" badge, prevent adding
  - Modifier conflict → block fire until resolved, highlight missing required mods
  - Large party (20+) → order panel scrolls gracefully, course grouping essential
  - Quick service mode (no tables) → skip table selection, go straight to menu
  - Printer offline → show warning, allow order to proceed, retry print

### 7.4 Kitchen Display System (`/[restaurantId]/kds`)

- **Purpose:** Display and manage kitchen tickets for food preparation
- **Primary user goal:** See what needs to be cooked and mark items done
- **Key content:**
  - Active ticket grid
  - Station filter strip
  - Ticket timers with urgency colors
  - Summary metrics (active tickets, avg time, overdue count)
- **Key components:** `TicketCard`, station tab bar, bump button, recall button, summary bar
- **Actions:** Bump ticket, recall ticket, mark rush, filter by station, view all
- **Hierarchy:**
  1. Ticket grid (dominant — 85%+ of screen)
  2. Station filter (top strip)
  3. Summary metrics (compact top bar)
- **Edge cases:**
  - 50+ active tickets → auto-scroll with urgency sort, overflow indicator
  - WebSocket disconnect → CRITICAL — show full-screen reconnecting overlay
  - Station has zero tickets → show "All Clear" congratulatory state
  - Rush ticket → auto-sort to front with visual + audio alert

### 7.5 Host Station (`/[restaurantId]/host`)

- **Purpose:** Manage guest seating, reservations, and waitlist
- **Primary user goal:** Seat the next guest quickly and correctly
- **Key content:**
  - Reservation rail with upcoming/arrived/waitlist
  - Live floor map with table status
  - Guest lookup
  - Pacing information
- **Key components:** Reservation cards, waitlist queue, floor map (shared with POS), table suggestion panel, guest search
- **Actions:** Seat guest, add to waitlist, mark arrived, mark no-show, search guest, create walk-in reservation, assign table, notify waitlist guest
- **Hierarchy:**
  1. Floor map (primary workspace — right 60%)
  2. Reservation/waitlist rail (left 40%)
  3. Actions bar (contextual, bottom of rail)
- **Edge cases:**
  - Large party + no available table → auto-suggest table combinations
  - VIP guest → VIP badge on reservation card + suggested best table
  - Reservation with special request → visible note icon, expandable on tap
  - SMS notification failure → show retry action + fallback option
  - Table occupied past expected turn → highlight on floor with overtime indicator

### 7.6 Admin Dashboard (`/[restaurantId]/admin`)

- **Purpose:** Provide real-time operational overview and quick access to all management functions
- **Primary user goal:** Understand business health at a glance
- **Key content:**
  - KPI cards: today's revenue, covers, average check, labor cost %
  - Sales chart (hourly/daily/weekly toggle)
  - KDS status summary (active tickets, avg cook time, stations)
  - Activity feed (recent orders, clock events, reservations)
  - Quick actions (open POS, view reports, manage staff)
- **Key components:** `KPICard`, sales chart, activity list, KDS mini-monitor, quick action buttons
- **Actions:** Toggle date range, switch location, drill into any KPI, open reports, launch POS
- **Hierarchy:**
  1. KPI strip (top)
  2. Sales chart (primary visual)
  3. KDS status + activity (side-by-side below)
  4. Quick actions (bottom)
- **Edge cases:**
  - No data yet (new restaurant) → "Complete setup to see your first metrics" with setup link
  - Multi-location user → location selector, aggregate vs. individual view
  - Data loading → skeleton placeholders matching KPI card layout

### 7.7 Menu Management (`/[restaurantId]/admin/menu`)

- **Purpose:** Create and manage the full restaurant menu
- **Primary user goal:** Add/edit/organize menu items and categories
- **Key content:**
  - Category list with drag-to-reorder
  - Item grid per category
  - Item detail panel/drawer
- **Key components:** Category sidebar, item grid, `MenuItemForm`, `CategoryForm`, bulk actions toolbar, search/filter
- **Actions:** Add category, add item, edit item, set item status (active/inactive/86), reorder, assign modifiers, set pricing, duplicate item, bulk edit
- **Hierarchy:**
  1. Category list (left sidebar)
  2. Item grid (main area)
  3. Item detail (drawer from right)
- **Edge cases:**
  - Category with 100+ items → virtual scroll, search within category
  - Item with photo → image upload with crop, fallback to icon/color
  - Deleting item with active orders → warning before deletion, soft-delete
  - Bulk operations → select multiple items, batch edit price/status/category

### 7.8 Staff Management (`/[restaurantId]/admin/staff`)

- **Purpose:** Manage staff records, roles, and access
- **Primary user goal:** Add/edit staff and control system access
- **Key content:**
  - Staff directory list with role badges
  - Individual staff record details
  - Clock event history
- **Key components:** Staff list with search/filter, staff detail drawer, role selector, PIN generator, clock history table
- **Actions:** Add staff, edit role, generate/reset PIN, deactivate, view clock history, assign locations
- **Edge cases:**
  - Duplicate PIN → system prevents, shows "PIN already in use"
  - Deactivating staff with open orders → warn and require order transfer
  - Staff at multiple locations → location assignment UI

### 7.9 Workforce Scheduling (`/[restaurantId]/admin/workforce`)

- **Purpose:** Build, publish, and manage staff schedules
- **Primary user goal:** Create an optimal schedule that meets demand and budget
- **Key content:**
  - Weekly schedule grid
  - Availability matrix overlay
  - Labor cost projections
  - Shift swap request queue
  - Section assignment view
- **Key components:** Schedule grid, shift card, availability overlay, labor cost sidebar, request queue, auto-schedule dialog
- **Actions:** Create shift, drag-to-adjust, auto-schedule, publish, approve swaps, view labor cost, copy week
- **Edge cases:**
  - Staff unavailable for scheduled shift → conflict highlight (red border)
  - Overtime threshold approaching → warning indicator on staff row
  - Published schedule with pending swap → show pending badge
  - Empty schedule (new restaurant) → "Start from template" option

### 7.10 Reports (`/[restaurantId]/admin/reports`)

- **Purpose:** Analyse sales, staff, inventory, and operational performance
- **Primary user goal:** Understand performance and identify issues
- **Key content:**
  - Report type selector (Sales, Item Mix, Staff, Voids)
  - Date range picker
  - Location filter (multi-location)
  - Charts and data tables
  - Export actions
- **Key components:** Report type tabs, date range picker, chart containers, data tables with sorting, export button
- **Actions:** Select report type, set date range, filter by location/staff/category, drill down, export CSV/PDF
- **Edge cases:**
  - No data for selected range → "No data available" with suggestion to adjust range
  - Very large dataset → server-side pagination, loading indicator
  - Export timeout → background export with email delivery

### 7.11 Reservations Admin (`/[restaurantId]/admin/reservations`)

- **Purpose:** Manage the reservation book and configuration
- **Primary user goal:** See all bookings, prevent conflicts, manage capacity
- **Key content:**
  - Calendar/timeline view of reservations
  - Reservation detail panel
  - Capacity overview
  - Booking configuration (slots, party sizes, grace period)
- **Key components:** Reservation calendar/list, detail drawer, conflict indicators, capacity bar, booking config form
- **Actions:** Create reservation, edit, cancel, mark no-show, send confirmation, assign table, view guest history
- **Edge cases:**
  - Double-booking → conflict highlight with resolution suggestion
  - Reservation from external source (phone vs. online) → source badge
  - Party size change → revalidate table assignment

### 7.12 Guest CRM (`/[restaurantId]/admin/guests`)

- **Purpose:** Manage guest profiles, preferences, and history
- **Primary user goal:** Understand guests to personalize service
- **Key content:**
  - Guest directory with search and filters
  - Guest profile detail (visits, spend, preferences, tags, notes)
  - Segmentation builder for marketing
- **Key components:** Guest list, guest profile drawer, tag manager, segmentation filter builder, visit history timeline
- **Actions:** Search guests, view profile, add/edit tags, add notes, create segment, export guest list, merge duplicates
- **Edge cases:**
  - Duplicate guests → merge flow with data conflict resolution
  - Guest with no visits → "First-time guest" badge, suggest adding notes after first visit
  - Guest with allergies → prominent allergy badge that surfaces in POS during order

### 7.13 Floor Plan Editor (`/[restaurantId]/admin/floor`)

- **Purpose:** Design and configure the restaurant floor layout
- **Primary user goal:** Set up tables, sections, and rooms for accurate floor management
- **Key content:**
  - Canvas workspace for table placement
  - Table configuration panel (shape, capacity, name)
  - Room/section management
  - Grid and snap tools
- **Key components:** Drag-and-drop canvas, table shape selector, room tabs, section color picker, configuration sidebar, zoom controls
- **Actions:** Add table, drag position, resize, set capacity, assign section, create room, delete, undo/redo
- **Edge cases:**
  - Editing live floor (tables currently occupied) → warn that changes apply after current service or at next shift
  - Very large floor (100+ tables) → zoom/pan controls, minimap
  - Mobile editing → limited functionality, suggest desktop for full editor

### 7.14 Inventory (`/[restaurantId]/admin/inventory`)

- **Purpose:** Track stock levels and manage procurement
- **Primary user goal:** Know what's running low and restock on time
- **Key content:**
  - Inventory item list with current/min levels
  - Low-stock alerts
  - Stock movement history
  - Vendor directory
  - Waste tracking
- **Key components:** Inventory list with status indicators, restock form, vendor list, movement log, waste entry form
- **Actions:** Add item, adjust stock, record waste, restock, link to menu item, manage vendors, export inventory
- **Edge cases:**
  - Stock hits zero → auto-86 linked menu item at POS, send alert
  - Bulk restock → batch entry form with vendor selection

### 7.15 Settings (`/[restaurantId]/admin/settings`)

- **Purpose:** Configure restaurant-level operational settings
- **Primary user goal:** Set up and maintain system configuration
- **Key content:**
  - Restaurant profile
  - Location management
  - Operational preferences
  - Notification settings
  - Billing/plan information
- **Key components:** Settings section list, configuration forms, plan card, billing history
- **Actions:** Edit profile, manage locations, update preferences, change plan, update payment method
- **Edge cases:**
  - Timezone change → confirmation dialog explaining impact on historical timestamps
  - Plan downgrade → feature-loss impact list before confirmation

### 7.16 Marketing / Campaigns (`/[restaurantId]/admin/marketing`)

- **Purpose:** Create and manage guest marketing campaigns
- **Primary user goal:** Send targeted communications to drive repeat visits
- **Key content:**
  - Campaign list with status badges
  - Campaign builder (audience, channel, content, trigger, schedule)
  - Performance analytics
- **Key components:** Campaign list, campaign builder form, audience segment selector, content editor, delivery stats
- **Actions:** Create campaign, select audience segment, compose message, set trigger/schedule, send/schedule, view analytics
- **Edge cases:**
  - Empty segment → "0 recipients" warning, prevent send
  - SMS character limit → live counter in compose
  - Campaign to opted-out guests → auto-exclude, show exclusion count

### 7.17 Support Page (`/[restaurantId]/admin/support`)

- **Purpose:** Access help and manage support tickets
- **Primary user goal:** Resolve issues quickly
- **Key content:**
  - Active ticket list
  - New ticket form
  - Chat widget
  - Voice support
- **Key components:** Ticket list, chat panel, voice dialer, ticket detail, status badges
- **Note:** This page currently uses a light/white SaaS design that breaks from the dark operational UI. Must be reskinned to match the operational design system.

### 7.18 Staff Self-Service Hub (`/[restaurantId]/team`)

- **Purpose:** Enable staff to manage their own schedule, availability, and shift swaps
- **Primary user goal:** View my schedule and manage my work life
- **Key content:**
  - My upcoming shifts
  - Availability calendar
  - Time-off request form
  - Shift marketplace (swaps, pick-ups, give-ups)
  - Hours summary
- **Key components:** Shift list, availability calendar, request forms, marketplace cards, hours summary card
- **Actions:** View schedule, update availability, request time off, post shift for swap, pick up open shift, view hours/tips
- **Edge cases:**
  - No shifts scheduled → "No upcoming shifts" with manager contact info
  - Swap request denied → notification with reason
  - Mobile-primary — this is the screen most likely accessed on a phone

### 7.19 Public Online Ordering (`/[restaurantId]`)

- **Purpose:** Allow guests to browse menu and place orders online
- **Primary user goal:** Order food for pickup or delivery
- **Key content:**
  - Restaurant branding and info
  - Menu with categories, items, photos, descriptions, allergen info
  - Cart with order summary
  - Checkout with payment
- **Key components:** Menu browser, item detail modal, cart drawer, checkout form
- **Actions:** Browse menu, add items, customize with modifiers, view cart, checkout, track order status
- **Edge cases:**
  - Restaurant closed → show hours, allow future ordering if supported
  - Item out of stock → hide or show as unavailable
  - Cart expiry → warn after 30 min of inactivity

---

## 8. Navigation Model

### 8.1 Operational Screens (POS, KDS, Host)

**Top bar (sticky):**
- Restaurant/location name (left)
- Shift info / server name (left-center)
- WebSocket status indicator
- Notification bell
- Clock / current time
- Logout / switch user (right)

**No sidebar.** These screens maximize workspace area. Navigation between POS views (Floor, Menu, Open Orders) uses segmented controls or tab chips within the workspace.

**No breadcrumbs.** Single-level operational contexts.

**No footer.** Full-bleed operational interface.

**Mobile nav:** On tablets, identical layout. On phones (staff hub only), bottom tab bar for section switching.

### 8.2 Admin Panel

**Sidebar (sticky, left, collapsible):**
```
[Restaurant Logo]
[Location Selector]
─────────────────
Dashboard
─────────────────
OPERATIONS
  Orders
  Floor
  Tables
  Stations
  Reservations
  Workflows
─────────────────
MENU & PRICING
  Menu
  Modifiers
  Combos
  Pricing
  Discounts
  Happy Hours
  Taxes
  Gift Cards
─────────────────
PEOPLE
  Staff
  Workforce
  Payroll
  People Ops
  Hiring
─────────────────
GUESTS & MARKETING
  Guests
  Marketing
─────────────────
INTELLIGENCE
  Reports
  Audit
─────────────────
SYSTEM
  Settings
  Integrations
  Support
─────────────────
[Open POS]  [Open KDS]
[User / Logout]
```

**Top bar (sticky):**
- Breadcrumb trail (Admin > Section > Page)
- Search (global)
- Notification bell
- User avatar + role

**Breadcrumbs:** Always visible in admin: `Restaurant Name > Section > Page`

**No footer** in admin panel.

**Sidebar behavior:**
- Desktop (1280px+): Expanded sidebar, always visible
- Tablet (768–1279px): Collapsed icon sidebar, expand on tap
- Mobile (<768px): Hamburger menu, slide-in overlay

**Contextual actions:** Float at the top of the content area, sticky when content scrolls.

### 8.3 Marketing / Public Pages

**Top nav (sticky):**
- Logo (left)
- Feature links, Pricing (center)
- "Login", "Get a Demo" CTA (right)

**Footer:**
- Product links, company links, legal, social media, copyright
- Secondary CTA

**Mobile:** Hamburger menu → slide-down overlay with full nav.

---

## 9. UX Rules and Principles

### 9.1 Speed Over Polish
The interface must optimize for operational speed above visual flair. Every screen must answer: *What's the fastest path to the most common action?* Eliminate decorative elements that slow scan time.

### 9.2 One-Second Recognition
The primary action on any screen must be identifiable within one second. Service-critical elements (tables, tickets, orders, payments) use size, position, and color to communicate state without reading labels.

### 9.3 Touch-First, Mouse-Compatible
All interactive elements assume tablet/touch interaction. Minimum touch target: 44×44px. Spacing between touch targets: minimum 8px. Hover states exist but are never the only affordance.

### 9.4 Calm Density
Show enough information to reduce navigation but never so much that scan speed degrades. Group related data into compact panels. Use typography weight and spacing to create hierarchy instead of visual decoration.

### 9.5 State Clarity
Users must always know: where they are, what is selected, what is blocked, what is urgent, and what action is next. Every state (empty, loading, success, error, offline) must be intentionally designed.

### 9.6 One Product Family
POS, KDS, Host, Admin, and Staff Hub must feel like one product, not five separate apps. Shared tasks use shared patterns. Shared statuses use the same semantic tokens. Shared components are not rebuilt per-screen.

### 9.7 Minimal Clicks / Taps
Core flows target:
- Order an item: 2 taps (item + confirm modifiers)
- Fire an order: 1 tap
- Seat a guest: 2 taps (reservation + table)
- Bump a ticket: 1 tap
- Process payment: 3 taps (method + amount + confirm)

### 9.8 Progressive Disclosure
Show essential information first, reveal detail on demand. Use drawers and expandable panels instead of full page navigations for detail views. Never overwhelm a new user with advanced configuration on first visit.

### 9.9 Accessible by Default
Follow WCAG 2.1 AA. Support keyboard navigation. Ensure color is never the sole indicator of state. Provide sufficient contrast. Support screen readers for admin interfaces.

### 9.10 Offline Resilient
Operational screens (POS, KDS) must function during brief connectivity interruptions. Queue actions locally, indicate sync status, and recover automatically without user intervention.

### 9.11 Consistent Terminology
- **Check** (not "order" or "ticket") in POS context
- **Ticket** in KDS context
- **Reservation** (not "booking") throughout
- **Guest** (not "customer") throughout
- **Staff** (not "employee") in operational contexts

### 9.12 Forgiving Interaction
Destructive actions require confirmation. Voids and comps require manager approval. Recently bumped tickets can be recalled. Deleted items soft-delete first. Undo is available for reversible actions within 10 seconds.

---

## 10. States and Edge Cases

### 10.1 POS States

| State | Behavior |
|-------|----------|
| **Empty floor** | "No tables configured — Set up your floor plan" with link to floor editor |
| **No open orders** | Floor map visible with all tables AVAILABLE, order panel shows "Select a table to start" |
| **Loading menu** | Skeleton grid matching menu item card dimensions |
| **Item out of stock** | Grayed item card with "86" badge, tap shows "Currently unavailable" |
| **Offline** | Amber banner: "Offline — orders will sync when reconnected", local queue active |
| **Reconnecting** | Pulsing connection icon + "Reconnecting..." banner |
| **Reconnected** | Green flash: "Back online — X orders synced" toast, clears after 3s |
| **Payment success** | Green confirmation overlay with receipt option, auto-dismiss 3s |
| **Payment failure** | Red error: "Payment failed — Retry or try another method", stay on payment modal |
| **Void requires approval** | "Manager approval required" prompt → manager PIN entry |
| **Discount requires approval** | Same manager PIN entry workflow |
| **WebSocket disconnect (>30s)** | Persistent red banner: "Connection lost — Data may be stale", manual refresh option |

### 10.2 KDS States

| State | Behavior |
|-------|----------|
| **No tickets** | Full-screen "All Clear ✓" with station name, current time, and uptime |
| **Loading** | Skeleton ticket cards (3–6 placeholder rectangles) |
| **Ticket overdue** | Timer turns red, card gets red left-border accent, sorted to top |
| **Rush ticket** | Red border, "RUSH" badge, audible alert, sorted to front |
| **Recall** | Bumped ticket animates back into grid with "RECALLED" flash |
| **WebSocket disconnect** | CRITICAL: Full-screen red overlay "CONNECTION LOST — Tickets may be stale. Check orders manually." |
| **Station empty** | Per-station "All clear" with option to view other stations |

### 10.3 Host States

| State | Behavior |
|-------|----------|
| **No reservations today** | "No reservations — Walk-ins welcome" with "Add Reservation" CTA |
| **Waitlist empty** | "No guests waiting" in waitlist section |
| **All tables full** | Floor map all colored OCCUPIED, "No available tables" message, waitlist CTA prominent |
| **Guest no-show** | After grace period: "Potential no-show" badge → one-tap to confirm |
| **Reservation conflict** | Orange warning icon on conflicting bookings with "Resolve" action |
| **SMS send failure** | Retry button on affected waitlist entry, error indicator |

### 10.4 Admin States

| State | Behavior |
|-------|----------|
| **Empty dashboard (new setup)** | Onboarding checklist: "Set up floor plan", "Add menu items", "Add staff" |
| **Loading charts** | Skeleton chart matching chart dimensions |
| **No staff** | "Add your first team member" CTA in staff list |
| **Empty menu** | "Build your menu to start taking orders" with template options |
| **Report no data** | "No data for this period" with date range adjustment suggestion |
| **Permission denied** | "You don't have permission to access this section — Contact your manager" |
| **API error** | Red toast: "Something went wrong — Try again" with retry action |
| **Form validation error** | Inline field-level errors in red below each field, summary at top of form |
| **Save success** | Green toast: "Changes saved" auto-dismiss 3s |
| **Unsaved changes** | "You have unsaved changes" dialog on attempting to navigate away |

### 10.5 Staff Hub States

| State | Behavior |
|-------|----------|
| **No upcoming shifts** | "No shifts scheduled — Check back later or contact your manager" |
| **Shift swap pending** | Yellow badge on shift card: "Swap pending" |
| **Shift swap approved** | Green confirmation: "Swap approved — Your schedule has been updated" |
| **Shift swap denied** | Red notification: "Swap denied" with manager's reason if provided |
| **Time-off approved** | Green badge on time-off card |
| **Time-off denied** | Red badge with reason |

### 10.6 Global Error States

| State | Behavior |
|-------|----------|
| **404 page** | "Page not found" with navigation back to last known section |
| **500 error** | "Something went wrong on our end" with retry and support link |
| **Session expired** | Redirect to login with "Your session has expired — Please log in again" |
| **Rate limited** | "Too many requests — Please wait a moment" |
| **Maintenance** | Full-page: "We're performing scheduled maintenance — Back shortly" |

---

## 11. Accessibility Requirements

### 11.1 Color Contrast
- All text meets WCAG 2.1 AA contrast ratio: 4.5:1 for normal text, 3:1 for large text (18px+ or 14px bold)
- Status colors (green/yellow/red) are always paired with text labels or icons — never color alone
- Dark theme surfaces verified: `text.primary` (#F8FAFC) on `surface.canvas` (#07111F) = 17.5:1 ✓
- Action buttons: `action.primary.fg` (#020617) on `action.primary.bg` (#67E8F9) meets 11:1 ✓
- Danger/warning text tokens must maintain contrast on their background tokens

### 11.2 Keyboard Navigation
- All interactive elements are focusable via Tab key in logical order
- Operational screens support keyboard shortcuts:
  - POS: `F` = Fire, `P` = Pay, `1-9` = Select category, `Esc` = Close modal
  - KDS: `Space` = Bump focused ticket, `R` = Recall, `Tab` = Next ticket
- Modal traps focus within the modal until closed
- Enter activates primary action, Escape closes modals/drawers
- Skip-to-content link on admin pages

### 11.3 Screen Reader Support
- All images have meaningful `alt` text or are marked `aria-hidden` if decorative
- Interactive elements have `aria-label` when visual label is icon-only
- Status changes announce via `aria-live` regions (order fired, payment processed, ticket bumped)
- Table/data grid elements use proper `role` attributes
- Form inputs have associated `<label>` elements
- Loading states announce "Loading" and completion announces content arrival

### 11.4 Form Usability
- All form fields have visible labels (not placeholder-only)
- Required fields marked with asterisk and `aria-required`
- Error messages associated with fields via `aria-describedby`
- Tab order follows visual layout
- Autocomplete attributes on address/name/email fields
- Submit buttons remain enabled (show loading state instead of disabling)

### 11.5 Focus States
- Visible focus ring on all interactive elements: 2px cyan outline (`border.focus` token)
- Focus ring is visible on both dark and light surfaces
- Focus rings do not obscure content
- Custom components (table cells, cards) include programmatic focus management

### 11.6 Mobile Tap Targets
- Minimum touch target: 44×44px
- Minimum spacing between targets: 8px
- `.touch-target` utility class applied consistently across all operational screens
- Action buttons in modals/drawers: full-width on mobile (minimum 48px height)
- Close buttons on modals: minimum 44×44px with padding

---

## 12. Responsive Behavior

### 12.1 Desktop (1280px+)

**POS:**
- Three-column layout: Floor map (left 35%) | Menu grid (center 35%) | Order panel (right 30%)
- All three panels visible simultaneously
- Floor map zoom controls visible

**KDS:**
- 4–6 column ticket grid
- Compact summary bar
- Station tabs as horizontal strip

**Host:**
- Split view: reservation rail (35%) | floor map (65%)
- Both panels always visible

**Admin:**
- Expanded sidebar (240px) + content area
- Charts and tables at full width
- Multi-column form layouts (2–3 columns for settings)

### 12.2 Tablet (768–1279px) — Primary Operational Device

**POS:**
- Two-panel layout: switchable between Floor/Menu (left 60%) + Order panel (right 40%)
- Segmented control to switch between Floor Map and Menu Grid views
- Order panel may collapse to bottom sheet on smaller tablets
- Quick buttons bar remains visible above menu

**KDS:**
- 3–4 column ticket grid
- Same bump button sizing (large touch targets)
- Summary bar slightly compressed

**Host:**
- Rail collapses to narrow mode (icon + name) or drawer behavior
- Floor map takes priority
- Tap rail toggle to expand/collapse

**Admin:**
- Collapsed icon sidebar (64px), expand on tap to overlay
- Single-column content area
- Charts stack vertically
- Forms go single-column
- Tables switch to card-based list views for touch interaction

### 12.3 Mobile (<768px) — Staff Hub Only

The POS, KDS, and Host screens are **not designed for phone use** — these are tablet/desktop operational surfaces. Mobile is supported only for:

**Staff Hub:**
- Bottom tab navigation: Schedule | Availability | Shifts | Profile
- Full-width shift cards
- Pull-to-refresh for schedule updates
- Swipe actions on shift cards (swap, details)

**Public Pages:**
- Single-column layout
- Hamburger menu
- Full-width CTAs
- Stacked feature sections

**Online Ordering:**
- Full-screen menu browser
- Bottom-anchored cart summary
- Full-screen checkout

**Admin (emergency mobile access):**
- Hamburger sidebar
- Single-column forms
- Stacked KPI cards (2-per-row)
- Simplified charts (bar charts over complex visualizations)
- Tables collapse to accordion card views

---

## 13. Conversion and Business Logic Strategy

### 13.1 Conversion Points

| Touchpoint | Conversion Goal | Mechanism |
|------------|----------------|-----------|
| Landing page hero | Demo request | Primary CTA "Get a Demo" above fold |
| Feature sections | Build product understanding | Each section ends with micro-CTA |
| Pricing table | Plan selection | Highlighted "Most Popular" on Growth tier |
| Demo experience | Trial activation | "Start your free trial" after demo |
| Trial period (14 days) | Paid conversion | In-app upgrade prompts at feature gates |
| Starter plan usage | Upgrade to Growth | Feature teaser banners when hitting Starter limits |
| Single location | Multi-location expansion | "Add Location" in settings with Growth plan upsell |

### 13.2 Revenue Support Mechanisms

**Land and expand:**
- Start with single-location Starter plan ($149/mo)
- Show multi-location comparison dashboards that create desire for Growth plan
- Add-location flow surfaces Growth plan benefits

**Feature gating:**
- Starter: Limited staff count (10 staff, 2 managers), basic reports, email support
- Growth: Unlimited staff, advanced reports, workforce scheduling, SMS campaigns, priority support
- Premium: Multi-location analytics, API access, dedicated support, custom integrations

**Retention through consolidation:**
- Every additional module adopted (scheduling, reservations, CRM, marketing) increases switching cost
- Historical data (guest CRM, sales trends) becomes more valuable over time
- Staff familiarity with the system reduces willing to switch

### 13.3 Trust-Building Mechanisms
- Transparent pricing page (no "Contact us for pricing" on standard plans)
- Free trial with no credit card required
- Real-time data dashboard demonstrates immediate value
- Uptime and reliability indicators
- Responsive in-app support
- Audit log demonstrates accountability and compliance readiness
- Data export always available (no vendor lock-in anxiety)

### 13.4 Retention Loops
- **Daily operational dependency:** POS/KDS must run every service → daily engagement
- **Weekly scheduling rhythm:** Manager publishes schedule every week → weekly admin engagement
- **Monthly reporting cadence:** Owner reviews monthly sales and labor reports → monthly value reinforcement
- **Guest data accumulation:** CRM data grows over time, making the product more valuable
- **Staff familiarity:** Team learns the system, reducing desire to retrain on competitor

### 13.5 Upsell / Cross-sell
- **Workforce module:** "You're managing staff schedules in spreadsheets — try SmartSchedule" banner in staff admin
- **Marketing module:** "You have 500 guest profiles — send them a campaign" prompt in guest CRM
- **Advanced reporting:** "Unlock item-mix analysis and staff performance trends" behind Growth gate
- **Multi-location:** "Managing multiple locations? See all your restaurants in one dashboard" when approaching 2+ locations

---

## 14. Design System Direction

### 14.1 Visual Direction
- **Dark operational interface** for all service and admin screens
- Palette anchored on deep navy (`#07111F` canvas) with slate/cool-gray surfaces
- Cyan accent (`#67E8F9`) for primary actions and selection states
- Green (`#34D399`) for success and positive states
- Amber (`#FDE68A` on dark `#FBBF24`) for warnings
- Red (`#EF4444` family) for danger, voids, and urgent states
- White (`#F8FAFC`) for primary text
- Subtle glass/transparency effects for panels (`rgba` overlays) — calm, not flashy
- **Marketing/public pages** may use a lighter palette with the same color tokens for brand consistency

### 14.2 Component Style
- **Rounded but not bubbly:** `border-radius: 8px` for panels, `6px` for buttons, `4px` for chips
- **Subtle borders:** `rgba(148, 163, 184, 0.10–0.14)` — visible but not heavy
- **Elevation through surface color**, not shadows (dark UI doesn't benefit from drop shadows)
- **Compact density** for operational screens, standard density for admin forms
- **Full-bleed workspace** for POS/KDS/Host — no page margins, maximize active area

### 14.3 Spacing Philosophy
- 4px base unit (space.1)
- Inside controls/chips: 8–16px (space.2–4)
- Inside cards/rows: 16–24px (space.4–6)
- Between sections: 24–32px (space.6–8)
- No ad-hoc spacing values — use the token scale exclusively
- Tighter spacing on operational screens, standard spacing on admin/forms

### 14.4 Interaction Style
- **Tap feedback:** Immediate visual change on touch (background darken/lighten)
- **Transitions:** 150ms for hover/active/focus, 200ms for panel open/close, 300ms for drawer slide
- **No heavy animations** — speed takes priority over delight
- **Haptic-friendly:** Design interactions that pair well with device haptics
- **Swipe support:** For card dismiss, drawer close, and shift card actions on mobile
- **Long-press:** For contextual actions (void item, rush ticket) on touch devices

### 14.5 Tone of UI Copy
- **Operational and direct.** Not casual, not corporate
- Short labels: "Fire", "Bump", "Pay", "Void", not "Submit Order to Kitchen"
- Error messages tell what happened and what to do: "Payment failed — Try again or use a different method"
- Empty states suggest the next action: "No reservations today — Add one or enable online booking"
- Confirmation messages are brief: "Saved", "Sent", "Bumped"
- Avoid jargon outside the restaurant industry vocabulary

### 14.6 Iconography Approach
- **Lucide Icons** (consistent, open-source, clean line style)
- 20px standard size, 24px for primary actions, 16px for inline/compact
- Icons always paired with labels on first use; icon-only allowed for repeated/learned actions (e.g., status badges)
- Status icons: filled circle for active states, outlined for inactive
- Use sparingly — icons supplement text, not replace it

### 14.7 Component Usage Patterns

| Pattern | When to Use |
|---------|-------------|
| **Cards** | KPI metrics, shift cards, menu items, guest profiles, reservation cards |
| **Tables** | Audit logs, report data, CSV-style data review (desktop-optimized) |
| **Card lists** | Staff directory, order history, inventory items (touch-optimized alternative to tables) |
| **Forms** | Settings, menu item creation, staff records, campaign builder |
| **Modals** | Confirmations, quick actions, modifier selection, payment processing |
| **Drawers** | Detail views (item detail, guest profile, order detail), filters on mobile |
| **Bottom sheets** | Mobile confirmations, quick actions on tablet POS |
| **Segmented controls** | View switching (Floor/Menu, Report type, Schedule/Availability) |
| **Tab bars** | Category navigation, section switching within a page |
| **Toasts** | Success confirmations, non-blocking errors, sync status |
| **Banners** | Persistent warnings (offline, connection issues, feature limits) |

---

## 15. Screen Inventory

### Public / Marketing
1. Landing page (`/`)
2. Login — PIN pad (`/[restaurantId]/login`)
3. Login — email/password (`/login`)
4. Demo signup (`/demo`)
5. Contact sales (`/contact-sales`)
6. Staff lookup / portal (`/staff`)
7. Public restaurant page (`/[restaurantId]`)
8. Public online ordering menu browser
9. Public online ordering checkout

### POS Terminal
10. POS shell — floor map view
11. POS shell — menu grid view
12. POS shell — open orders view
13. Order panel (persistent side panel)
14. Modifier modal
15. Payment modal — method selection
16. Payment modal — cash tendered
17. Payment modal — card processing
18. Payment modal — split check (equal)
19. Payment modal — split check (by seat)
20. Payment modal — split check (by item)
21. Payment modal — gift card entry
22. Payment modal — comp with approval
23. Discount modal — manager approval
24. Order type modal (dine-in/takeout/delivery/bar)
25. Void confirmation modal
26. Table transfer modal
27. Quick buttons bar
28. Order search / history overlay

### Kitchen Display System
29. KDS — multi-station ticket grid
30. KDS — single station view
31. KDS — all-clear state
32. KDS — ticket detail (expanded)

### Host Station
33. Host — split view (reservation rail + floor map)
34. Host — reservation detail drawer
35. Host — new reservation form
36. Host — waitlist view
37. Host — walk-in entry form
38. Host — guest search overlay
39. Host — table assignment suggestion

### Admin Dashboard
40. Admin dashboard — overview

### Admin — Operations
41. Orders — list view
42. Orders — detail drawer
43. Floor plan editor — canvas
44. Floor plan editor — table config panel
45. Tables — configuration list
46. Stations — configuration page
47. Reservations — calendar/list view
48. Reservations — detail drawer
49. Reservations — creation form
50. Workflows — role layout builder

### Admin — Menu & Pricing
51. Menu — category list + item grid
52. Menu — item creation/edit form (drawer)
53. Menu — category creation/edit form
54. Modifiers — group list + modifier config
55. Combos — combo builder
56. Pricing — overrides/daypart management
57. Discounts — rule list + config form
58. Happy hours — schedule config
59. Taxes — rule list + config form
60. Gift cards — list + issuance form

### Admin — People
61. Staff — directory list
62. Staff — detail drawer (record, role, PIN, clock history)
63. Workforce — weekly schedule grid
64. Workforce — availability matrix
65. Workforce — section assignments
66. Workforce — labor forecasting panel
67. Workforce — shift swap/request queue
68. Workforce — auto-schedule dialog
69. Payroll — export batches
70. Payroll — batch detail (hourly breakdown)
71. Payroll — tip pool management
72. People ops — document list
73. People ops — acknowledgement tracking
74. Hiring — job postings list
75. Hiring — candidate pipeline

### Admin — Guests & Marketing
76. Guests — directory + search
77. Guests — profile detail drawer
78. Guests — tag management
79. Guests — segmentation builder
80. Marketing — campaign list
81. Marketing — campaign builder
82. Marketing — campaign analytics

### Admin — Intelligence
83. Reports — sales report
84. Reports — item mix report
85. Reports — staff performance report
86. Reports — void audit report
87. Reports — labor report
88. Audit — log viewer with pagination
89. Intelligence — insights dashboard (gated)

### Admin — System
90. Settings — restaurant profile
91. Settings — location management
92. Settings — operational preferences
93. Settings — billing / plan management
94. Integrations — connection list
95. Integrations — connection config
96. Control center
97. Support — ticket list
98. Support — chat panel
99. Support — ticket detail

### Staff Self-Service Hub
100. Team hub — my schedule
101. Team hub — availability editor
102. Team hub — time-off requests
103. Team hub — shift marketplace
104. Team hub — hours/tips summary

### SaaS Platform Admin
105. SaaS admin — platform dashboard
106. SaaS admin — restaurant/tenant list
107. SaaS admin — tenant detail
108. SaaS admin — platform pricing/plan config

### System / Utility
109. 404 error page
110. 500 error page
111. Offline fallback page
112. Maintenance page
113. Session expired redirect
114. Print — receipt layout
115. Print — report layout

---

## 16. Build Prioritization

### MVP (Phase 1) — Core Restaurant Operations

**Goal:** A restaurant can run daily service using only RestaurantOS.

| Area | Screens |
|------|---------|
| Auth | Login (PIN + email), session management |
| POS | Floor map, menu grid, order panel, modifier modal, fire-to-kitchen, order type selector |
| Payments | Full payment modal (cash, card, split, tip) |
| KDS | Ticket grid, bump, recall, station filter, urgency timers |
| Floor | Live table map with status, basic floor editor |
| Menu | Category + item CRUD, modifier groups, item status (active/86) |
| Staff | Staff CRUD, role assignment, PIN management, clock in/out |
| Orders | Order lifecycle, void with audit, order history |
| Admin | Dashboard (sales KPIs, activity), basic settings |
| Reports | Sales summary, item mix, void report |
| Real-time | WebSocket sync for POS ↔ KDS |
| Marketing site | Landing page, demo signup, pricing page |
| Infrastructure | Multi-tenant architecture, offline queue |

**Screen count:** ~45 screens

### Phase 2 — Guest & Revenue Operations

**Goal:** Expand into reservations, guest management, and revenue optimization.

| Area | Screens |
|------|---------|
| Reservations | Full reservation book, waitlist, confirmation, no-show tracking |
| Host station | Host shell, reservation rail, floor integration, table suggestions |
| Guest CRM | Guest profiles, visit history, tags, notes, dietary/allergy tracking |
| Pricing | Happy hours, discounts with approval, combos, pricing overrides, taxes |
| Gift cards | Issuance, redemption, balance tracking |
| Inventory | Stock tracking, low-stock alerts, vendor management, waste tracking |
| Audit | Complete audit log with search and pagination |
| Public ordering | Online ordering experience, order status tracking |
| Marketing | Campaign builder, audience segments, delivery tracking |

**Screen count:** ~30 screens

### Phase 3 — Workforce & Platform Scale

**Goal:** Full workforce management, multi-location operations, and platform maturity.

| Area | Screens |
|------|---------|
| Workforce | Schedule builder, auto-schedule, availability, labor forecasting |
| Shift management | Swap marketplace, time-off requests, section assignments |
| Payroll | Export batches, hourly breakdowns, tip pools |
| People ops | Employee documents, acknowledgements |
| Hiring | Job postings, candidate pipeline |
| Staff hub | Self-service schedule view, availability, shift marketplace |
| Multi-location | Cross-location dashboards, benchmarking, rollup reports |
| Advanced reports | Labor cost analysis, staff performance trends, menu engineering |
| Integrations | Third-party connections, webhook management |
| SaaS admin | Platform metrics, tenant management, plan configuration |
| Support | In-app support center (reskinned to dark operational UI) |
| Intelligence | Operations insights (when real forecasting backend ready) |

**Screen count:** ~40 screens

---

## 17. Final Recommendations

### 17.1 Unify the Operational Shell First
The single highest-impact improvement is aligning all admin and operational screens to the same visual and interaction system. Right now, POS/KDS/Host feel like a polished operational product while many admin pages feel like a separate CRUD application. Standardize the operational page header, filter rail, list row, panel shell, and status chip as shared components (per the shared-components-priority doc) before building new features. This prevents every new screen from adding more visual debt.

### 17.2 Reskin the Support Center
The white/light SaaS helpdesk UI in the support page is the most jarring visual inconsistency. Bring it into the dark operational language immediately. This is cosmetic but high-impact for perceived product quality.

### 17.3 Reduce POS Mode Switching During Rush
The current POS splits Floor Map, Menu Grid, and Open Orders into separate views. During deep rush, servers should see their active order + menu simultaneously without switching. Consider a persistent mini-ticket strip or condensed order footer that eliminates the need to toggle between views on tablets at or above 10.5".

### 17.4 Invest in the Host-to-POS Handoff
The reservation-to-seating-to-order pipeline is where guest experience lives. When a host seats a VIP guest with allergies and preferences, that information must flow seamlessly to the server's POS view. Build a "guest context card" that appears when a server opens a table that was just seated from a reservation with guest profile data.

### 17.5 Make the Mobile Staff Hub Excellent
The staff self-service hub (schedule, availability, shifts, marketplace) is the only surface most staff interact with outside of service hours. This is where you build daily engagement and retention. Invest in mobile-first polish: gesture navigation, pull-to-refresh, shift cards with swipe actions, push notifications for schedule changes and swap approvals. This is your employee retention weapon.

### 17.6 Build for Demo-Driven Sales
The demo experience should be a partially populated sandbox that prospects can click through live. Pre-load a demo restaurant with realistic floor plan, menu, reservations, and guest data. Let prospects experience the POS, seat a party, bump a ticket, and run a report. This sells better than any feature list.

### 17.7 Embrace Data Accumulation as a Moat
Guest history, sales trends, labor patterns, and menu performance data become exponentially more valuable over time. Surface this explicitly in the product: "You've served 12,450 guests this year. Here's what you've learned." This makes the cost of switching feel real without vendor lock-in tactics.

### 17.8 Prioritize Perceived Speed
Every interaction should feel instant. Use optimistic updates for POS actions (add item, fire, bump). Show skeleton states that match the final layout during loads. Pre-fetch menu data on login. Cache floor plan state. The feeling of speed matters as much as actual speed in operational software.

### 17.9 Plan for Hardware Integration
Even if the hardware abstraction layer is Phase 3+, design the payment flow, receipt generation, and KDS bump interactions with hardware abstraction interfaces now. When you add receipt printer, cash drawer, and card terminal support, the UI should not require redesign.

### 17.10 Keep the Dark Theme Non-Negotiable for Operations
The dark operational theme is not aesthetic preference — it reduces eye strain during 8–12 hour shifts under restaurant lighting, increases contrast for status colors, and establishes visual separation from the consumer-facing light public pages. Do not offer a "light mode" toggle for operational screens. It undermines the operational identity and creates maintenance burden. Admin pages should also stay dark for consistency.

---

*End of UX Blueprint — RestaurantOS v1.0*
