# Sprint 6: Billing, Fulfillment & Creator Payout Operations

## Goal

Operationalize cycle execution after Sprint 5 selection readiness:

- freeze dynamic quote at lock
- charge collector using frozen amount
- generate booklet PDF and submit POD order
- reconcile billing and fulfillment outcomes
- calculate and disburse creator payouts from realized amounts

## Core Decisions

- **Billing source of truth**: Stripe remains source of truth for payment outcomes.
- **Pricing source of truth**: POD quote response with provider-managed markup.
- **Charge model**: no fixed regional price IDs; charge lock-time frozen quote amount per collector/cycle.
- **Freeze model**: re-quote at cycle lock, persist immutable quote snapshot, then charge from snapshot.
- **Fulfillment eligibility**: only paid, quote-valid, address-valid collector cycles proceed.
- **Creator payout source**: realized paid and fulfillment-eligible amounts only.
- **Disbursement rail**: PayPal Payouts for MVP.

## End-to-End Flow

1. Collector commits booklet during open cycle (Sprint 5).
2. At lock:
   - recompute page count
   - fetch fresh POD quote with configured markup
   - freeze immutable quote snapshot per collector/cycle
3. Attempt Stripe charge from frozen total.
4. If paid:
   - generate PDF
   - submit and pay POD order
5. Track fulfillment via webhooks.
6. Reconcile paid/fulfilled rows.
7. Calculate creator payout pool from realized markup split and disburse via PayPal.

## Sprint 5 Carry-Over (Prerequisites for Sprint 6)

These items were partially implemented in Sprint 5 and are required before the freeze → charge → fulfill pipeline can execute.

### S6-T0a: Checkout Commit Action & Intent Snapshot

**Effort: 3-4 hours**

**Status: ✅ COMPLETE**

- ✅ Implement the commit action that bridges selection (Sprint 5) to freeze/charge (Sprint 6).
- ✅ Persist a cycle-bound `CheckoutIntent` record per collector/cycle:
  - collector profile id
  - cycle id
  - committed at timestamp
  - snapshot of current selections (release ids + artwork counts)
  - quote input context (country, page count at commit time)
  - acceptance of estimate-vs-final disclaimer
- ✅ Mark collector as "committed" — this is the signal `freezeCollectorCycleQuote` iterates over.
- ✅ Allow recommit (update snapshot) while cycle is still open; freeze to last commit at lock.
- ✅ Server action: `commitBookletForCycle(cycleId)`.

---

### S6-T0b: Deterministic Release Ordering Rules

**Effort: 1-2 hours**

**Status: ✅ COMPLETE**

- ✅ Define and implement deterministic ordering for booklet composition:
  - primary: creator `joinedAt` ascending (earliest creators first)
  - secondary: release `publishedAt` ascending within each creator
  - tertiary: artwork `position` or `id` ascending within each release
- ✅ Apply ordering in:
  - booklet cart display
  - PDF composition handler (S6-T6)
  - quote page-count calculation (S6-T0d)
- ✅ Encode as a shared utility so all consumers produce identical order.

---

### S6-T0c: Lock-Date Read-Only Enforcement

**Effort: 2-3 hours**

**Status: ✅ COMPLETE**

- ✅ Prevent selection mutations after cycle lock date:
  - subscribe/unsubscribe blocked
  - add/remove release blocked
  - recommit blocked
- ✅ Server-side guard on all collector mutation endpoints and server actions.
- ✅ Return clear error with lock date and next-cycle info.
- ⚠️ UX: disable interactive controls in cart/selection UI post-lock with tooltip explaining why (deferred for UI polish)
- ⚠️ Admin override for exceptional cases (with audit log) (deferred for admin UX)

---

### S6-T0d: Dynamic Page Count Calculation

**Effort: 2-3 hours**

**Status: ✅ COMPLETE**

