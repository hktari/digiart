# Sprint 5 & 6: Collector Selection, Fulfillment & Payment Plan

## Goal

Deliver the MVP-ready physical booklet flow in two increments:

- **Sprint 5**: mobile-first collector selection experience ("booklet cart"), subscription constraints, and eligibility enforcement.
- **Sprint 6**: billing, fulfillment orchestration, POD order lifecycle, and creator payout operations.

This plan completes the operational value loop: collectors subscribe and curate a valid booklet, the platform charges and fulfills at cycle lock, and creators become payout-ready.

## Context & Decisions

- **Collector billing provider: Stripe Billing** — card-first subscription checkout, delayed first charge, lock-date-aligned monthly billing.
- **Creator payout provider for MVP: PayPal Payouts** — creators provide legal name and PayPal email during onboarding; full payout disbursement is handled in Sprint 6.
- **Long-term payout option: Stripe Connect Express** — revisit after MVP if creator volume, tax reporting, or marketplace compliance requires stronger infrastructure.
- **Fixed regional subscription price** — EU: €25/month, USA: $24/month.
- **Regions: EU + USA only** — other regions show "Coming soon".
- **Delayed first payment** — collector provides payment method at subscription time; first charge happens on the next cycle lock date.
- **Billing cycle alignment** — subscriptions renew on the 1st of the month using Stripe `trial_end` or `billing_cycle_anchor` with no initial prorated charge.
- **Peecho credit system** — admin maintains merchant credit balance manually in Peecho dashboard.
- **Order creation at cycle lock** — generate PDF, create Peecho order, then pay the order via Peecho credits after PDF is ready.
- **PDF generation is fully automatic** at cycle lock — no admin intervention required in the happy path.
- **The only manual content edge case** is a creator who has not published a release for the cycle.
- **Releases have variable size** — no fixed image count; collector booklet page count is determined by their final selection.
- **Booklet validity rule** — collector selection must stay within **35-50 artworks** to be eligible for checkout/fulfillment.
- **Collector cart UX** — always-on selection summary (mobile-first bottom sheet, desktop sidebar) with quick remove/replace actions.
- **Creator subscription semantics** — subscribing to a creator means their latest eligible release is auto-assigned by default; collectors can still manually customize selections.
- `requestedPageCount` is removed from `PricingQuoteSnapshot` — the schema field exists but is no longer populated or used.
- Fulfillment phase (POD API ordering) is entirely new work.

## Sprint Split

### Sprint 5: Collector Selection & Checkout Eligibility

Focus: implement the end-user selection journey and hard business constraints before payment/fulfillment automation.

- Creator profile -> subscribe flow
- Auto-add latest releases from subscribed creators
- Always-on booklet cart UI
- Artwork-range enforcement (`35-50`)
- Validity-gated checkout CTA for upcoming cycle
- Collector release management (select/deselect, quick remove/replace)

### Sprint 5 Acceptance Model

- **Low effort path**: collector subscribes to creators and gets default release assignments.
- **Customization path**: collector can manually add standout releases from outside subscriptions and remove auto-assigned ones.
- **Eligibility path**: booklet must remain within **35-50 artworks** at checkout time.

### Sprint 6: Billing, Fulfillment & Payout Operations

Focus: execute and operate the cycle once Sprint 5 selection data is reliable.

- Stripe billing lifecycle + reconciliation
- PDF generation at lock
- Peecho order submission/payment + webhooks
- Fulfillment status UI/admin operations
- Creator payout ledger + PayPal disbursement

## MVP Payment Architecture

| Flow | Provider | Sprint 5 Scope | Sprint 6 Scope |
| ---- | -------- | -------------- | -------------- |
| Collector subscription setup | Stripe Billing | Create customer, collect payment method, create subscription aligned to next lock date | Failed-payment recovery, cancellation/pause, billing admin tools |
| Collector charge | Stripe Billing | First charge scheduled for next lock date; no immediate charge at signup | Reconcile paid invoices against cycle fulfillment |
| Peecho order payment | Peecho credits | Pay POD orders from merchant credit balance | Credit balance monitoring and operational alerts |
| Creator payout readiness | PayPal | Store payout profile fields and validate PayPal email | Calculate and disburse PayPal payouts |
| Creator payout ledger | Internal DB | Model preparation only if needed by Sprint 5 implementation | Full payout records, retries, statements, audit trail |

