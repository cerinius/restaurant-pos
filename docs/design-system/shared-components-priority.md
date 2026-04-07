# Shared Components to Standardize First

## Goal

Standardize the smallest set of shared components that will improve consistency across the most important operational workflows without changing architecture unnecessarily.

## Priority 1: Operational page header

Standardize first because it appears across POS, host, KDS, dashboard, reservations, workforce, and many admin screens.

Should include:
- title and section label
- location/date/context slot
- primary action slot
- secondary actions slot
- compact metric chip row when needed
- optional sticky behavior

Current examples to align:
- `apps/web/src/components/pos/POSHeader.tsx`
- `apps/web/src/app/[restaurantId]/host/HostContent.tsx`
- `apps/web/src/app/kds/KDSContent.tsx`
- `apps/web/src/modules/restaurant-admin/DashboardPage.tsx`
- `apps/web/src/app/admin/reservations/page.tsx`

## Priority 2: Filter and action rail

Standardize the pattern used for:
- tabs
- segmented controls
- search
- date/location filters
- quick actions

Why next:
- It reduces page-to-page inconsistency fast.
- It affects reservations, orders, reports, workforce, menu, and CRUD pages.

Current examples to align:
- reservations tab/search/filter row
- POS view switcher and ticket controls
- KDS station strip
- admin page-local filter bars

## Priority 3: Operational panel shell

Standardize the base panel/card families before changing individual pages.

Should define:
- panel levels
- header/body/footer spacing
- border treatment
- elevation level
- compact vs standard variants

Use to unify:
- `.card`
- `.glass-panel`
- `.soft-panel`
- `.ops-shell`
- `.workspace-panel`

Why next:
- Most visual inconsistency currently comes from too many similar-but-different panels.

## Priority 4: List row / management row

Create a shared row pattern for high-scan manager workflows.

Should support:
- primary label
- secondary metadata
- status chip
- leading icon or avatar
- trailing metrics
- inline actions
- selected state

Use on:
- reservations list
- host bookings
- open orders
- staff rows
- audit rows
- support queue
- workforce requests

Why next:
- This is the fastest way to replace desktop CRUD feel with touch-safe operational lists.

## Priority 5: Status chip and badge family

Standardize one semantic status system rather than many local versions.

Should include:
- neutral
- info
- success
- warning
- danger
- selected
- offline/syncing variants

Use on:
- table states
- ticket urgency
- reservation status
- staffing state
- order/payment states

Current base:
- `apps/web/src/components/ui/StatusChip.tsx`
- `.status-chip`
- local chips in POS/host/KDS/admin pages

## Priority 6: Drawer and modal system

Standardize action surfaces for:
- reservations detail
- payment
- modifiers
- order type
- floor tools
- CRUD forms

Should define:
- width classes
- header pattern
- footer action pattern
- stacked field spacing
- destructive action placement

Current base:
- `apps/web/src/components/ui/Drawer.tsx`
- local modal implementations across POS/admin/floor/support

Why next:
- Drawers and modals currently repeat structure and spacing heavily.

## Priority 7: Data-dense touch table

Do not remove all tables. Standardize a touch-safe table variant for manager workflows that truly need columns.

Should support:
- sticky header
- comfortable row height
- large action targets
- compact status chips
- horizontal overflow rules for tablet

Apply to:
- orders
- audit
- reports where row structures remain appropriate

Why next:
- Some admin screens need tables, but the current versions are too desktop-like.

## Priority 8: Workspace split-pane layout

Standardize the two-pane operational workspace pattern used by:
- POS
- host
- reservations detail + list
- support

Should define:
- primary workspace
- secondary persistent pane
- collapse rules
- tablet fallback rules
- pane width bands

Why next:
- This directly supports the highest-value workflows after the header/filter/panel layers are aligned.

## Component Candidates Already Present

These existing pieces should be treated as seeds, not replaced blindly:
- `apps/web/src/components/ui/StatusChip.tsx`
- `apps/web/src/components/ui/Drawer.tsx`
- `apps/web/src/components/ui/KPICard.tsx`
- `apps/web/src/components/ui/NotificationDrawer.tsx`
- `apps/web/src/components/pos/POSHeader.tsx`
- `apps/web/src/components/pos/TableMap.tsx`
- `apps/web/src/components/pos/OrderPanel.tsx`
- `apps/web/src/components/kds/TicketCard.tsx`

## Recommended Standardization Order

1. Operational page header
2. Filter and action rail
3. Panel shell and panel variants
4. Status chips and semantic badges
5. List row / management row
6. Modal and drawer system
7. Split-pane workspace layout
8. Touch-safe data table

## What Not to Standardize First

Avoid starting with:
- marketing pages
- public restaurant site visuals
- SaaS control plane branding
- highly bespoke floor editor tools

Reason:
- Those areas are lower leverage for restaurant operations and would slow down the core rollout.