- ✅ Replace fixed page count assumption with real calculation from selected artworks.
- ✅ Implement `computeBookletPageCount(selections, layoutRules)`:
  - 1 page per artwork (full-bleed)
  - +1 cover page
  - +1 back cover
  - pad to even page count if needed (booklet binding requirement)
- ✅ Use in:
  - quote preview (S5-T5 / cart surfaces)
  - freeze job (S6-T3)
  - PDF composition (S6-T6)
- ✅ Unit tests for edge cases: 0 selections, odd count, large booklets.

---

### S6-T0e: Quote Context Persistence, Markup Display & UX Copy

**Effort: 3-4 hours**

**Status: ✅ COMPLETE**

- ✅ Persist full quote input context for later freeze binding:
  - delivery country (from collector address)
  - computed page count (from S6-T0d)
  - provider quote reference/id when available
  - estimate timestamp
- ✅ Display complete markup breakdown in quote preview UI:
  - base production amount
  - shipping amount
  - **platform markup amount** (fixed platform fee via PLATFORM_MARKUP_EUR env var)
  - estimated total
- ✅ UX copy throughout the commit/checkout flow:
  - Cart: label total as **"Estimated total"** with tooltip: "Final price is locked at cycle end based on your selections and delivery address."
  - Commit CTA: **"Commit booklet — you'll be charged when the cycle closes"**
  - Post-commit confirmation: "Your booklet is locked in. We'll charge [estimated total] on [lock date]. The final amount may vary slightly based on live production costs."
  - Ineligible states: clear reason messaging ("Add X more artworks", "Set delivery address", "Country not supported")
- ✅ Ensure estimate state is visually distinct from frozen/final state (e.g., "Estimated" badge vs "Locked" badge).

---

## Sprint 6 Tasks

### S6-T1: Schema — Quote Freeze, Billing, and Fulfillment Models

**Effort: 4-6 hours**

**Status: ✅ COMPLETE**

- ✅ Replace fixed-price assumptions in billing models with dynamic quote snapshot linkage.
- ✅ Add/extend quote freeze model for collector-cycle record:
  - collector profile id
  - cycle id
  - destination country
  - frozen page count
  - provider quote reference
  - base amount
  - shipping amount
  - markup amount
  - total amount
  - currency
  - frozen at timestamp
  - quote metadata hash/version for auditability
- ✅ Add/extend billing record:
  - link to frozen quote snapshot
  - Stripe invoice/payment intent references
  - charge status and paid timestamp
- ✅ Add `FulfillmentOrder` model for POD lifecycle status tracking.
- ✅ Add Stripe identifiers where needed (customer + billing references).
- ✅ Add `stripeCustomerId` to CollectorProfile for customer caching.
- ✅ Add `GRACE_PERIOD` to BillingRecordStatus for payment method issues.
- ✅ Add `StripeWebhookEvent` model for webhook idempotency.
- ✅ Keep PayPal payout profile lightweight for MVP (legal name + PayPal email + readiness).
- ✅ Run and commit migration.

---

### S6-T2: Stripe Setup — Payment Method + Off-Session Charge Flow

**Effort: 6-8 hours**

**Status: ✅ COMPLETE**

- ✅ Add Stripe env vars for dynamic charge flow (no region price IDs required):
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- ✅ Ensure collector has reusable payment method attached for off-session lock-date charging.
- ✅ Implement service for lock-date charging from frozen quote snapshot.
- ✅ Store Stripe billing references idempotently.
- ✅ Stripe customer ID caching in CollectorProfile.
- ✅ Webhook route: `app/api/webhooks/stripe/route.ts`
  - verify signature
  - handle payment success/failure and status transitions
  - reconcile local billing state idempotently
  - handle `payment_intent.processing` event
  - skip already-processed events (idempotency via StripeWebhookEvent)
- ✅ Enhanced charge service:
  - payment method validation before charge
  - GRACE_PERIOD for missing payment methods
  - card error handling with specific messages
  - retryable flag for network errors
  - Stripe client with lazy initialization and retry config