## Sprint 5 Tasks

### S5-T1: Subscription Rules & Creator Limits

**Effort: 4-6 hours**

- Enforce collector subscription limits:
  - minimum subscribed creators for eligibility: **3**
  - maximum subscribed creators: **10**
- Enforce in server actions (`subscribeToCreator`, unsubscribe edge cases) and UI messaging.
- Clarify semantics in product copy: "Subscribe" means automatic release inclusion by default, not locked inclusion.
- Block actions with explicit validation errors and revalidation.
- Tests for limit edges (2->3, 10->11, unsubscribe below min eligibility behavior).

---

### S5-T2: Auto-Assignment of Latest Releases on Subscribe/Publish

**Effort: 4-6 hours**

- On subscribe, auto-select creator's latest published release for the current open cycle (idempotent).
- On creator publish, auto-select for active subscribers (idempotent).
- Keep manual deselect supported after auto-add.
- Allow manual add of non-subscribed creators' releases.
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
  - delta messaging (e.g. "5 artworks needed", "3 over limit")
- Include quick actions:
  - remove release
  - replace release (jump into discover context with guided alternatives)
- Label entries by source (`Auto-added from subscription` vs `Manually added`) for transparency.

---

### S5-T4: Release Selection Constraints & Guardrails

**Effort: 6-8 hours**

- Centralize server-side validation for booklet artwork range: **min 35 / max 50**.
- Apply validation in:
  - toggle selection
  - auto-assignment
  - checkout/subscribe CTA
- Ensure manual customization cannot bypass 35-50 rule.
- Expose summary endpoint/action (`totalArtworks`, `isValid`, `artworksNeeded` / `artworksOver`).
- Ensure lock-date read-only behavior is honored.

---

### S5-T5: Checkout/Subscribe CTA for Upcoming Cycle

**Effort: 5-7 hours**

- Add collector CTA to confirm platform subscription/order for upcoming cycle.
- Enable CTA only when:
  - collector has valid subscription state
  - booklet artwork count is within **35-50**
  - cycle is open
- CTA copy should reflect commitment to upcoming cycle fulfillment.
- Persist cycle-bound checkout intent/snapshot for Sprint 6 fulfillment pipeline.
- Add states for ineligible conditions (invalid range, cycle locked, missing payment setup).

---

### S5-T6: E2E Coverage for Full Collector Journey

**Effort: 6-8 hours**

- Cover end-to-end flow:
  - start from creator profile
  - subscribe
  - auto-added release appears in cart
  - manual deselect of auto-added release works
  - manual add from non-subscribed creator works
  - explore/add/remove/replace releases
  - enforce 35-50 rule
  - CTA enabled only in valid range
- Add mobile viewport tests for cart interactions.

## Sprint 6 Tasks

## Existing Fulfillment/Payment Tasks (renumbered under Sprint 6)

### S6-T1: Schema — Remove `requestedPageCount`, Add `FulfillmentOrder`

**Effort: 2-3 hours**

- Remove `requestedPageCount` from `PricingQuoteSnapshot` model in schema.
- Add `FulfillmentOrder` model:
  - `id`, `collectorProfileId`, `cycleId`
  - `generatedPrintFileId`
  - `podOrderId` (external Peecho order ID)
  - `status` enum: `PENDING | SUBMITTED | CONFIRMED | SHIPPED | DELIVERED | FAILED`
  - `trackingNumber String?`
  - `shippingCarrier String?`
  - `submittedAt DateTime?`
  - `shippedAt DateTime?`
  - `deliveredAt DateTime?`
  - `errorMessage String?`
  - `createdAt`, `updatedAt`
- Add Stripe identifiers where missing:
  - `CollectorProfile.stripeCustomerId String?`
  - `CollectorCreatorSubscription.stripeSubscriptionId String?`
  - `CollectorCreatorSubscription.billingStatus String?` or a typed enum if the schema already has billing status conventions.
- Keep PayPal creator payout profile lightweight for MVP:
  - legal name
  - PayPal email
  - payout readiness status
- Run and commit migration.

---

### S6-T2: Stripe Collector Subscription Setup

