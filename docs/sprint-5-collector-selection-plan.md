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
- **Booklet validity rule**: collector booklet must stay within **35-50 artworks** for cycle eligibility.
- **Selection semantics**: subscribing to a creator auto-adds latest eligible release by default; collector can customize.
- **Quote transparency**: UI should show a clear pricing breakdown from provider quote response and indicate when values are estimates vs frozen.

## Scope

### In Scope

- creator subscribe/unsubscribe flow
- auto-assignment of latest releases
- always-on booklet cart UX (mobile + desktop)
- 35-50 artwork validity enforcement
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
- **Eligibility path**: booklet must remain within **35-50 artworks** at checkout time.
- **Pricing path**: collector sees transparent estimate derived from live POD quote variables (country + page count).

## Tasks

### S5-T1: Subscription Rules & Creator Limits

**Effort: 4-6 hours**

- Enforce collector subscription limits:
  - minimum subscribed creators for eligibility: **3**
  - maximum subscribed creators: **10**
- Enforce in server actions (`subscribeToCreator`, unsubscribe edge cases) and UI messaging.
- Clarify semantics in product copy: subscribe means default auto-inclusion, not locked inclusion.
- Block invalid actions with explicit validation errors and revalidation.
- Tests for limit edges (2->3, 10->11, unsubscribe below min eligibility behavior).

---

### S5-T2: Auto-Assignment of Latest Releases on Subscribe/Publish

**Effort: 4-6 hours**

- On subscribe, auto-select creator's latest published release for current open cycle (idempotent).
- On creator publish, auto-select for active subscribers (idempotent).
- Keep manual deselect supported after auto-add.
- Allow manual add from non-subscribed creators.
- Add deterministic ordering rules for release selections.

---

### S5-T3: Mobile-First Booklet Cart (Always-On Selection Summary)

**Effort: 8-12 hours**

- Implement collector cart surface:
  - mobile: sticky bottom summary + expandable sheet
  - desktop: persistent sidebar
- Show:
  - selected releases
  - per-release artwork count
  - total artwork count
  - validity state (`<35` invalid, `35-50` valid, `>50` invalid)
  - delta messaging (for example: "5 artworks needed", "3 over limit")
- Include quick actions:
  - remove release
  - replace release (jump into discover context with guided alternatives)
- Label entries by source (`Auto-added from subscription` vs `Manually added`).

---

### S5-T4: Release Selection Constraints & Guardrails

**Effort: 6-8 hours**

- Centralize server-side validation for booklet artwork range: **min 35 / max 50**.
- Apply validation in:
  - selection toggle
  - auto-assignment
  - checkout CTA eligibility
- Ensure manual customization cannot bypass 35-50 rule.
- Expose summary endpoint/action (`totalArtworks`, `isValid`, `artworksNeeded`, `artworksOver`).
- Ensure lock-date read-only behavior is honored.

---

### S5-T5: Dynamic Quote Preview for Upcoming Cycle

**Effort: 6-8 hours**

- Add pricing preview on booklet/cart surfaces using POD quote inputs:
  - delivery country
  - computed booklet page count from selected artworks/layout rules
- Display transparent quote breakdown from provider response:
  - base production amount
  - shipping amount
  - applied markup amount
  - estimated total charge
- Show estimate state when cycle is open and price is not yet frozen.
- Block quote-dependent CTA when country/address is missing or unsupported.
- Persist quote input context for later freeze at lock in Sprint 6.

---

### S5-T6: Checkout/Commit CTA for Upcoming Cycle

**Effort: 5-7 hours**

- Add collector CTA to commit booklet for upcoming cycle.
- Enable CTA only when:
  - collector has valid selection state
  - booklet artwork count is within **35-50**
  - cycle is open
  - quote preview is available for selected country/address
- CTA copy should state:
  - price is an estimate until lock
  - final charge is based on frozen lock-time quote
- Persist cycle-bound checkout intent snapshot for Sprint 6 billing/fulfillment pipeline.
- Add ineligible states (invalid range, cycle locked, unsupported destination, missing quote inputs).

---

### S5-T7: E2E Coverage for Full Collector Journey

**Effort: 6-8 hours**

- Cover end-to-end flow:
  - start from creator profile
  - subscribe
  - auto-added release appears in cart
  - manual deselect of auto-added release works
  - manual add from non-subscribed creator works
  - explore/add/remove/replace releases
  - enforce 35-50 rule
  - dynamic quote preview visibility and state
  - CTA enabled only when selection + quote conditions are met
- Add mobile viewport tests for cart interactions.

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
