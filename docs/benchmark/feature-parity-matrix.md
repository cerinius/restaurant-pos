# Feature Parity Matrix

Scoring guide:

- `UX`: 1 = absent or unusable, 5 = benchmark-class operator experience
- `Technical`: 1 = no real support, 5 = robust backend + UI + permissions + realtime/reporting
- Status values: `EXISTING`, `PARTIAL`, `MISSING`

## Ameego

| Benchmark | Feature | Status | Evidence in Code | UX | Technical | Risk | Recommended Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ameego | Labor forecasting | PARTIAL | `apps/api/src/services/workforce.ts` (`buildLaborSummary`), `apps/web/src/app/admin/workforce/page.tsx` labor tab | 2 | 2 | High | Add demand-driven forecasting using reservations, sales, and covers, plus variance alerts and daily recommendations. |
| Ameego | One-touch scheduling / auto scheduling | EXISTING | `apps/api/src/services/workforce.ts` (`buildAutoSchedule`), `apps/api/src/handlers/workforce.ts`, `apps/web/src/app/admin/workforce/page.tsx` | 3 | 3 | Medium | Improve with rule tuning, shift templates, labor targets, and conflict warnings. |
| Ameego | Employee profiles with skills, availability, time-off | PARTIAL | Availability and profiles exist in `apps/api/src/handlers/workforce.ts`, `apps/api/src/services/workforce.ts`, `apps/web/src/app/admin/workforce/page.tsx`; no real skills/time-off model in `packages/db/prisma/schema.prisma` | 2 | 2 | High | Add skill matrices, certifications, and explicit time-off domain with approval workflow. |
| Ameego | Cross-location staffing | PARTIAL | `UserLocation` in `packages/db/prisma/schema.prisma`, location-aware staff filters in `apps/api/src/routes/staff.ts` | 2 | 2 | Medium | Add cross-location shift pickup, transfer approvals, and multi-location staffing board. |
| Ameego | Time clock / attendance | EXISTING | `ClockEvent` model in `packages/db/prisma/schema.prisma`, `apps/api/src/routes/staff.ts`, `apps/api/src/handlers/workforce.ts`, `apps/web/src/modules/workforce/TeamHubPage.tsx` | 3 | 4 | Medium | Add geofencing/device policy, break enforcement, edits, and attendance exception review. |
| Ameego | Payroll export | MISSING | No payroll export schema, route, or export UI found in `packages/db/prisma/schema.prisma`, `apps/api/src/routes`, `apps/web/src/app/admin` | 1 | 1 | High | Add payroll periods, export batches, CSV mappings, and provider adapters. |
| Ameego | Team messaging / notifications | PARTIAL | Notification store in `apps/web/src/store/index.ts`, support messaging domain in `packages/db/prisma/schema.prisma`, `apps/web/src/components/ui/NotificationDrawer.tsx` | 2 | 2 | Medium | Build internal team channel/thread domain instead of reusing support patterns. |
| Ameego | Shift swapping / shift shop | EXISTING | `apps/api/src/handlers/workforce.ts` request flow, `apps/web/src/modules/workforce/TeamHubPage.tsx`, `apps/web/src/app/admin/workforce/page.tsx` | 3 | 3 | Medium | Add direct swaps, manager SLA controls, and clearer queueing. |
| Ameego | Manager logbook | MISSING | No dedicated logbook model/route/page in `packages/db/prisma/schema.prisma`, `apps/api/src/routes`, `apps/web/src/app/admin` | 1 | 1 | High | Add location/day log entries, handoff notes, follow-ups, and acknowledgement state. |
| Ameego | Labor optimization alerts | PARTIAL | Static labor views in `apps/api/src/services/workforce.ts`, `apps/web/src/app/admin/workforce/page.tsx`; no true alerting pipeline | 2 | 2 | High | Add threshold- and forecast-based alert generation with notifications. |
| Ameego | Labor reporting / financial insights | EXISTING | `apps/api/src/services/workforce.ts`, `apps/web/src/app/admin/workforce/page.tsx`, `apps/web/src/modules/restaurant-admin/DashboardPage.tsx` | 3 | 3 | Medium | Add richer trend reporting, labor % of sales, overtime risk, and exportability. |
| Ameego | Employee self-service | EXISTING | `apps/web/src/modules/workforce/TeamHubPage.tsx`, `apps/api/src/handlers/workforce.ts`, `apps/api/src/routes/staff.ts` | 3 | 3 | Medium | Add mobile-first self-service polish, time-off, documents, and inbox. |
| Ameego | Document storage | MISSING | No employee document model/storage flow found | 1 | 1 | High | Add secure document records, upload metadata, permissions, and retention rules. |
| Ameego | Roles / permissions | PARTIAL | `UserRole` enum in `packages/db/prisma/schema.prisma`, route-level checks across `apps/api/src/routes/*` | 2 | 3 | Medium | Move from coarse role checks to action-level permission policies. |
| Ameego | Digital signatures | MISSING | No signature model, route, or UI found | 1 | 1 | Medium | Add signature capture for onboarding, policy acknowledgment, and payroll approvals. |
| Ameego | POS / payroll integrations | MISSING | No payroll integration adapter layer found | 1 | 1 | High | Add integration abstraction with export/import jobs. |
| Ameego | Early wage access hooks | MISSING | No wage-access hooks or payout domain found | 1 | 1 | Low | Defer until payroll foundation exists; design webhook/export hooks only. |