**Effort: 6-8 hours**

Implement the MVP collector subscription flow with delayed first payment.

- Add Stripe environment variables to `apps/mvp/.env.example`:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_EU_PRICE_ID`
  - `STRIPE_US_PRICE_ID`
- Service: `createCollectorStripeSubscription({ collectorProfileId, creatorProfileId, cycleId })`
  - Create or reuse Stripe customer.
  - Select regional price ID from collector region.
  - Create subscription for the next lock date using `trial_end` or `billing_cycle_anchor`.
  - Disable initial proration so collectors are not charged before the first booklet cycle.
  - Store Stripe subscription ID and billing status locally.
- Route/action for subscribe button:
  - Collector confirms creator subscription.
  - Payment method is collected through Stripe Checkout or SetupIntent + subscription creation.
  - Local `CollectorCreatorSubscription` is created only after Stripe setup succeeds.
- Webhook route: `app/api/webhooks/stripe/route.ts`
  - Verify Stripe signature.
  - Handle minimum events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.
  - Update local billing status idempotently.
- Tests:
  - Region-to-price mapping.
  - Next lock date billing anchor/trial calculation.
  - Webhook signature failure path.
  - Idempotent webhook update.

---

### S6-T3: Auto-Release Assignment to Collector Booklet (Stabilization Only)

**Effort: 3-4 hours**

Finalize hardening/ops for Sprint 5 auto-assignment behavior. Do not change user semantics.

- Server action / service: `assignReleaseToSubscribers(releaseId)`
  - Find all active, billing-valid `CollectorCreatorSubscription` records for the release's creator.
  - Insert `CollectorReleaseSelection` for each collector idempotently.
- Hook into `publishRelease` action after publish.
- Unit test coverage.

---

### S6-T4: Collector Booklet Selection UI (Billing/Fulfillment Readiness Extensions)

**Effort: 5-7 hours**

Extend Sprint 5 collector selection UX with billing/fulfillment state visibility.

- Route: `app/collector/booklet/page.tsx`
- List auto-assigned releases grouped by creator.
- Per-release: thumbnail preview, title, image count.
- Running total: "Your booklet will contain X images across Y creators".
- Toggle to deselect/reselect a release.
- Locked state: read-only view after cycle lock date.
- Hide or block fulfillment for unpaid/failed-payment subscriptions.

---

### S6-T5: PDF Generation Trigger at Cycle Lock

**Effort: 4-5 hours**

When a cycle transitions to `LOCKED` status, automatically trigger PDF generation for all eligible paid collectors.

- Service: `triggerBookletGenerationForCycle(cycleId)`
  - Find collectors with at least one selected release for this cycle.
  - Include only collectors whose Stripe invoice/subscription status is valid for the cycle.
  - Create or update `GeneratedPrintFile` record (`status: PENDING`).
  - Enqueue BullMQ job per collector.
- Hook into cycle status transition through scheduled job or admin status change trigger.
- Edge cases:
  - Collector with zero selections: skip and log.
  - Failed Stripe payment: skip fulfillment and surface in admin dashboard.
  - Creator with no release this cycle: selections exclude them naturally.
- Admin alert if any collector in cycle has zero eligible selections or unpaid status.

---

### S6-T6: PDF Worker — Booklet Composition

**Effort: 8-10 hours**

Implement the BullMQ job handler in `apps/pdf-worker` that builds the actual PDF.

- Job payload: `{ generatedPrintFileId, collectorProfileId, cycleId }`
- Steps:
  1. Fetch all selected releases with their artwork images in deterministic order.
  2. Build PDF layout: cover page, artwork pages (1 artwork = 1 page), back cover, pad to even page count.
  3. Upload PDF to storage (S3/local), update `GeneratedPrintFile.storageUrl`, `pageCount`, `status: READY`, `generatedAt`.
  4. On failure: set `status: FAILED`, `errorMessage`, retry up to 3 times through BullMQ config.
- Unit tests for page count calculation and layout logic with mocked image fetch.

---

### S6-T7: POD Order Submission & Payment

**Effort: 8-10 hours**

After `GeneratedPrintFile.status = READY`, submit a print order to Peecho and pay via credits.

- Service: `submitFulfillmentOrder(generatedPrintFileId)`
  - Fetch collector shipping address from `CollectorProfile`.
  - Get page count from `GeneratedPrintFile`.
  - Call Peecho `POST /rest/v3/order/`:
    - `item_reference`: `collector_{id}_cycle_{id}`
    - `offering_id`: from config
    - `content_url`: from `GeneratedPrintFile.storageUrl`
    - `number_of_pages`: from `GeneratedPrintFile.pageCount`
    - `shipping_address`: from collector profile
  - Get `order_id` from response.
  - Call Peecho `POST /rest/v3/order/payment/` to pay via credits.
  - Create `FulfillmentOrder` record with `podOrderId`, `status: SUBMITTED`.
- Error handling:
  - Insufficient credits: flag for admin, retry after top-up.
  - Other failures: set `status: FAILED`, store `errorMessage`.
- Can be triggered automatically after PDF ready through BullMQ job chain or batched per cycle.

---

### S6-T8: Peecho Webhook Handler

**Effort: 4-5 hours**

Handle inbound Peecho webhook events to track order progress.

- Route: `app/api/webhooks/peecho/route.ts`
- Verify Peecho webhook signature.
- Handle events:
  - `order.confirmed` -> `FulfillmentOrder.status = CONFIRMED`
  - `order.shipped` -> `status = SHIPPED`, store `trackingNumber`, `shippingCarrier`, `shippedAt`
  - `order.delivered` -> `status = DELIVERED`, `deliveredAt`
  - `order.failed` -> `status = FAILED`, `errorMessage`, admin alert
- Update collector notification on ship event.

---

### S6-T9: Collector Order Status & Tracking UI

**Effort: 3-4 hours**

Collector-facing view of their fulfillment status per cycle.

- Route: `app/collector/orders/page.tsx` or inline in booklet page.
- Show: order status badge, tracking number, carrier, estimated delivery when available.
- States: Awaiting payment -> Generating -> Processing -> Shipped -> Delivered / Failed.
- Email notification on ship event, if email infrastructure is already available.

---

### S6-T10: Admin Fulfillment & Payment Dashboard

**Effort: 4-6 hours**

Admin view of fulfillment, payment, and operational readiness for a cycle.

- Route: `app/admin/cycles/[id]/fulfillment/page.tsx`
- Table: collector, Stripe billing status, PDF status, POD order status, tracking.
- Highlight failures for manual intervention:
  - failed Stripe invoice
  - missing shipping address
  - PDF generation failure
  - Peecho credit/order failure
- Manual retry action for failed PDF/order jobs.
- Summary stats: total, paid, unpaid, generating, ready, submitted, shipped, delivered, failed.
- Display PayPal payout readiness count for creators included in the cycle, but do not disburse yet.

## Sprint 5 Data Model Changes Summary

### Remove from `PricingQuoteSnapshot`

- `requestedPageCount Int` — no longer used because pricing is flat-rate by region.

### Add Stripe billing references

- `CollectorProfile.stripeCustomerId String?`
- `CollectorCreatorSubscription.stripeSubscriptionId String?`
- `CollectorCreatorSubscription.billingStatus String?` or equivalent enum.

### Add `FulfillmentOrder`

```prisma
model FulfillmentOrder {
  id                   String            @id @default(cuid())
  collectorProfileId   String
  cycleId              String
  generatedPrintFileId String            @unique
  podOrderId           String?
  status               FulfillmentStatus @default(PENDING)
  trackingNumber       String?
  shippingCarrier      String?
  submittedAt          DateTime?
  shippedAt            DateTime?
  deliveredAt          DateTime?
  errorMessage         String?
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt

  collectorProfile   CollectorProfile  @relation(fields: [collectorProfileId], references: [id], onDelete: Cascade)
  cycle              SubscriptionCycle @relation(fields: [cycleId], references: [id])
  generatedPrintFile GeneratedPrintFile @relation(fields: [generatedPrintFileId], references: [id])
}

