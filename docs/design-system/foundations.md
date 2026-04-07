# Restaurant POS Foundations

## Purpose

These foundations define the semantic design system for the existing restaurant POS frontend. They are meant to guide updates to shared styles and components without forcing architectural rewrites.

## Semantic Token Model

### Surface tokens

Use semantic names instead of page-specific color references.

```txt
surface.canvas
surface.canvas-muted
surface.canvas-elevated
surface.panel
surface.panel-subtle
surface.panel-strong
surface.overlay
surface.inverse
```

Recommended values based on the current UI:

```txt
surface.canvas        = #07111F
surface.canvas-muted  = #0C1728
surface.canvas-elevated = #0F172A
surface.panel         = rgba(15, 23, 42, 0.88)
surface.panel-subtle  = rgba(255, 255, 255, 0.04)
surface.panel-strong  = rgba(15, 23, 42, 0.94)
surface.overlay       = rgba(2, 6, 23, 0.78)
surface.inverse       = #F8FAFC
```

### Border tokens

```txt
border.subtle
border.default
border.strong
border.focus
border.selected
border.disabled
```

Recommended values:

```txt
border.subtle   = rgba(148, 163, 184, 0.10)
border.default  = rgba(148, 163, 184, 0.14)
border.strong   = rgba(148, 163, 184, 0.24)
border.focus    = rgba(103, 232, 249, 0.40)
border.selected = rgba(34, 211, 238, 0.45)
border.disabled = rgba(71, 85, 105, 0.45)
```

### Text tokens

```txt
text.primary
text.secondary
text.muted
text.subtle
text.inverse
text.disabled
```

Recommended values:

```txt
text.primary   = #F8FAFC
text.secondary = #CBD5E1
text.muted     = #94A3B8
text.subtle    = #64748B
text.inverse   = #020617
text.disabled  = #475569
```

### Action tokens

Use function-based naming, not raw brand names.

```txt
action.primary.bg
action.primary.fg
action.primary.bg-hover
action.secondary.bg
action.secondary.fg
action.secondary.border
action.positive.bg
action.positive.fg
action.danger.bg
action.danger.fg
action.warning.bg
action.warning.fg
```

Recommended values:

```txt
action.primary.bg        = #67E8F9
action.primary.fg        = #020617
action.primary.bg-hover  = #A5F3FC

action.secondary.bg      = rgba(255, 255, 255, 0.05)
action.secondary.fg      = #F8FAFC
action.secondary.border  = rgba(148, 163, 184, 0.14)

action.positive.bg       = #34D399
action.positive.fg       = #022C22

action.danger.bg         = rgba(239, 68, 68, 0.12)
action.danger.fg         = #FECACA

action.warning.bg        = rgba(251, 191, 36, 0.12)
action.warning.fg        = #FDE68A
```

## Spacing Scale

Use one spacing scale across pages, panels, rows, and controls.

```txt
space.0  = 0
space.1  = 4px
space.2  = 8px
space.3  = 12px
space.4  = 16px
space.5  = 20px
space.6  = 24px
space.7  = 28px
space.8  = 32px
space.10 = 40px
space.12 = 48px
space.14 = 56px
space.16 = 64px
space.20 = 80px
```

Usage rules:
- Use `space.2` to `space.4` inside compact controls and chips.
- Use `space.4` to `space.6` inside cards and list rows.
- Use `space.6` to `space.8` between major sections on operational screens.
- Avoid ad hoc values unless they solve layout math or touch ergonomics.

## Typography Scale

The project already uses `Manrope` as the application font. Keep that as the primary UI typeface for operational clarity.

### Type roles

```txt
type.label.micro
type.label.sm
type.body.sm
type.body.md
type.title.sm
type.title.md
type.title.lg
type.display.sm
```

Recommended scale:

```txt
type.label.micro = 11px / 16px / 800 / 0.16em
type.label.sm    = 12px / 16px / 700 / 0.14em
type.body.sm     = 13px / 18px / 500 / normal
type.body.md     = 14px / 20px / 500 / normal
type.title.sm    = 16px / 22px / 700 / normal
type.title.md    = 20px / 28px / 800 / normal
type.title.lg    = 24px / 32px / 800 / normal
type.display.sm  = 30px / 36px / 900 / normal
```

