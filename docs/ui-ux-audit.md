# Restaurant POS UI/UX Audit

Date: 2026-04-07

Scope:
- Frontend codebase audit only
- No implementation changes made
- Focused on restaurant operations, iPad/tablet ergonomics, speed under rush conditions, information density, and consistency

## Executive Summary

The frontend already has a strong operational direction in the live service surfaces:
- POS (`apps/web/src/app/pos/POSContent.tsx`)
- Host (`apps/web/src/app/[restaurantId]/host/HostContent.tsx`)
- KDS (`apps/web/src/app/kds/KDSContent.tsx`)
- Tenant admin shell (`apps/web/src/app/[restaurantId]/admin/layout.tsx`)

The biggest UX risk is not lack of features, but inconsistency between advanced operational screens and the broader admin suite. POS, host, and KDS are moving toward a touch-friendly dark operations system; many admin pages still use one-off page structures, dense CRUD tables, desktop-first controls, and repeated local headers/toolbars. That creates cognitive switching costs for staff and managers moving between service, floor, reservations, workforce, and back-office tasks.

The best redesign path is staged:
1. Unify the operational shell and interaction system.
2. Improve the highest-frequency service flows first.
3. Standardize the admin suite around shared patterns instead of redesigning every screen independently.

## Frontend Structure

### Major screens

Operational screens:
- POS shell/content: `apps/web/src/app/pos/POSContent.tsx`
- POS header and core work areas: `apps/web/src/components/pos/POSHeader.tsx`, `MenuGrid.tsx`, `OrderPanel.tsx`, `OpenOrdersPanel.tsx`, `TableMap.tsx`, `ModifierModal.tsx`, `PaymentModal.tsx`, `OrderTypeModal.tsx`
- Host station: `apps/web/src/app/[restaurantId]/host/HostContent.tsx`
- KDS: `apps/web/src/app/kds/KDSContent.tsx`, `apps/web/src/components/kds/TicketCard.tsx`
- Team/staff hub: `apps/web/src/modules/workforce/TeamHubPage.tsx`

Tenant admin shell and routed pages:
- Tenant admin layout/sidebar: `apps/web/src/app/[restaurantId]/admin/layout.tsx`
- Admin route mapper: `apps/web/src/app/[restaurantId]/admin/[[...slug]]/page.tsx`
- Dashboard: `apps/web/src/modules/restaurant-admin/DashboardPage.tsx`
- Reservations: `apps/web/src/app/admin/reservations/page.tsx`
- Floor editor: `apps/web/src/app/admin/floor/page.tsx`
- Workforce: `apps/web/src/app/admin/workforce/page.tsx`
- Orders: `apps/web/src/app/admin/orders/page.tsx`
- Reports: `apps/web/src/app/admin/reports/page.tsx`
- Staff: `apps/web/src/app/admin/staff/page.tsx`
- Menu/Modifiers/Combos/Pricing/Taxes/Stations/Discounts and other admin CRUD pages under `apps/web/src/app/admin/*`

Non-operational / public surfaces:
- Marketing home/demo/contact/login/staff lookup pages under `apps/web/src/app/*`
- Public restaurant page: `apps/web/src/app/[restaurantId]/page.tsx`
- Public ordering: `apps/web/src/components/public/PublicOrderingExperience.tsx`
- SaaS control plane: `apps/web/src/app/admin/page.tsx`

### Shared layout and style system

Global styling:
- `apps/web/src/app/globals.css`