- ⚠️ Tests:
  - off-session charge success/failure (in progress)
  - idempotent webhook handling (in progress)
  - signature failure path (in progress)

---

### S6-T3: Cycle Lock Quote Freeze Job

**Effort: 5-7 hours**

**Status: ✅ COMPLETE**

- ✅ Service: `freezeCollectorCycleQuote(cycleId)`
- ✅ For each committed collector:
  - compute final page count from locked selections
  - resolve destination country/address
  - fetch POD quote with configured markup
  - persist immutable snapshot
- ✅ Mark records ineligible when quote/address/destination is invalid.
- ⚠️ Emit admin alerts for freeze failures (deferred for notification infra).
- ✅ Guarantee idempotent reruns.

---

### S6-T4: Billing Reconciliation & Fulfillment Eligibility

**Effort: 4-6 hours**

**Status: ✅ COMPLETE**

- ✅ Scheduled reconciliation job:
  - expected charges from frozen snapshots
  - paid/failed/pending status from Stripe
  - eligibility flag for fulfillment pipeline
- ✅ Enhanced with chunked processing (20 records per batch) to avoid rate limits.
- ✅ Parallel processing with Promise.allSettled.
- ⚠️ Admin retry action for stale/missing webhook cases (deferred for admin UX).
- ⚠️ Tests for paid, failed, canceled, and webhook-late paths (deferred to test implementation phase).

---

### S6-T5: PDF Generation Trigger at Lock

**Effort: 4-5 hours**

**Status: ✅ COMPLETE**

- ✅ Trigger PDF generation for collectors that are both:
  - paid
  - quote-frozen and fulfillment-eligible
- ✅ Create/update `GeneratedPrintFile` (`status: PENDING`) and enqueue jobs.
- ✅ Enqueue BullMQ jobs with `booklet-generation` queue.
- ✅ Include issue label (cycle name + year) in job data.
- ✅ Edge handling:
  - zero selections -> skip + log
  - unpaid -> skip + surface in admin dashboard
  - quote freeze missing -> skip + alert
  - already READY or GENERATING -> skip

---

### S6-T6: PDF Worker — Booklet Composition

**Effort: 8-10 hours**

**Status: ⚠️ DEFERRED** (PDF Worker is separate app; composition logic exists in pdf-worker but integration with new BullMQ job format pending)

- BullMQ handler in `apps/pdf-worker`:
  - fetch selected releases/artworks in deterministic order
  - build PDF (cover, artwork pages, back cover, even-page padding)
  - upload and mark `GeneratedPrintFile` as `READY`
  - on failure: `FAILED`, `errorMessage`, retry policy
- Unit tests for layout and page-count logic.

**Note**: PDF Worker exists but needs update to consume new job format with issue label.

---

### S6-T7: POD Order Submission & Payment

**Effort: 8-10 hours**

**Status: ✅ COMPLETE**

- ✅ Service: `submitFulfillmentOrder(generatedPrintFileId)`
- ✅ Use frozen quote context and generated PDF output.
- ✅ Submit POD order and pay via provider credit flow.
- ✅ Create/update `FulfillmentOrder` with provider order id + status.
- ✅ Error handling:
  - insufficient credits -> admin action + retry
  - provider/API failures -> failed state + reason
- ✅ Peecho API integration with proper file_details structure.

---

### S6-T8: POD Webhook Handler

**Effort: 4-5 hours**

**Status: ✅ COMPLETE**

- ✅ Route: `app/api/webhooks/peecho/route.ts`
- ✅ Verify webhook signature.
- ✅ Map provider events to `FulfillmentOrder` lifecycle statuses.
- ✅ Persist tracking details and failure reasons.
- ⚠️ Trigger collector notification on shipped status if email infra exists (deferred for notification infra).

---