Rules:
- Use uppercase tracking only for labels, chips, and section kickers.
- Use bold weight for operational hierarchy, not decorative size jumps.
- Avoid more than four type roles on one screen.
- Use tabular numerals for timers, counts, ticket times, and currency-heavy views.

## Color Role System

### Functional roles

```txt
role.accent
role.success
role.warning
role.danger
role.info
role.neutral
role.selection
role.focus
```

Recommended values:

```txt
role.accent    = #22D3EE
role.success   = #34D399
role.warning   = #FBBF24
role.danger    = #F87171
role.info      = #60A5FA
role.neutral   = #94A3B8
role.selection = #67E8F9
role.focus     = #A5F3FC
```

Rules:
- Accent is for selected state, key action emphasis, and live operational affordances.
- Success is for completed or healthy outcomes.
- Warning is for delays, dirty state, partial attention, and review-needed states.
- Danger is for blocked, failed, urgent, overdue, or destructive actions.
- Info is for occupancy, active flow, and secondary informative state where success would mislead.

## Elevation and Shadow Rules

Use shadows to define layers, not style personality.

### Elevation levels

```txt
elevation.none
elevation.1
elevation.2
elevation.3
elevation.overlay
```

Recommended shadows:

```txt
elevation.none    = none
elevation.1       = 0 12px 34px rgba(2, 6, 23, 0.18)
elevation.2       = 0 18px 60px rgba(2, 6, 23, 0.32)
elevation.3       = 0 24px 70px rgba(2, 6, 23, 0.40)
elevation.overlay = 0 30px 100px rgba(2, 6, 23, 0.50)
```

Rules:
- Use `elevation.1` for internal tiles and toolbar stats.
- Use `elevation.2` for standard cards and panels.
- Use `elevation.3` for major workspace shells.
- Use `elevation.overlay` for modals, drawers, and floating overlays.
- Do not stack multiple heavy shadows on one element.

## Border Radius Rules

Use radius to convey component family and touch comfort.

### Radius scale

```txt
radius.sm = 12px
radius.md = 16px
radius.lg = 22px
radius.xl = 24px
radius.2xl = 28px
radius.3xl = 30px
radius.full = 999px
```

Usage rules:
- Inputs, segmented controls, and compact buttons: `radius.md`
- Primary buttons and standard list rows: `radius.lg`
- Panels, drawers, and tickets: `radius.xl` to `radius.2xl`
- Major workspace shells: `radius.2xl` to `radius.3xl`
- Chips and status pills: `radius.full`

## Touch Target Rules

### Minimum targets

```txt
target.compact   = 44px
target.standard  = 52px
target.prominent = 60px
target.keypad    = 68px
target.grid-card = 88px minimum
```

Rules:
- Never place destructive or high-value actions below `44px`.
- Default touch controls should use `52px`.
- Primary bottom navigation and key workflow actions should use `60px`.
- POS item tiles and keypad-style controls should be `68px` or larger.
- Floor/table cards should remain usable at `88px` minimum in compact layouts.
- Keep at least `8px` between adjacent touch targets and `12px` when the actions are high risk.

## Responsive Layout Rules

Design for tablet first, then desktop.

### Breakpoint intent

```txt
compact tablet  = 768-1023px
desktop         = 1024-1439px
wide desktop    = 1440px+
```

### Tablet rules

- Assume landscape iPad is a primary operational target.
- Keep primary action rails visible without requiring hover.
- Use split panes only when each pane still supports touch comfortably.
- Prefer one persistent secondary pane over multiple nested overlays.
- Avoid more than two stacked header bars before the main workspace.

### Desktop rules

- Use wider layouts to reduce mode switching, not to add decorative spacing.
- Increase visible context first: active ticket, reservations rail, server assignments, station counts.
- Keep line lengths controlled even on wide desktop.

### Workspace layout rules

- Operational screens should follow:
  - top operational header
  - optional compact status bar
  - main workspace
  - optional persistent secondary pane
- Manager/admin screens should follow:
  - page header with title, date/location, and primary action
  - filter/action rail
  - content region using cards, rows, or touch-safe data tables