## Dayforce

| Benchmark | Feature | Status | Evidence in Code | UX | Technical | Risk | Recommended Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dayforce | HR / employee records | PARTIAL | `User` model and staff CRUD in `packages/db/prisma/schema.prisma`, `apps/api/src/routes/staff.ts`, `apps/web/src/app/admin/staff/page.tsx` | 2 | 2 | High | Expand into employee records with emergency contacts, compensation history, docs, and status lifecycle. |
| Dayforce | Payroll | MISSING | No payroll domain | 1 | 1 | High | Add payroll periods, payable time exports, and tip/pay adjustments. |
| Dayforce | Benefits administration | MISSING | No benefits domain | 1 | 1 | Medium | Out of current restaurant-core scope; only add integration-ready employee benefits fields later. |
| Dayforce | Time and attendance | EXISTING | `ClockEvent` + workforce attendance handlers and UI | 3 | 4 | Medium | Add exception workflows, edits, and compliance reporting. |
| Dayforce | Workforce management | EXISTING | `apps/api/src/handlers/workforce.ts`, `apps/api/src/services/workforce.ts`, `apps/web/src/app/admin/workforce/page.tsx`, `apps/web/src/modules/workforce/TeamHubPage.tsx` | 3 | 4 | Medium | Add better forecasting, policies, and multi-location planning. |
| Dayforce | Recruiting / talent acquisition | MISSING | No ATS models/routes/pages found | 1 | 1 | High | Add candidate pipeline, requisitions, stages, and hire conversion later. |
| Dayforce | Onboarding | MISSING | No onboarding domain found | 1 | 1 | High | Add onboarding checklists, document collection, and acknowledgements. |
| Dayforce | Performance / development / retention | MISSING | No reviews/goals/retention domain found | 1 | 1 | Medium | Add lightweight performance notes and review cycles after HR basics. |
| Dayforce | Employee communications / hub / self-service | PARTIAL | Team hub exists in `apps/web/src/modules/workforce/TeamHubPage.tsx`; no real communication hub domain | 2 | 2 | Medium | Add announcements, acknowledgements, and manager/staff inbox. |
| Dayforce | Analytics / workforce intelligence / planning | PARTIAL | Workforce metrics in admin workforce page and dashboard | 2 | 2 | High | Add planning dashboards, forecast-vs-actual, and trend reports. |

## 7shifts