enum FulfillmentStatus {
  PENDING
  SUBMITTED
  CONFIRMED
  SHIPPED
  DELIVERED
  FAILED
}
```

## Out of Scope for Sprint 5

- Full creator payout disbursement.
- Stripe Customer Portal for subscription self-service.
- Pause/skip/cancel UX beyond storing external Stripe status from webhooks.
- Advanced dunning and failed-payment recovery beyond recording invoice status.
- Advanced booklet layout (orientation-aware, multi-image pages).
- Duplicate artwork prevention across cycles.
- Prodigi as alternative POD provider (Peecho only).
- Stripe Connect creator onboarding.

---

# Sprint 6: Subscription Operations & Creator Payouts (Details)

## Goal

Turn the Sprint 5 MVP flow into an operational subscription business: reliable billing reconciliation, creator payout calculation, PayPal disbursement, creator statements, and admin controls for retries, refunds, and edge cases.

## Sprint 6 Decisions

- **Keep Stripe as source of truth for collector billing.** Local records mirror Stripe webhook state but do not invent billing state independently.
- **Use PayPal Payouts for MVP creator disbursement.** Creators only need legal name and PayPal email to become payout-ready.
- **Pay creators 7 days after cycle lock/shipment start.** This preserves the buffer described in `docs/pricing-model.md` for Peecho failures and retries.
- **Calculate earnings from fulfilled paid selections only.** Do not pay creators for unpaid collectors or failed fulfillment orders.
- **Maintain an internal payout ledger.** PayPal is the disbursement rail, not the accounting source of truth.

## Tasks

### T31: Billing Reconciliation Model & Jobs

**Effort: 4-6 hours**

- Add or finalize cycle-level billing records that connect:
  - collector profile
  - creator subscription
  - cycle
  - Stripe invoice/payment intent
  - amount paid
  - currency
  - billing status
- Scheduled reconciliation job:
  - Find cycle subscriptions expected to be paid.
  - Verify matching Stripe invoice status.
  - Mark fulfillment eligibility.
- Admin retry action for stale or missing webhook state.
- Tests for paid, failed, cancelled, and webhook-missing cases.

---

### T32: Subscription Self-Service Basics

**Effort: 4-6 hours**

- Add collector subscription management page improvements:
  - active creator subscriptions
  - next charge date
  - current billing status
  - cancel link/action
- Integrate Stripe Customer Portal if available in account configuration.
- If Customer Portal is deferred, implement cancellation through Stripe API with clear local status update.
- Ensure cancelled subscriptions remain available for historical order/payout records.

---

### T33: Creator Earnings Calculation

**Effort: 5-7 hours**

- Service: `calculateCreatorEarningsForCycle(cycleId)`
- Inputs:
  - paid collector subscriptions
  - selected releases included in generated/fulfilled booklets
  - regional net revenue
  - Peecho cost snapshot
  - platform/creator split
- Rules:
  - Exclude unpaid collectors.
  - Exclude failed fulfillment orders unless admin explicitly marks them payable.
  - Split creator pool by selected release/creator count according to current pricing model.
  - Store immutable calculation snapshots for auditability.
- Tests for single creator, multiple creators, deselected releases, failed payment, and failed fulfillment.

---

### T34: Creator Payout Ledger

**Effort: 4-6 hours**

- Add `CreatorPayout` model:
  - creator profile
  - cycle
  - amount
  - currency
  - status: `PENDING | PROCESSING | PAID | FAILED | CANCELLED`
  - PayPal batch/item IDs
  - failure reason
  - timestamps
- Add `CreatorPayoutLineItem` model if detailed statement rows are needed.
- Ensure idempotency: one payout per creator per cycle unless explicitly retried through a new attempt record.
- Admin view for pending, paid, and failed payouts.

---

### T35: PayPal Payouts Integration

**Effort: 6-8 hours**

- Add PayPal environment variables:
  - `PAYPAL_CLIENT_ID`
  - `PAYPAL_CLIENT_SECRET`
  - `PAYPAL_ENVIRONMENT`
  - `PAYPAL_PAYOUTS_WEBHOOK_ID` if webhook verification requires it
- Service: `sendCreatorPayoutsForCycle(cycleId)`
  - Validate payout readiness.
  - Create payout batch with one item per creator.
  - Use PayPal email for MVP; store PayPal payout batch and item IDs.
  - Mark payouts `PROCESSING` immediately after accepted API call.
- Webhook/status handling:
  - paid/success -> `PAID`
  - unclaimed/returned/failed/blocked/denied -> actionable failure state
- Tests with mocked PayPal API responses.

---

### T36: Creator Statements & Dashboard

**Effort: 4-6 hours**

- Creator dashboard page for earnings:
  - current cycle estimated earnings
  - finalized cycle earnings
  - payout status
  - payout method readiness
- Statement detail:
  - cycle
  - subscribers/selections counted
  - gross creator pool
  - creator share
  - payout date/status
- Downloadable CSV can be deferred unless needed for beta creators.

---

### T37: Admin Payout Operations

**Effort: 4-6 hours**

- Admin payout page:
  - pending payouts by cycle
  - creators missing PayPal details
  - failed/unclaimed/returned payouts
  - manual retry action
  - mark as held/cancelled with reason
- Add guardrails:
  - cannot pay before payout date unless admin override is explicit
  - cannot pay creators with incomplete payout profile
  - cannot double-pay same creator/cycle

---

### T38: Refunds, Failed Fulfillment, and Adjustment Policy

**Effort: 3-5 hours**

- Define and implement MVP policy flags:
  - failed Stripe payment -> no fulfillment, no creator payout
  - failed PDF before Peecho order -> no creator payout unless admin override
  - failed Peecho order after charge -> retry first, refund/manual resolution second
  - refund after payout -> record negative adjustment for future payout, do not silently mutate paid records
- Add internal admin notes for payout/fulfillment exceptions.
- Document the policy in `docs/pricing-model.md` or a dedicated operations doc.

## Out of Scope for Sprint 6

- Stripe Connect migration.
- Automated tax form collection for creators.
- Full VAT reporting automation.
- Multi-region expansion beyond EU and USA.
- Dynamic per-country subscription pricing.
- Creator bank payouts.
- Multi-provider POD routing.

## Data Model Changes Summary

### Add or finalize collector billing records

```prisma
model CollectorCycleBilling {
  id                             String   @id @default(cuid())
  collectorProfileId             String
  collectorCreatorSubscriptionId String
  cycleId                        String
  stripeInvoiceId                String?  @unique
  stripePaymentIntentId          String?
  amountPaid                     Decimal?
  currency                       String
  status                         String
  paidAt                         DateTime?
  createdAt                      DateTime @default(now())
  updatedAt                      DateTime @updatedAt
}
```

### Add creator payout ledger

```prisma
model CreatorPayout {
  id                  String   @id @default(cuid())
  creatorProfileId    String
  cycleId             String
  amount              Decimal
  currency            String
  status              String
  paypalBatchId       String?
  paypalPayoutItemId  String?
  failureReason       String?
  scheduledFor        DateTime
  processedAt         DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([creatorProfileId, cycleId])
}
```

## Effort Estimate

| Task      | Effort                             |
| --------- | ---------------------------------- |
| T31       | 4-6 hours                          |
| T32       | 4-6 hours                          |
| T33       | 5-7 hours                          |
| T34       | 4-6 hours                          |
| T35       | 6-8 hours                          |
| T36       | 4-6 hours                          |
| T37       | 4-6 hours                          |
| T38       | 3-5 hours                          |
| **Total** | **34-50 hours (5-7 working days)** |

---

## Sprint 5 Effort Estimate

| Task      | Effort                             |
| --------- | ---------------------------------- |
| T21       | 2-3 hours                          |
| T22       | 6-8 hours                          |
| T23       | 3-4 hours                          |
| T24       | 5-7 hours                          |
| T25       | 4-5 hours                          |
| T26       | 8-10 hours                         |
| T27       | 8-10 hours                         |
| T28       | 4-5 hours                          |
| T29       | 3-4 hours                          |
| T30       | 4-6 hours                          |
| **Total** | **47-62 hours (6-8 working days)** |

---

## Dependencies & Prerequisites

- Stripe account with Billing enabled.
- Stripe products/prices created for EU and USA subscription plans.
- Stripe webhook endpoint registered for MVP app.
- PayPal business account with Payouts access requested or approved.
- Peecho sandbox API key configured.
- Peecho merchant account with credits; admin must maintain credit balance.
- Object storage (S3 or Railway volume) accessible from pdf-worker.
- Peecho webhook endpoint registered in Peecho dashboard.
- Collector shipping address collection in place.
- Creator onboarding includes legal name and PayPal email fields.
