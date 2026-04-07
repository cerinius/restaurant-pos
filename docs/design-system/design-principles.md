# Restaurant POS Design Principles

## Purpose

This system exists to make the product faster to use during live service, easier to scan on tablet, and more consistent across POS, host, KDS, workforce, reservations, and admin workflows.

It is not a branding exercise. It is an operational interface standard.

## Core Principles

### 1. Optimize for service speed

- The primary action on a screen must be obvious within one second.
- The most common rush-time actions should require the fewest taps.
- Important context should stay visible while actions are taken.
- Avoid mode changes unless they save significant space or complexity.

### 2. Design for touch-first operations

- Primary surfaces should assume iPad and touch interaction before mouse precision.
- Tappable controls must be large, separated, and visually stable.
- Critical actions should avoid tiny hit areas, dense inline links, or hover-only affordances.
- Repeated service actions should live in predictable positions.

### 3. Keep information dense, but calm

- Show enough information to reduce navigation, but not so much that scan speed drops.
- Group related data into compact panels with clear hierarchy.
- Use typography, spacing, and surface contrast to create order instead of decorative variation.
- Prefer fewer, stronger visual patterns repeated consistently.

### 4. Prioritize scanability over decoration

- Status, urgency, assignment, timing, and money must be visible at a glance.
- Color is support, not the only signal.
- Labels should be short, operational, and consistent across screens.
- Numbers that matter in service should use tabular alignment where possible.

### 5. Use one operational language

- POS, host, KDS, reservations, floor, workforce, and tenant admin should feel like one product family.
- Shared tasks should use shared patterns.
- Shared statuses should use the same semantic tokens.
- Shared components should not be rebuilt screen by screen.

### 6. Preserve architecture, standardize presentation

- Improve existing layouts and components before inventing new structural systems.
- Prefer semantic wrappers, shared primitives, and tokens over page-specific styling.
- Build on the current `globals.css` primitives and existing feature modules where possible.

### 7. Make state obvious

- Users should always know:
  - where they are
  - what is selected
  - what is blocked
  - what is urgent
  - what action is next
- Empty, loading, offline, syncing, success, and warning states must be intentional, not incidental.

### 8. Reduce chrome above active work

- Service screens should maximize floor, menu, ticket, reservation, and station workspace.
- Stacked headers and decorative wrappers should be compressed if they reduce operational area.
- Secondary metrics should support, not dominate, the main work surface.

### 9. Prefer consistency over novelty

- New screens should use the same action bar, filter rail, list row, drawer, modal, and panel grammar.
- Visual changes should solve operational problems, not add style variance.
- If a pattern already works in POS/host/KDS, reuse it before inventing a new one.

### 10. Design for gradual rollout

- The system must support phased adoption.
- Shared foundations should be usable without forcing a full rewrite.
- The first goal is alignment, not perfection.

## Product-Specific UX Priorities

### POS

- Keep the active check discoverable at all times.
- Reduce switching cost between floor, menu, and open checks.
- Keep payment and fire actions high-confidence and easy to reach.

### Host and reservations

- Treat reservation book, waitlist, table suggestion, and seating as one connected flow.
- Make table and server recommendation states easy to scan and quick to confirm.

### KDS

- Maximize ticket density without sacrificing urgency recognition.
- Make bump, rush, and recall actions highly reliable under pressure.

### Floor and table management

- Separate live operations from full layout editing.
- Make section ownership, table status, and room focus obvious.

### Workforce and admin

- Replace desktop CRUD feel with touch-ready operational management patterns.
- Use consistent page headers, filter rails, and list/table hybrids for manager workflows.