| Benchmark | Feature | Status | Evidence in Code | UX | Technical | Risk | Recommended Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 7shifts | Restaurant scheduling | EXISTING | Workforce scheduling pages, handlers, and services | 3 | 4 | Medium | Improve templates, mobile workflow, and conflict detection. |
| 7shifts | Mobile scheduling | PARTIAL | Team hub is responsive but not optimized as a dedicated mobile scheduling product | 2 | 3 | Medium | Improve shift card ergonomics, request actions, and compact mobile nav. |
| 7shifts | Team communication | PARTIAL | Notification patterns exist, but no first-class team messaging domain | 2 | 2 | Medium | Add shift comments, broadcasts, and read receipts. |
| 7shifts | Manager log book | MISSING | No log book model/route/UI | 1 | 1 | High | Add daily log with follow-ups and shift handoff. |
| 7shifts | Time clocking | EXISTING | `apps/api/src/routes/staff.ts`, workforce start/end shift handlers, Team Hub | 3 | 4 | Medium | Add break controls, exception review, and location/device policies. |
| 7shifts | Task management | MISSING | No task/checklist domain found | 1 | 1 | Medium | Add opening/closing/side-work tasks linked to shifts or dayparts. |
| 7shifts | Labor compliance | PARTIAL | Attendance and role/location checks exist; no compliance rule engine | 2 | 2 | High | Add overtime, break, minor, and spread-of-hours rules. |
| 7shifts | Operations overview | EXISTING | [DashboardPage](c:/Users/user/Downloads/restaurant-pos-complete-reconstructed/restaurant-pos/apps/web/src/modules/restaurant-admin/DashboardPage.tsx) plus workforce/labor tabs | 3 | 3 | Medium | Add exception banners and better multi-day trends. |
| 7shifts | Document storage | MISSING | No document storage domain | 1 | 1 | High | Add secure document upload and acknowledgment flows. |
| 7shifts | Performance management | MISSING | No performance review or coaching domain | 1 | 1 | Medium | Add notes, coaching, and scorecard foundation. |
| 7shifts | Employee onboarding | MISSING | No onboarding flow | 1 | 1 | High | Add onboarding packets, completion state, and document capture. |
| 7shifts | Hiring / ATS | MISSING | No hiring pipeline found | 1 | 1 | High | Add candidate, posting, and stage entities later. |
| 7shifts | Payroll | MISSING | No payroll foundation | 1 | 1 | High | Add export adapters and payroll periods. |
| 7shifts | Tip management | PARTIAL | Tips exist on orders/payments in `packages/db/prisma/schema.prisma`; no staff tip allocation UI/domain | 2 | 2 | High | Add tip declarations, distribution, and shift-level reporting. |
| 7shifts | Tip pooling | MISSING | No tip pool model/route/UI found | 1 | 1 | High | Add pool rules, distributions, and exports. |
| 7shifts | Team engagement | MISSING | No engagement or pulse tooling found | 1 | 1 | Low | Defer until core workforce foundation is complete. |

## Square

