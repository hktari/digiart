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

## Sprint 6 Tasks

### S6-T1: Schema — Quote Freeze, Billing, and Fulfillment Models

**Effort: 4-6 hours**

- Replace fixed-price assumptions in billing models with dynamic quote snapshot linkage.
- Add/extend quote freeze model for collector-cycle record:
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
- Add/extend billing record:
  - link to frozen quote snapshot
  - Stripe invoice/payment intent references
  - charge status and paid timestamp
- Add `FulfillmentOrder` model for POD lifecycle status tracking.
- Add Stripe identifiers where needed (customer + billing references).
- Keep PayPal payout profile lightweight for MVP (legal name + PayPal email + readiness).
- Run and commit migration.

---

### S6-T2: Stripe Setup — Payment Method + Off-Session Charge Flow

**Effort: 6-8 hours**

- Add Stripe env vars for dynamic charge flow (no region price IDs required):
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- Ensure collector has reusable payment method attached for off-session lock-date charging.
- Implement service for lock-date charging from frozen quote snapshot.
- Store Stripe billing references idempotently.
- Webhook route: `app/api/webhooks/stripe/route.ts`
  - verify signature
  - handle payment success/failure and status transitions
  - reconcile local billing state idempotently
- Tests:
  - off-session charge success/failure
  - idempotent webhook handling
  - signature failure path

---

### S6-T3: Cycle Lock Quote Freeze Job

**Effort: 5-7 hours**

- Service: `freezeCollectorCycleQuote(cycleId)`
- For each committed collector:
  - compute final page count from locked selections
  - resolve destination country/address
  - fetch POD quote with configured markup
  - persist immutable snapshot
- Mark records ineligible when quote/address/destination is invalid.
- Emit admin alerts for freeze failures.
- Guarantee idempotent reruns.

---

### S6-T4: Billing Reconciliation & Fulfillment Eligibility

**Effort: 4-6 hours**

- Scheduled reconciliation job:
  - expected charges from frozen snapshots
  - paid/failed/pending status from Stripe
  - eligibility flag for fulfillment pipeline
- Admin retry action for stale/missing webhook cases.
- Tests for paid, failed, canceled, and webhook-late paths.

---

### S6-T5: PDF Generation Trigger at Lock

**Effort: 4-5 hours**

- Trigger PDF generation for collectors that are both:
  - paid
  - quote-frozen and fulfillment-eligible
- Create/update `GeneratedPrintFile` (`status: PENDING`) and enqueue jobs.
- Edge handling:
  - zero selections -> skip + log
  - unpaid -> skip + surface in admin dashboard
  - quote freeze missing -> skip + alert

---

### S6-T6: PDF Worker — Booklet Composition

**Effort: 8-10 hours**

- BullMQ handler in `apps/pdf-worker`:
  - fetch selected releases/artworks in deterministic order
  - build PDF (cover, artwork pages, back cover, even-page padding)
  - upload and mark `GeneratedPrintFile` as `READY`
  - on failure: `FAILED`, `errorMessage`, retry policy
- Unit tests for layout and page-count logic.

---

### S6-T7: POD Order Submission & Payment

**Effort: 8-10 hours**

- Service: `submitFulfillmentOrder(generatedPrintFileId)`
- Use frozen quote context and generated PDF output.
- Submit POD order and pay via provider credit flow.
- Create/update `FulfillmentOrder` with provider order id + status.
- Error handling:
  - insufficient credits -> admin action + retry
  - provider/API failures -> failed state + reason

---

### S6-T8: POD Webhook Handler

**Effort: 4-5 hours**

- Route: `app/api/webhooks/peecho/route.ts`
- Verify webhook signature.
- Map provider events to `FulfillmentOrder` lifecycle statuses.
- Persist tracking details and failure reasons.
- Trigger collector notification on shipped status if email infra exists.

---

### S6-T9: Collector Order Status UI

**Effort: 3-4 hours**

- Route: `app/collector/orders/page.tsx` (or embedded equivalent).
- Show timeline states:
  - Quote frozen
  - Charge pending/paid/failed
  - Generating
  - Processing
  - Shipped
  - Delivered/Failed
- Show tracking metadata when available.

---

### S6-T10: Admin Fulfillment & Billing Dashboard

**Effort: 5-7 hours**

- Route: `app/admin/cycles/[id]/fulfillment/page.tsx`
- Table dimensions:
  - collector
  - quote freeze status + total
  - Stripe billing status
  - PDF status
  - POD order status + tracking
- Highlight intervention buckets:
  - freeze failure
  - payment failure
  - missing address
  - PDF failure
  - POD failure/credit issue
- Include summary counts and manual retry actions.

---

### S6-T11: Creator Earnings & Payout Ledger

**Effort: 6-8 hours**

- Service: `calculateCreatorEarningsForCycle(cycleId)`
- Compute creator pool from realized markup split on paid + fulfillment-eligible rows.
- Exclude unpaid and failed/non-payable fulfillment records.
- Store immutable payout calculation snapshots for auditability.
- Add `CreatorPayout` records with idempotent per-creator/per-cycle semantics.
- Add statement-level data model if detailed line items are required.

---

### S6-T12: PayPal Payouts & Ops Controls

**Effort: 6-8 hours**

- Add PayPal environment variables:
  - `PAYPAL_CLIENT_ID`
  - `PAYPAL_CLIENT_SECRET`
  - `PAYPAL_ENVIRONMENT`
  - `PAYPAL_PAYOUTS_WEBHOOK_ID` when required
- Service: `sendCreatorPayoutsForCycle(cycleId)`
  - validate payout readiness
  - submit payout batch
  - persist PayPal references and statuses
- Handle payout outcomes and actionable failure states.
- Admin controls:
  - retry failed payouts
  - hold/cancel with reason
  - prevent double-pay for same creator/cycle

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

| Task      | Effort                              |
| --------- | ----------------------------------- |
| S6-T1     | 4-6 hours                           |
| S6-T2     | 6-8 hours                           |
| S6-T3     | 5-7 hours                           |
| S6-T4     | 4-6 hours                           |
| S6-T5     | 4-5 hours                           |
| S6-T6     | 8-10 hours                          |
| S6-T7     | 8-10 hours                          |
| S6-T8     | 4-5 hours                           |
| S6-T9     | 3-4 hours                           |
| S6-T10    | 5-7 hours                           |
| S6-T11    | 6-8 hours                           |
| S6-T12    | 6-8 hours                           |
| **Total** | **63-84 hours (8-11 working days)** |
