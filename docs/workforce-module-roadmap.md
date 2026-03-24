# Workforce Module Roadmap

## Goal

Add a workforce layer to RestaurantOS that covers:

- manager scheduling
- staff availability and time-off
- table and section assignment by scheduled server
- auto-assignment suggestions
- shift start and shift end flows
- live labor cost tracking
- timesheets and payroll-ready hour summaries
- shift give-up and pick-up flows
- higher-tier AI operations assistance

## Current baseline in this repo

- Staff records already exist in `User` and `UserLocation`.
- Basic clock events already exist in `ClockEvent`.
- Floor-based table assignments already exist in `floorPlan.tableAssignments` inside location settings.
- The admin already has `Staff`, `Floor Plan`, and `Reports`, which gives us a good foundation.

This means we do not need a separate workforce product. We need a new workforce module that plugs into the existing staff, floor, and reporting systems.

## Product direction

The best version of this feature set is a dedicated `Workforce` area in admin with four screens:

1. `Scheduling`
2. `Section Assignments`
3. `Timesheets`
4. `Labor`

For staff, we should add a dedicated self-service area with:

1. `My Schedule`
2. `Availability`
3. `Time Off`
4. `Shift Marketplace`
5. `Start Shift / End Shift`

## What to borrow from Dayforce, 7shifts, and Ameego

Keep these ideas, but adapt them to a restaurant-first product:

- Dayforce-style labor-aware scheduling:
  use demand, labor budget, preferences, and rules when building schedules.
- Dayforce-style self-service availability:
  let staff define default availability plus temporary changes.
- 7shifts-style shift marketplace:
  allow give-up, trade, and pick-up flows with manager approval.
- 7shifts-style schedule enforcement:
  scheduled shifts should govern who can start a shift, with manager override when needed.
- Ameego-style one-touch scheduling:
  auto-build most of the schedule using historical demand, then let managers adjust.
- Ameego-style labor forecasting:
  surface expected labor cost while scheduling, not after payroll.

## Admin information architecture

### 1. Scheduling

Purpose:
Build and publish shifts for the week.

Core manager actions:

- select location
- pick week
- see labor target and projected sales
- drag staff into shifts
- duplicate last week
- auto-build a draft schedule
- publish schedule
- lock approved shifts

Views:

- weekly grid
- daily roster
- employee list
- open shifts panel

Cards and metrics:

- scheduled hours
- actual clocked hours
- projected labor cost
- labor percentage versus sales
- open shifts
- unfilled key roles

### 2. Section Assignments

Purpose:
Assign dining room tables to the staff actually scheduled for that shift.

Primary interaction:

- manager picks a shift window, for example lunch or dinner
- manager selects a server
- manager clicks tables to assign them

Supporting features:

- show only scheduled and qualified servers
- show who is clocked in now
- highlight table clusters by room
- bulk assign a room or a row of tables
- lock a server's section
- rebalance with one click

Auto-assign button:

- use the published schedule for the chosen shift window
- prefer servers over non-server roles
- keep bartenders tied to bar rooms
- create contiguous sections using floor coordinates
- weight assignments by seat count and table count
- allow managers to edit anything after generation

For v1, this screen can continue writing to `floorPlan.tableAssignments`.
For v2, we should persist assignment history by shift so we can compare planned versus actual sections.

### 3. Timesheets

Purpose:
Give managers a payroll-ready view of hours worked.

Show:

- scheduled hours
- clocked hours
- break time
- overtime
- missed punches
- early or late punches
- manager overrides

Actions:

- approve timesheet
- edit punch
- add manager note
- export payroll summary

### 4. Labor

Purpose:
Show live labor cost while the shift is happening.

Show:

- current labor dollars
- projected labor dollars by end of day
- labor percentage versus current sales
- scheduled versus actual headcount
- clocked-in roster by role
- overtime risk

## Staff experience

### My Schedule

Staff should see:

- upcoming shifts
- role, room, and location
- notes
- who else is working
- whether a shift is open to give up or trade

### Availability

Staff should be able to submit:

- default weekly availability
- temporary availability changes
- blackout dates
- preferred shifts

Managers should be able to approve, decline, or override.

### Time Off

Staff should be able to request:

- full-day time off
- partial-day time off
- unpaid or paid categories later if payroll is added

### Shift Marketplace

Staff should be able to:

- offer a shift
- request a direct trade
- pick up an open shift

Rules:

- manager approval required before finalizing
- only show eligible staff by role and location
- original employee stays responsible until approved

### Start Shift / End Shift

This should become a dedicated workflow, not just a raw clock button.

Start shift flow:

1. staff signs in
2. app shows today's scheduled shift, if one exists
3. staff taps `Start Shift`
4. manager enters approval PIN
5. system creates a shift attendance session and a clock-in event
6. labor cost starts updating immediately

End shift flow:

1. staff taps `End Shift`
2. system records clock-out
3. if punch is unusual, manager PIN is requested
4. timesheet totals update immediately

Recommended policy:

- require manager approval for all shift starts in v1 if that matches your operating model
- later add a setting to require manager approval only for unscheduled, early, or late punches

## Proposed data model

Add these Prisma models:

### WorkforceAvailability

- `id`
- `userId`
- `locationId`
- `dayOfWeek`
- `startTime`
- `endTime`
- `status`
- `effectiveFrom`
- `effectiveTo`
- `isTemporary`