## State Color System

### Table states

```txt
state.table.available = success
state.table.occupied  = info
state.table.reserved  = violet-reservation
state.table.dirty     = warning
state.table.blocked   = neutral-disabled
```

Recommended concrete values:

```txt
table.available.bg   = rgba(16, 185, 129, 0.12)
table.available.fg   = #D1FAE5
table.available.border = rgba(52, 211, 153, 0.30)

table.occupied.bg    = rgba(59, 130, 246, 0.12)
table.occupied.fg    = #DBEAFE
table.occupied.border = rgba(96, 165, 250, 0.30)

table.reserved.bg    = rgba(168, 85, 247, 0.12)
table.reserved.fg    = #E9D5FF
table.reserved.border = rgba(192, 132, 252, 0.30)

table.dirty.bg       = rgba(245, 158, 11, 0.12)
table.dirty.fg       = #FDE68A
table.dirty.border   = rgba(251, 191, 36, 0.30)

table.blocked.bg     = rgba(30, 41, 59, 0.85)
table.blocked.fg     = #94A3B8
table.blocked.border = rgba(71, 85, 105, 0.50)
```

### Ticket states

```txt
state.ticket.normal
state.ticket.warning
state.ticket.danger
state.ticket.rush
state.ticket.bumped
```

Recommended values:

```txt
ticket.normal.bg    = rgba(15, 23, 42, 0.80)
ticket.normal.border = rgba(148, 163, 184, 0.14)

ticket.warning.bg   = rgba(245, 158, 11, 0.12)
ticket.warning.border = rgba(251, 191, 36, 0.40)

ticket.danger.bg    = rgba(239, 68, 68, 0.12)
ticket.danger.border = rgba(248, 113, 113, 0.40)

ticket.rush.bg      = rgba(244, 63, 94, 0.14)
ticket.rush.border  = rgba(251, 113, 133, 0.40)

ticket.bumped.bg    = rgba(16, 185, 129, 0.10)
ticket.bumped.border = rgba(52, 211, 153, 0.30)
```

### Urgency levels

```txt
urgency.normal
urgency.watch
urgency.urgent
urgency.critical
```

Recommended mapping:

```txt
urgency.normal   = neutral/info
urgency.watch    = warning
urgency.urgent   = danger
urgency.critical = rush red with stronger contrast and optional pulse treatment
```

Rules:
- Use urgency tokens for elapsed-time and operational risk, not general selection state.
- Motion should be reserved for critical attention, not routine changes.

### Payment states

```txt
state.payment.pending
state.payment.authorized
state.payment.captured
state.payment.failed
state.payment.refunded
```

Recommended values:

```txt
payment.pending    = warning
payment.authorized = info
payment.captured   = success
payment.failed     = danger
payment.refunded   = neutral
```

### Alert states

```txt
alert.info
alert.success
alert.warning
alert.danger
alert.offline
alert.syncing
```

Recommended values:

```txt
alert.info.bg      = rgba(59, 130, 246, 0.12)
alert.success.bg   = rgba(16, 185, 129, 0.12)
alert.warning.bg   = rgba(245, 158, 11, 0.12)
alert.danger.bg    = rgba(239, 68, 68, 0.12)
alert.offline.bg   = rgba(245, 158, 11, 0.12)
alert.syncing.bg   = rgba(34, 211, 238, 0.12)
```

Rules:
- Offline should remain amber, not red, unless data loss or failure is confirmed.
- Syncing should use accent/info, not success.
- Success should be reserved for confirmed completion.

## Practical Mapping to Current Code

The current system already has useful foundations in `apps/web/src/app/globals.css`.

Immediate mapping:
- `.btn-primary` -> action.primary
- `.btn-secondary` -> action.secondary
- `.btn-danger` -> action.danger
- `.btn-success` -> action.positive
- `.card`, `.glass-panel`, `.soft-panel`, `.ops-shell` -> surface and elevation families
- `.touch-target` -> touch target standard
- `.kds-ticket-*` and `.table-*` -> state token families

This means the next step is not a rewrite. It is a semantic cleanup and consolidation pass.