### S6-T9: Collector Order Status UI

**Effort: 3-4 hours**

**Status: ✅ COMPLETE**

- ✅ Route: `app/collector/orders/page.tsx` (or embedded equivalent).
- ✅ Show timeline states:
  - Quote frozen
  - Charge pending/paid/failed
  - Generating
  - Processing
  - Shipped
  - Delivered/Failed
- ✅ Show tracking metadata when available.

---

### S6-T10: Admin Fulfillment & Billing Dashboard

**Effort: 5-7 hours**

**Status: ✅ COMPLETE**

- ✅ Route: `app/admin/cycles/[id]/fulfillment/page.tsx`
- ✅ Table dimensions:
  - collector
  - quote freeze status + total
  - Stripe billing status
  - PDF status
  - POD order status + tracking
- ✅ Highlight intervention buckets:
  - freeze failure
  - payment failure
  - missing address
  - PDF failure
  - POD failure/credit issue
- ✅ Include summary counts and manual retry actions (read-only view; retry actions deferred for admin UX).

---

### S6-T11: Creator Earnings & Payout Ledger

**Effort: 6-8 hours**

**Status: ✅ COMPLETE**

- ✅ Service: `calculateCreatorEarningsForCycle(cycleId)`
- ✅ Compute creator pool from realized markup split on paid + fulfillment-eligible rows.
- ✅ Exclude unpaid and failed/non-payable fulfillment records.
- ✅ Store immutable payout calculation snapshots for auditability.
- ✅ Add `CreatorPayout` records with idempotent per-creator/per-cycle semantics.
- ✅ Add statement-level data model if detailed line items are required (PayoutCalculation model).

---

### S6-T12: PayPal Payouts & Ops Controls

**Effort: 6-8 hours**

**Status: ✅ COMPLETE**

- ✅ Add PayPal environment variables:
  - `PAYPAL_CLIENT_ID`
  - `PAYPAL_CLIENT_SECRET`
  - `PAYPAL_ENVIRONMENT`
  - `PAYPAL_PAYOUTS_WEBHOOK_ID` when required
- ✅ Service: `sendCreatorPayoutsForCycle(cycleId)`
  - validate payout readiness
  - submit payout batch
  - persist PayPal references and statuses
- ✅ Handle payout outcomes and actionable failure states.
- ✅ Admin controls:
  - retry failed payouts (deferred for admin UX)
  - hold/cancel with reason (deferred for admin UX)
  - prevent double-pay for same creator/cycle (implemented via upsert)

## Progress Summary

**Overall Status: 13/14 tasks complete (93%)**

### Sprint 5 Carry-Over (5/5 complete)

- ✅ S6-T0a: Checkout Commit Action & Intent Snapshot
- ✅ S6-T0b: Deterministic Release Ordering Rules
- ✅ S6-T0c: Lock-Date Read-Only Enforcement
- ✅ S6-T0d: Dynamic Page Count Calculation
- ✅ S6-T0e: Quote Context Persistence, Markup Display & UX Copy

### Sprint 6 Core Tasks (8/9 complete)

- ✅ S6-T1: Schema — Quote Freeze, Billing, and Fulfillment Models
- ✅ S6-T2: Stripe Setup — Payment Method + Off-Session Charge Flow
- ✅ S6-T3: Cycle Lock Quote Freeze Job
- ✅ S6-T4: Billing Reconciliation & Fulfillment Eligibility
- ✅ S6-T5: PDF Generation Trigger at Lock
- ⚠️ S6-T6: PDF Worker — Booklet Composition (deferred - needs BullMQ job format update)
- ✅ S6-T7: POD Order Submission & Payment
- ✅ S6-T8: POD Webhook Handler
- ✅ S6-T9: Collector Order Status UI
- ✅ S6-T10: Admin Fulfillment & Billing Dashboard
- ✅ S6-T11: Creator Earnings & Payout Ledger
- ✅ S6-T12: PayPal Payouts & Ops Controls