| Benchmark | Feature | Status | Evidence in Code | UX | Technical | Risk | Recommended Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Square | Restaurant POS core | EXISTING | POS routes/UI across `apps/web/src/app/pos`, `apps/web/src/components/pos/*`, order/payment/menu routes in `apps/api/src/routes/*` | 4 | 4 | Medium | Continue reducing tap count and adding handheld/table-side polish. |
| Square | Handheld / tableside ordering | PARTIAL | Responsive POS exists, but no dedicated handheld mode/peripheral workflow | 3 | 3 | Medium | Add one-handed layout, compact menu/ticket mode, and scanner-aware flows. |
| Square | Menu and item management | EXISTING | Menu schema + routes + admin pages in `packages/db/prisma/schema.prisma`, `apps/api/src/routes/menu.ts`, `apps/web/src/app/admin/menu/page.tsx` | 4 | 4 | Low | Add bulk editing and import/export. |
| Square | KDS | EXISTING | `KDSTicket` model, `apps/api/src/routes/kds.ts`, `apps/web/src/app/kds/*`, `apps/web/src/components/kds/TicketCard.tsx` | 4 | 4 | Medium | Add station expo routing and production reports. |
| Square | Tabs / bar workflow | PARTIAL | `OrderType.BAR`, floor plan bar-seat support in schema and floor-plan libs; no dedicated bar tab UX | 2 | 3 | Medium | Add tab-oriented bar service workspace and swipe-to-close behaviors. |
| Square | Online ordering | EXISTING | Public ordering components in `apps/web/src/components/public/PublicOrderingExperience.tsx`, public order APIs in `apps/api/src/routes/orders.ts` | 3 | 3 | Medium | Add richer status tracking and production menu availability controls. |
| Square | QR / offline / in-person payment variants | PARTIAL | Offline queue exists in `apps/web/src/lib/offline-sync.ts`; payments exist in `apps/api/src/routes/payments.ts`; no QR payment flow | 2 | 3 | Medium | Add QR pay links and clearer offline recovery UX. |
| Square | Catering / invoicing | MISSING | No catering or invoicing domain found | 1 | 1 | Medium | Add future-order/catering orders plus invoice records. |
| Square | Reporting / dashboards | EXISTING | Reports routes/pages and command center dashboard | 4 | 4 | Low | Add saved views, exports, and trend benchmarks. |
| Square | Inventory reporting | EXISTING | Inventory routes/page plus low-stock alerts | 3 | 3 | Medium | Add usage variance, supplier reports, and depletion forecasting. |
| Square | Multi-location / franchise oversight | PARTIAL | `Restaurant`/`Location` schema, SaaS admin in `apps/web/src/app/admin/page.tsx`, `apps/api/src/routes/saas.ts` | 2 | 2 | High | Add cross-location benchmarks, rollups, and controls. |
| Square | Gift cards | EXISTING | `GiftCard` model, `apps/api/src/routes/giftCards.ts`, `apps/web/src/app/admin/gift-cards/page.tsx` | 3 | 4 | Low | Add reload, transfer, and reporting improvements. |
| Square | Loyalty | MISSING | No loyalty domain found; guest tags/visit count are not loyalty | 1 | 1 | High | Add guest points/rewards rules and redemption flow. |
| Square | Marketing | PARTIAL | `apps/web/src/app/admin/marketing/page.tsx` exists, but weak audience/event grounding | 2 | 2 | Medium | Add real segment definitions, campaign sends, and performance tracking. |
| Square | Payroll hooks / integrations | MISSING | No payroll/export integration layer | 1 | 1 | High | Add export adapters after time/pay/tip foundation. |
| Square | Hardware / peripheral support | MISSING | No explicit hardware abstraction layer found | 1 | 1 | Medium | Add printer/scanner/cash-drawer/provider abstraction. |

## Clover

| Benchmark | Feature | Status | Evidence in Code | UX | Technical | Risk | Recommended Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Clover | POS and payments | EXISTING | POS + payment routes/components | 4 | 4 | Low | Add more payment variants and hardware abstractions. |
| Clover | Food & beverage workflow | EXISTING | Floor plan, modifiers, KDS, happy hour, combos, sections | 4 | 4 | Low | Keep tuning speed and touch ergonomics. |
| Clover | Online ordering | EXISTING | Public ordering flow + public restaurant site | 3 | 3 | Medium | Add channel throttles and more operational controls. |
| Clover | Takeout / curbside / delivery / dine-in flows | PARTIAL | `OrderType` supports dine-in, takeout, delivery; no curbside-specific workflow | 3 | 3 | Medium | Add curbside pickup stages and arrival notifications. |
| Clover | Employee management basics | EXISTING | Staff CRUD, attendance, workforce pages | 3 | 3 | Medium | Add richer records and permissions. |
| Clover | Menu performance insights | PARTIAL | Sales/item reports exist; no focused menu engineering workflow | 2 | 3 | Medium | Add margin/popularity analysis and recommendations. |
| Clover | App marketplace / extensibility | MISSING | No marketplace/plugin foundation inside product | 1 | 1 | High | Add integration/app registry, scopes, and webhook foundation. |
| Clover | Hardware / peripherals | MISSING | No device abstraction layer found | 1 | 1 | Medium | Add hardware connectors and device settings. |
| Clover | Open integration platform | MISSING | No external app auth/webhook management UI/domain | 1 | 1 | High | Add API keys, webhooks, app installs, and audit controls. |

