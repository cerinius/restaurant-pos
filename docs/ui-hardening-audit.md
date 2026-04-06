# UI Hardening Audit

## Shell and Status

- `apps/web/src/components/pos/POSHeader.tsx` owns the POS global header. It was visually oversized for operational use, included redundant identity chrome, and had no active-check visibility control.
- `apps/web/src/app/[restaurantId]/admin/layout.tsx` owns the restaurant admin shell. It already renders `WSStatusBanner`, but `apps/web/src/modules/restaurant-admin/DashboardPage.tsx` rendered a second top status/banner layer, causing duplicate system chrome.
- `apps/web/src/components/ui/WSStatusBanner.tsx` is the only real-time system status component. It should be the single source for reconnect/offline messaging.

## POS Order Entry

- `apps/web/src/app/pos/POSContent.tsx` controls the main POS workspace layout. The current grid hard-coded a narrow right rail (`400px` / `420px`) and provided no way to hide or collapse the ticket.
- `apps/web/src/components/pos/OrderPanel.tsx` is the active check workspace. It showed the right information, but the layout density and fixed parent width made modifiers, notes, courses, and seat details harder to scan on iPad.
- `apps/web/src/components/pos/MenuGrid.tsx` is already touch-oriented, so the bigger usability issue was panel balance rather than menu cards themselves.

## Floor and Host

- `apps/web/src/components/pos/TableMap.tsx` is shared by POS and host. This is the main leverage point for improving table density, default scale, touch targets, and room usability across workflows.
- `apps/web/src/app/[restaurantId]/host/HostContent.tsx` hard-coded a `lg:grid-cols-[minmax(0,1fr)_360px]` layout, so the host right rail dominated the screen even when staff primarily needed the floor.
- Table rendering in `TableMap` capped scaling at natural size and often left large amounts of unused canvas space. Small tables were technically visible but not comfortably operable.

## Admin Dashboard

- `apps/web/src/modules/restaurant-admin/DashboardPage.tsx` mixed real operational data with mocked “PULSE AI” nudges and duplicate status/header chrome.
- The dashboard can already source honest data from real hooks:
  - sales: `api.getSalesReport`
  - open orders: `api.getOpenOrders`
  - kitchen throughput: `api.getKDSStats`
  - low stock: `api.getLowStockAlerts`
  - audit: `api.getAuditLogs`
  - reservations: `api.getReservations`
  - staffing: `api.getStaff`
  - floor state: `api.getTables`

## Mock / Deceptive Data Sources

- `apps/web/src/modules/restaurant-admin/DashboardPage.tsx` contained hard-coded `AI_NUDGES` and “PULSE AI Active” messaging.
- `apps/web/src/app/admin/intelligence/page.tsx` was fully mocked: hard-coded insights, KPI counts, forecasts, trends, top items, and staff performance.
- `apps/web/src/app/[restaurantId]/admin/layout.tsx` exposed the mocked intelligence module in production navigation.

## Responsiveness Failures

- POS relied on a fixed right ticket width and had no breakpoint-aware detail-panel behavior.
- Host used a fixed right rail instead of allowing the floor to dominate the workspace.
- `TableMap` default scaling only shrank to fit and did not intelligently enlarge tables for spacious viewports like iPad Air landscape.
- Admin consumed too much vertical space with stacked status/header bands before users reached actionable content.