### Key Enhancements Beyond Original Plan

- **Stripe webhook idempotency**: Added `StripeWebhookEvent` model to track processed events and prevent duplicate processing
- **Payment method validation**: Added check for saved payment methods before charging, with GRACE_PERIOD status
- **Customer ID caching**: Added `stripeCustomerId` to CollectorProfile to avoid redundant Stripe customer lookups
- **Enhanced error handling**: Specific Stripe error handling (card errors, connection errors) with retryable flags
- **Chunked reconciliation**: Batch processing (20 records) with Promise.allSettled for efficiency
- **BullMQ job enqueuing**: PDF trigger service now enqueues jobs with issue labels
- **Platform markup**: Fixed platform fee via `PLATFORM_MARKUP_EUR` env var instead of Peecho provider markup
- **Lazy Stripe client initialization**: Proxy-based lazy initialization with retry config and timeout

### Deferred Items (UX Polish & Admin Features)

- UI disable controls post-lock (cart/selection UI)
- Admin override for locked cycles with audit log
- Admin retry actions for billing/fulfillment failures
- Email notifications for shipped status
- PDF Worker update to consume new BullMQ job format

### Testing Status

- Unit tests: In progress (Stripe webhook handler tests started)
- Integration tests: Planned (commit → freeze → charge flow)
- E2E smoke tests: Planned (collector orders page)

## Risk Controls (Dynamic Quote + Markup)

- **Quote freeze integrity**: immutable lock-time snapshot is mandatory billing source.
- **Idempotency**: enforce idempotent keys across freeze, charge, order submit, and webhook handlers.
- **Drift prevention**: do not create fulfillment order from non-frozen or stale quote data.
- **Margin guardrails**: alerts for low/negative effective markup after fees.
- **User transparency**: clearly label estimate vs frozen/final charge states.
- **Payout integrity**: creator payouts from realized paid rows only, with immutable calculation records.

## Out of Scope

- Stripe Connect migration.
- Automated tax form collection.
- Full VAT reporting automation.
- Multi-provider POD routing.
- Full self-service pause/skip/cancel UX beyond MVP essentials.

## Dependencies & Prerequisites

- Stripe account configured for reusable payment methods and off-session charging.
- POD quote API with markup support enabled.
- POD order/payment API + webhook setup.
- POD country catalog synchronized.
- Object storage accessible from pdf-worker.
- Collector shipping address flow complete.
- Creator onboarding with PayPal payout details.

## Effort Estimate

| Task      | Status      | Effort                              |
| --------- | ----------- | ----------------------------------- |
| S6-T0a    | ✅ Complete | 3-4 hours                           |
| S6-T0b    | ✅ Complete | 1-2 hours                           |
| S6-T0c    | ✅ Complete | 2-3 hours                           |
| S6-T0d    | ✅ Complete | 2-3 hours                           |
| S6-T0e    | ✅ Complete | 3-4 hours                           |
| S6-T1     | ✅ Complete | 4-6 hours                           |
| S6-T2     | ✅ Complete | 6-8 hours                           |
| S6-T3     | ✅ Complete | 5-7 hours                           |
| S6-T4     | ✅ Complete | 4-6 hours                           |
| S6-T5     | ✅ Complete | 4-5 hours                           |
| S6-T6     | ⚠️ Deferred | 8-10 hours                          |
| S6-T7     | ✅ Complete | 8-10 hours                          |
| S6-T8     | ✅ Complete | 4-5 hours                           |
| S6-T9     | ✅ Complete | 3-4 hours                           |
| S6-T10    | ✅ Complete | 5-7 hours                           |
| S6-T11    | ✅ Complete | 6-8 hours                           |
| S6-T12    | ✅ Complete | 6-8 hours                           |
| **Total** | **13/14**   | **66-92 hours (8-12 working days)** |