### TimeOffRequest

- `id`
- `userId`
- `locationId`
- `startsAt`
- `endsAt`
- `isPartialDay`
- `reason`
- `status`
- `reviewedBy`
- `reviewedAt`

### ScheduledShift

- `id`
- `restaurantId`
- `locationId`
- `userId`
- `role`
- `startsAt`
- `endsAt`
- `shiftLabel`
- `roomName`
- `status`
- `publishedAt`
- `publishedBy`
- `notes`

### ShiftTradeRequest

- `id`
- `shiftId`
- `requestType`
- `requestedBy`
- `targetUserId`
- `status`
- `reviewedBy`
- `reviewedAt`
- `notes`

### ShiftAttendance

- `id`
- `scheduledShiftId`
- `userId`
- `locationId`
- `clockInAt`
- `clockOutAt`
- `breakMinutes`
- `managerApprovedStartBy`
- `managerApprovedEndBy`
- `approvalReason`
- `status`

### TableAssignmentSnapshot

Optional for v2:

- `id`
- `scheduledShiftId`
- `locationId`
- `tableId`
- `serverId`
- `serverName`
- `source` (`manual` or `auto`)
- `locked`

## API design

Use a dedicated Fastify plugin for this area:

- `apps/api/src/routes/workforce.ts`
- `apps/api/src/handlers/workforce/*`
- `apps/api/src/services/workforce/*`

Suggested endpoints:

- `GET /api/workforce/schedule`
- `POST /api/workforce/schedule/build`
- `POST /api/workforce/schedule/publish`
- `PUT /api/workforce/shifts/:id`
- `GET /api/workforce/availability`
- `POST /api/workforce/availability`
- `GET /api/workforce/time-off`
- `POST /api/workforce/time-off`
- `POST /api/workforce/time-off/:id/review`
- `GET /api/workforce/shift-marketplace`
- `POST /api/workforce/shift-marketplace`
- `POST /api/workforce/shift-marketplace/:id/review`
- `GET /api/workforce/section-assignments`
- `POST /api/workforce/section-assignments/auto-assign`
- `POST /api/workforce/section-assignments/save`
- `POST /api/workforce/shift-attendance/start`
- `POST /api/workforce/shift-attendance/end`
- `GET /api/workforce/timesheets`
- `GET /api/workforce/labor/live`

## Auto-assign logic for sections

Inputs:

- published shifts for a location and shift window
- active floor plan
- current tables and capacities
- role rules
- optional locked assignments

Rules:

1. only include scheduled staff assigned to server-capable roles
2. prefer staff clocked in and approved for the shift
3. keep assignments contiguous using table coordinates
4. weight by total seats, not just table count
5. keep special areas together, for example patio, bar, private room
6. allow locked tables and locked rooms
7. keep final output editable

Simple v1 algorithm:

- cluster tables by room and proximity
- divide clusters across scheduled servers
- minimize travel distance and total seat imbalance

Better v2 algorithm:

- add demand weighting by reservations, open orders, and historical turn times

## Labor cost calculation

Live labor cost should be based on:

- active `ShiftAttendance`
- hourly rate on the user profile
- break time
- overtime thresholds
- scheduled versus actual comparisons

Needed staff fields:

- `hourlyRate`
- `overtimeRate`
- `jobCode`
- `isEligibleForTips`

If we do not want to modify `User` heavily, these can live in a `UserCompensationProfile` model.

## Recommended implementation phases

### Phase 1: Scheduling foundation

- Prisma models for shifts, availability, time off
- admin scheduling screen
- staff self-service schedule and availability
- publish schedule

### Phase 2: Shift execution

- start shift and end shift flow
- manager PIN approval
- live labor tracker
- timesheet summaries

### Phase 3: Section assignment

- dedicated assignment screen
- assign-by-server workflow
- auto-assign from scheduled staff
- manual rebalance tools

### Phase 4: Marketplace and advanced controls

- give up shift
- trade shift
- pick up shift
- approval queue
- schedule enforcement rules

### Phase 5: Premium intelligence

- labor forecasting using historical sales
- one-touch schedule draft generation
- suggested section balancing
- staffing alerts

## Tiering recommendation

### Basic

- staff records
- simple floor-based assignment
- current clock events

### Pro

- scheduling
- availability and time off
- shift marketplace
- timesheets
- section assignment screen

### Deluxe / Enterprise

- auto-build schedules
- live labor forecasting
- auto-assign sections from schedule
- schedule enforcement and manager overrides
- compliance rules
- AI assistant features

## AI assistant concept for the top tier

Good uses for an AI layer here:

- auto-reply to common staff questions about schedule, availability, and shift swaps
- summarize open coverage gaps for managers
- suggest the best staff member to call in
- explain labor spikes in plain language
- draft announcements to the team
- answer "who is working tonight?", "who is available?", and "who is approaching overtime?"

This should not approve payroll or edit schedules on its own in v1.
It should recommend, draft, summarize, and reply with manager visibility.

## Recommended first build

The cleanest first delivery is:

1. `Scheduling`
2. `Availability / Time Off`
3. `Start Shift / End Shift`
4. `Timesheets`
5. `Section Assignments` with `Auto Assign`

That sequence gives the platform one coherent story:

schedule the team, let them see it, let them start their shift, track labor, then assign tables to the people actually working.