Shared visual primitives present today:
- Buttons: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-success`
- Panels: `.card`, `.glass-panel`, `.soft-panel`, `.workspace-panel`, `.ops-shell`
- Inputs: `.input`, `.label`
- Chips and status: `.status-chip`, `.ops-chip`, `.workspace-chip`
- Touch size helper: `.touch-target`
- POS/KDS specific helpers: `.pos-btn`, `.pos-item-btn`, `.kds-ticket`, table status utility classes

Shared UI components:
- `apps/web/src/components/ui/KPICard.tsx`
- `apps/web/src/components/ui/StatusChip.tsx`
- `apps/web/src/components/ui/Drawer.tsx`
- `apps/web/src/components/ui/NotificationDrawer.tsx`
- `apps/web/src/components/ui/WSStatusBanner.tsx`
- `apps/web/src/components/ui/LoadingState.tsx`
- `apps/web/src/components/ui/Skeleton.tsx`

### Component inventory

POS components:
- `POSHeader`
- `TableMap`
- `TableCard`
- `MenuGrid`
- `OrderPanel`
- `OpenOrdersPanel`
- `ModifierModal`
- `PaymentModal`
- `OrderTypeModal`

KDS components:
- `TicketCard`

Admin form components:
- `CategoryForm`
- `MenuItemForm`

Support components:
- `ChatWidget`
- `VoiceWidget`

Landing/public components:
- `DemoSignupForm`
- `ContactSalesForm`
- `LandingWarmupStatus`
- `PublicOrderingExperience`

Cross-cutting components:
- `ApiKeepAlive`
- `NotificationDrawer`
- `WSStatusBanner`

## Repeated Patterns and Duplication

### Duplicated UI patterns

- Multiple custom page headers/toolbars exist instead of a single reusable operational page header pattern.
  - Examples: POS header, host top rail, KDS header, dashboard sticky top bar, reservations header, floor editor header, workforce header, support top bar.
- Repeated list-card patterns are hand-built in many places rather than composed from shared operational list items.
  - Examples: reservations rows, host reservation cards, server cards, staff lists, audit rows, orders rows, workforce request cards.
- Repeated modal/drawer behavior is implemented locally across POS, reservations, floor, support, staff/menu CRUD, and admin pages.
- Repeated filter bars and tab chips are implemented with page-local styling and spacing instead of a shared filter rail component.
- Table/floor concepts are duplicated between live service use (`components/pos/TableMap.tsx`) and floor design (`app/admin/floor/page.tsx`) with different interaction models and visual density.

### Repeated headers/toolbars

- `WSStatusBanner` appears in multiple shells, but the surrounding top chrome is not standardized.
- `ops-toolbar` is used in POS, host, and several modals, but not consistently across admin pages.
- Many admin CRUD pages still use simple top title bars or standalone headers without sticky actions or consistent filter/action placement.

## Severity Findings

### Critical

- Operational shell inconsistency across service-critical surfaces slows context switching.
  - POS, host, and KDS share a dark operational language, but reservations, floor admin, workforce, orders, and many admin pages diverge in header pattern, spacing density, and action placement.
  - Result: managers and leads moving between live floor work and admin workflows need to re-learn page behavior.

- The admin suite mixes tablet-ready patterns with desktop CRUD pages.
  - Pages like `apps/web/src/app/admin/orders/page.tsx`, `apps/web/src/app/admin/audit/page.tsx`, and several CRUD-heavy pages rely on table layouts and smaller controls that are weaker on iPad touch use than the POS/host/KDS surfaces.
  - Rush consequence: back-office actions such as comp review, order lookup, staffing changes, or reservation interventions require more precise taps and more scanning.

- Reservations and host workflows are split across two strong but separate surfaces without a clear shared interaction model.
  - `apps/web/src/app/[restaurantId]/host/HostContent.tsx` is optimized around live seating from the floor.
  - `apps/web/src/app/admin/reservations/page.tsx` is optimized around the reservation book.
  - Both solve adjacent tasks with different card/list/drawer patterns, causing duplicated mental models for the same staff role.

- Floor management has two different complexity levels with no common operational bridge.
  - Live floor map in `components/pos/TableMap.tsx` is optimized for service.
  - Floor editor in `app/admin/floor/page.tsx` is much more complex, dense, and tool-heavy.
  - There is no simplified "manager floor ops" layer between service map and full layout editor.

- One major screen breaks the product's visual system entirely.
  - `apps/web/src/app/admin/support/page.tsx` uses a white/light SaaS helpdesk design with different spacing, colors, border language, and typography from the rest of the restaurant operations UI.
  - This is the strongest visual inconsistency in the app.

- Some high-frequency flows still require extra mode changes or panel reveals.
  - POS requires switching among Tables, Menu, and Open Orders, while the active check can also be hidden/collapsed.
  - That flexibility is useful, but during rush it increases the chance of extra taps and "where did my ticket go?" moments, especially on smaller tablets.

### Important

- Touch targets are generally better on live service screens than on admin screens.
  - Global `.touch-target` exists and is used well in POS/host/KDS.
  - Many admin pages still have smaller inline buttons, text links, dense table rows, or compressed controls that are less forgiving on tablet.

- Information density is inconsistent.
  - POS/KDS/host are reasonably dense but still legible.
  - Some admin pages waste vertical space with large wrappers and separate cards for related actions.
  - Other pages swing the opposite way and become dense CRUD tables with weaker hierarchy.

- Wasted space appears in several places where operators need more visible work area.
  - POS uses multiple stacked top bars on some states: websocket banner, POS header, local toolbar, optional offline banner.
  - KDS devotes significant vertical space to branding/header blocks before the ticket grid.
  - Host rail can consume substantial horizontal space while the floor is the primary task area.

- Filters and state controls are not consistently sticky or always near the content they govern.
  - Reservations has a good top action cluster, but many admin pages rely on top-only controls followed by long lists/tables.
  - For tablet workflows, filter chips and primary actions should stay closer to the active viewport.

- Visual status semantics vary by screen.
  - Table statuses, reservation statuses, staffing statuses, and generic chips are all reasonably styled, but not through one canonical semantic system.
  - This weakens immediate scan recognition across modules.

- Typography and density vary too much between screens.
  - Some pages use operational large-bold headings and structured sublabels.
  - Others use plain CRUD headings with little hierarchy.
  - Support and some admin pages drift furthest from the shared visual language.

- Too many admin pages are page-local implementations instead of reusable feature templates.
  - Reservation list pages, management tables, modal forms, and summary cards are often rebuilt in-place.
  - This increases long-term inconsistency and slows safe redesign.

- Encoded character artifacts are visible in several files and likely surface in UI text.
  - Examples appear in reservation/support/floor-related files with malformed separators.
  - This hurts perceived polish and readability.

### Polish

- `apps/web/src/components/pos/pos-screen.tsx` looks like a placeholder artifact and should either be removed or folded into the real POS structure to reduce noise.
- Some labels vary between "checks", "orders", "tickets", "bookings", and "reservations" in ways that may be right functionally but are not always aligned in hierarchy.
- Some action labels could be more operationally direct.
  - Examples: "Open POS", "Open KDS", "Back to POS", "Show Check", "Host rail".
- Brand/container treatments vary too much.
  - Rounded radii, surface opacity, and border weight are close but not fully standardized.
- KDS and host could likely reclaim a bit more above-the-fold workspace by compressing top summary blocks once the design system is unified.

## Workflow-Specific Friction

### Order taking

- POS splits work into views rather than keeping floor context and menu context simultaneously visible at all tablet widths.
- Ticket visibility can be hidden/collapsed, which is useful for space but risky for speed.
- Mobile/tablet action overlays add another layer of navigation before reaching actions.
- Multiple stacked bars reduce active menu/floor area.

### Floor/table management

- Live floor map is good, but section assignment visibility is stronger on larger layouts than on compact tablet views.
- Room tabs, zoom, status counts, and section summaries compete for the same top area.
- Full floor editor is too complex for quick operational interventions during service.

### Host flow

- Host screen is one of the better operational surfaces, but the booking rail and floor map still feel like two adjacent apps rather than one tightly integrated station.
- Seating a walk-in vs seating a reservation follows different microflows.
- Suggested table/server logic is present, but the UI still asks for multiple explicit confirmations in a rush scenario.

### Kitchen display

- KDS is visually coherent and operationally clear, but the top summary/header area could be denser.
- Station switching is simple, but the screen could surface station load and urgent state with less header overhead.
- Ticket action buttons are strong, but grid density may become limiting during heavy throughput if tickets grow vertically.

### Checkout

- Payment flow lives in a modal, which is appropriate, but the path there depends on finding and keeping the active check panel visible.
- Rush risk is less about payment design itself and more about reaching payment quickly from the main service context.

## Visual Inconsistencies

- Dark operational design system on POS/host/KDS/admin shell vs light SaaS support center in `apps/web/src/app/admin/support/page.tsx`
- Advanced operational dashboard styling in `modules/restaurant-admin/DashboardPage.tsx` vs simpler CRUD/admin page styling across many `apps/web/src/app/admin/*` pages
- Reusable semantic classes exist in `globals.css`, but many pages still hand-roll local visual language
- Inconsistent header structures:
  - sticky command header
  - plain top title row
  - `ops-toolbar`
  - white SaaS app bar
- Inconsistent card density and radius usage across admin pages

## Layout Inefficiencies and Wasted Space

- POS:
  - websocket bar + main header + local toolbar + offline bar can stack
  - active work area loses height before reaching menu/floor content
- Host:
  - rail width can become expensive on wider tablets if the floor is the primary action zone
- KDS:
  - summary header and station strip consume substantial vertical space before ticket content
- Admin:
  - some pages overuse wrapper spacing and separate cards
  - others default to large tables that do not use touch-friendly dense cards
- Floor editor:
  - tool density is high, but hierarchy between "design tools" and "live ops-relevant controls" is weak

## Tablet and Touch Usability Problems

- Good:
  - `.touch-target` helper exists and is used intentionally on many operational controls
  - POS/host/KDS generally use large buttons, rounded touch surfaces, and obvious state

- Problems:
  - Many admin pages still include controls that are visually clickable but not operationally sized for fast tablet use
  - Dense data tables are harder to scan and tap on iPad than card/list rows with fixed action zones
  - Some critical actions live inside secondary drawers/modals rather than primary in-row action areas
  - Some pages rely on precise top-right action clusters rather than bottom- or edge-stable tablet ergonomics

## Places Where UX Slows Staff During Rush

- Switching between floor, menu, open orders, and ticket visibility in POS
- Moving from live hosting to reservation-book administration because the surfaces are similar in purpose but different in interaction model
- Jumping from admin dashboard into CRUD-style pages that lose the strong operational scanability of the dashboard
- Investigating orders/audit/support on tablet because of smaller, more desktop-like tables or list controls
- Using the full floor editor for quick service-time changes instead of a lighter "live floor ops" workspace

## Best Redesign Order

### Phase 1: Design system and operational shell alignment

Redesign first:
- Shared operational header/filter/action patterns
- Shared list row, metric card, status chip, drawer, modal, and segmented control patterns
- Semantic status and spacing system
- Tablet density rules and touch target standards

Reason:
- This unlocks safe, incremental redesign without rewriting architecture.
- It prevents every screen from drifting further apart.

### Phase 2: POS service workflow

Redesign next:
- `apps/web/src/app/pos/POSContent.tsx`
- `apps/web/src/components/pos/POSHeader.tsx`
- `apps/web/src/components/pos/OrderPanel.tsx`
- `apps/web/src/components/pos/MenuGrid.tsx`
- `apps/web/src/components/pos/OpenOrdersPanel.tsx`

Reason:
- Highest-frequency revenue workflow.
- Biggest rush impact.
- Best place to reduce taps, keep ticket context visible, and improve tablet ergonomics.

### Phase 3: Host + reservations as one connected operating flow

Redesign next:
- `apps/web/src/app/[restaurantId]/host/HostContent.tsx`
- `apps/web/src/app/admin/reservations/page.tsx`

Reason:
- These should share interaction grammar.
- Seating, waitlist, reservation book, and table assignment are operationally one domain.

### Phase 4: Floor operations layer

Redesign next:
- `apps/web/src/components/pos/TableMap.tsx`
- `apps/web/src/app/admin/floor/page.tsx`

Reason:
- Align live floor view, assignments, and layout management.
- Introduce a simpler manager-facing floor operations mode before touching full layout editing complexity.

### Phase 5: KDS density pass

Redesign next:
- `apps/web/src/app/kds/KDSContent.tsx`
- `apps/web/src/components/kds/TicketCard.tsx`

Reason:
- KDS is already strong.
- This should be an efficiency/density refinement pass, not a visual reboot.

### Phase 6: Workforce/team workflow

Redesign next:
- `apps/web/src/modules/workforce/TeamHubPage.tsx`
- `apps/web/src/app/admin/workforce/page.tsx`
- `apps/web/src/app/admin/staff/page.tsx`

Reason:
- Important manager/staff workflow.
- Benefits from shared patterns established in earlier phases.

### Phase 7: Admin CRUD standardization

Redesign after the operational core:
- orders
- reports
- menu
- modifiers
- combos
- pricing
- taxes
- stations
- discounts
- audit
- inventory
- other admin pages under `apps/web/src/app/admin/*`

Reason:
- These should adopt a proven template system rather than each receiving bespoke redesign work.

### Phase 8: Support and non-operational surfaces

Redesign last:
- `apps/web/src/app/admin/support/page.tsx`
- marketing/public/demo/support-adjacent pages

Reason:
- Support is visually inconsistent, but it is not the first service-speed bottleneck for restaurant operations.
- It should be brought into the product system after the operational core is stable.

## Recommended System Direction

- Keep the current dark operational language as the base for service and management surfaces.
- Standardize around one "operations shell" rather than isolated page hero/header patterns.
- Prefer card/list rows with strong primary actions over desktop-style tables on tablet-heavy screens.
- Reduce stacked chrome above active work areas.
- Make the most important action on each screen obvious, thumb-sized, and persistent.
- Treat POS, host, reservations, floor, and KDS as a single operating family.
- Treat admin CRUD pages as a second family built from the same components but with calmer density.

## Suggested Next Step

Start with a Phase 1 deliverable before any screen rewrite:
- define the shared operational style system
- define standard header/filter/action/list patterns
- define tablet spacing and density rules
- then apply it first to POS, followed by host/reservations