## OpenTable

| Benchmark | Feature | Status | Evidence in Code | UX | Technical | Risk | Recommended Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OpenTable | Reservations | EXISTING | `Reservation` model, `apps/api/src/routes/reservations.ts`, `apps/web/src/app/admin/reservations/page.tsx` | 4 | 4 | Low | Keep expanding CRM depth and external booking channels. |
| OpenTable | Waitlist | EXISTING | `ReservationStatus.WAITLIST`, reservation admin UI, host rail in `apps/web/src/app/[restaurantId]/host/HostContent.tsx` | 4 | 4 | Medium | Add quoted wait accuracy metrics and SMS updates. |
| OpenTable | Host stand workflow | EXISTING | Host shell, shared floor map, reservation host rail, seating actions | 4 | 4 | Medium | Add richer pacing controls and arrival queue management. |
| OpenTable | Automated table assignment | PARTIAL | Reservation suggestion endpoint in `apps/api/src/routes/reservations.ts`, manual/auto section assignment in workforce | 3 | 3 | High | Add pacing-aware auto-assignment using turn time and reservation conflicts. |
| OpenTable | Floor + reservation coordination | EXISTING | Reservation seating route, host rail, table sync logic in reservations route | 4 | 4 | Medium | Add more visual conflict indicators and pacing recommendations. |
| OpenTable | Guest profiles / preferences / visit history | PARTIAL | Reservation fields `tags`, `isVip`, `visitCount`, special requests; weak dedicated CRM | 2 | 2 | High | Add real guest entity, visits, preferences, notes, and linked orders/reservations. |
| OpenTable | Guest relationship management | PARTIAL | Guests admin page exists at `apps/web/src/app/admin/guests/page.tsx`; data model is still shallow | 2 | 2 | High | Build true guest CRM domain with segmentation and history. |
| OpenTable | Reservation widget / booking embeds | MISSING | No embedded booking widget or external booking surface found | 1 | 1 | High | Add embeddable reservation widget and public booking route. |
| OpenTable | POS integrations | PARTIAL | Internal reservations-to-order integration exists; no external POS integration layer | 2 | 2 | Medium | Add external integration adapters and sync jobs. |
| OpenTable | Guest import / segmentation | PARTIAL | Marketing and guests pages exist, but no robust import/segment engine | 2 | 2 | Medium | Add CSV import, saved segments, and guest tags/filters. |
| OpenTable | Marketing / CRM campaigns | PARTIAL | `apps/web/src/app/admin/marketing/page.tsx`, `apps/web/src/app/admin/guests/page.tsx` | 2 | 2 | Medium | Tie campaigns to real guest segments and performance reporting. |
| OpenTable | AI / automation for service operations | MISSING | Intelligence module intentionally gated off in `apps/web/src/lib/features.ts` and `apps/web/src/app/admin/intelligence/page.tsx` | 1 | 1 | Medium | Reintroduce only after real forecasting/ops automation backend exists. |
| OpenTable | Service pacing / seating efficiency | PARTIAL | Reservation suggestions and host rail help; no pacing model or turn-time planner | 3 | 2 | High | Add pacing engine using active checks, elapsed turns, and booked covers. |

## Cross-Benchmark Notes

### Strongest existing areas

- POS core, KDS, menu management, floor planning, pricing/promotions, and real-time sync.
- Workforce scheduling/attendance foundation is real and meaningfully ahead of many restaurant SMB products already.
- Reservation and waitlist support is now operationally connected to the host stand and floor map.

### Biggest current gaps

- Payroll, tip pooling, documents, onboarding, ATS, and app/integration marketplace foundations.
- Guest CRM is still shallow versus OpenTable/Square ecosystems.
- Multi-location analytics and benchmarking are present only in lightweight form.
- Fine-grained authorization is still weaker than enterprise competitors.

### This Pass Implemented

- Host stand reservation coordination inside the live host workspace.
- Reservation table/server suggestion logic in `apps/api/src/routes/reservations.ts`.
- Production-safe intelligence gating so fake analytics are not exposed as real features.
