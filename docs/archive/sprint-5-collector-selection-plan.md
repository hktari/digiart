# Sprint 5: Collector Selection & Dynamic Quote Readiness

## Goal

Deliver the MVP-ready collector booklet selection journey with transparent pricing inputs and checkout readiness for the upcoming cycle.

Sprint 5 is the selection and pricing-readiness foundation:

- collectors subscribe to creators and curate booklet content
- the system enforces booklet validity constraints
- pricing preview uses live POD quote inputs (page count + delivery country)
- checkout intent is captured for Sprint 6 billing/fulfillment execution

## Decisions

- **Pricing model**: dynamic per-cycle pricing from POD quote inputs, not fixed regional monthly prices.
- **Markup model**: POD provider markup is configured and returned in quote totals; markup is later split between platform and creator pool.
- **Pricing variables**: page count and delivery country are required pricing dimensions.
- **Geography**: support all POD provider countries available in platform data; unsupported addresses are blocked with explicit UX states.
- **Payment timing**: payment method can be collected before lock; actual charge happens in Sprint 6 at cycle lock using frozen quote snapshot.
- **Booklet validity rule**: collector booklet must stay within **18-500 artworks** for cycle eligibility.
- **Selection semantics**: subscribing to a creator auto-adds latest eligible release by default; collector can customize.
- **Quote transparency**: UI should show a clear pricing breakdown from provider quote response and indicate when values are estimates vs frozen.

## Scope

### In Scope

- creator subscribe/unsubscribe flow
- auto-assignment of latest releases
- always-on booklet cart UX (mobile + desktop)
- 18-500 artwork validity enforcement
- dynamic quote preview integration using page count + country
- eligibility-gated checkout CTA for upcoming cycle
- capture quote context and checkout intent snapshot for Sprint 6

### Out of Scope

- charging collectors
- fulfillment order submission
- creator payout disbursement
- retries/refunds operations

## Sprint 5 Acceptance Model

- **Low effort path**: collector subscribes to creators and gets default release assignments.
- **Customization path**: collector can add/remove releases and keep full control over final booklet.
- **Eligibility path**: booklet must remain within **18-500 artworks** at checkout time.
- **Pricing path**: collector sees transparent estimate derived from live POD quote variables (country + page count).

## Tasks

### S5-T2: Auto-Assignment of Latest Releases on Subscribe/Publish

**Effort: 4-6 hours**

**Status: 🟡 Partially implemented**

- [x] On subscribe, auto-select creator's latest published release for current open cycle (idempotent).
- [x] On creator publish, auto-select for active subscribers (idempotent).
- [x] Keep manual deselect supported after auto-add.
- [x] Allow manual add from non-subscribed creators.
- [x] Notify subscribed collectors when a newly published release is auto-added.
- [ ] Add deterministic ordering rules for release selections.

---

### S5-T3: Mobile-First Booklet Cart (Always-On Selection Summary)

**Effort: 8-12 hours**

**Status: ✅ Implemented**

- Implement collector cart surface:
  - [x] mobile: sticky bottom summary + expandable sheet
  - [x] desktop: persistent sidebar
- Show:
  - [x] selected releases
  - [x] per-release artwork count
  - [x] total artwork count
  - [x] validity state (implemented with current booklet constraints)
  - [x] delta messaging (for example: "18 artworks needed", "3 over limit")
- Include quick actions:
  - [x] remove release
- [x] Label entries by source (`Auto-added from subscription` vs `Manually added`).

---

### S5-T4: Release Selection Constraints & Guardrails

**Effort: 6-8 hours**

**Status: 🟡 Partially implemented**

- [x] Centralize server-side validation for booklet artwork range via active admin-configured constraint (default **18-500**).
- [x] Apply validation in:
  - [x] selection toggle
  - [x] auto-assignment
  - [x] checkout CTA eligibility
- [x] Ensure manual customization cannot bypass range rule (max enforced on add; min/max enforced for checkout eligibility).
- [x] Expose summary endpoint/action (`totalArtworks`, `isValid`, `artworksNeeded`, `artworksOver`).
- [ ] Ensure lock-date read-only behavior is honored.

---

### S5-T5: Dynamic Quote Preview for Upcoming Cycle

**Effort: 6-8 hours**

**Status: 🟡 Partially implemented**

- Add pricing preview on booklet/cart surfaces using POD quote inputs:
  - [x] delivery country
  - [ ] computed booklet page count from selected artworks/layout rules (currently uses fixed page count)
- Display transparent quote breakdown from provider response:
  - [x] base production amount
  - [x] shipping amount
  - [ ] applied markup amount
  - [x] estimated total charge
- [x] Show estimate state when cycle is open and price is not yet frozen.
- [ ] Block quote-dependent CTA when country/address is missing or unsupported.
- [~] Persist quote input context for later freeze at lock in Sprint 6 (quote snapshot persistence exists; freeze binding flow is incomplete).

---

### S5-T6: Checkout/Commit CTA for Upcoming Cycle

**Effort: 5-7 hours**

**Status: 🟡 Partially implemented**

- [~] Add collector CTA to commit booklet for upcoming cycle (CTA/surface exists but no final commit action yet).
- [~] Enable CTA only when:
  - [x] collector has valid selection state
  - [x] booklet artwork count is within configured range (**18-500** default, admin-configurable)
  - [~] cycle is open (indirectly handled via active cycle summary, not explicit guard UX)
  - [ ] quote preview is available for selected country/address
- [ ] CTA copy should state:
  - [ ] price is an estimate until lock
  - [ ] final charge is based on frozen lock-time quote
- [ ] Persist cycle-bound checkout intent snapshot for Sprint 6 billing/fulfillment pipeline.
- [~] Add ineligible states (invalid range implemented; other states incomplete).

---

### S5-T7: E2E Coverage for Full Collector Journey

**Effort: 6-8 hours**

**Status: 🟡 Partially implemented**

- Cover end-to-end flow:
  - [ ] start from creator profile
  - [ ] subscribe
  - [ ] auto-added release appears in cart
  - [ ] manual deselect of auto-added release works
  - [ ] manual add from non-subscribed creator works
  - [~] explore/add/remove releases (covered)
  - [ ] replace releases
  - [ ] enforce range rule
  - [ ] dynamic quote preview visibility and state
  - [ ] CTA enabled only when selection + quote conditions are met
- [ ] Add mobile viewport tests for cart interactions.

## Data Model Changes Summary (Sprint 5)

### Keep

- selection and subscription models introduced for collector booklet curation.

### Remove/Deprecate

- fixed-region pricing assumptions in flow docs and checkout copy.

### Add/Extend

- quote snapshot context fields required for lock-time freeze in Sprint 6:
  - quote input country
  - quote input page count
  - provider quote identifier/reference if available
  - estimate timestamp/expiry metadata if provided

## Dependencies & Prerequisites

- POD quote API access with markup support enabled.
- POD country catalog synced and available in app data.
- address collection UX available before quote-dependent checkout CTA.
- deterministic page-count calculation from booklet composition rules.

## Effort Estimate

| Task      | Effort                             |
| --------- | ---------------------------------- |
| S5-T1     | 4-6 hours                          |
| S5-T2     | 4-6 hours                          |
| S5-T3     | 8-12 hours                         |
| S5-T4     | 6-8 hours                          |
| S5-T5     | 6-8 hours                          |
| S5-T6     | 5-7 hours                          |
| S5-T7     | 6-8 hours                          |
| **Total** | **39-55 hours (5-7 working days)** |
