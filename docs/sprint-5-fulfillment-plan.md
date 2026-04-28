# Sprint 5: Booklet Generation & POD Fulfillment

## Goal

Deliver the full end-to-end physical booklet flow: automatic PDF generation triggered at cycle lock, POD order submission, webhook-driven status tracking, and collector notification.

This sprint completes the core value delivery loop of the platform.

## Context & Decisions

- **Pricing is flat-rate by country** — no page-sensitive quote recalculation at generation time
- **PDF generation is fully automatic** at cycle lock — no admin intervention required
- **The only manual edge case** is a creator who has not published a release for the cycle (admin review)
- **Releases have variable size** — no fixed image count; collector booklet page count is determined by their final selection
- `requestedPageCount` is removed from `PricingQuoteSnapshot` — the schema field exists but is no longer populated or used
- Fulfillment phase (POD API ordering) is entirely new work

---

## Tasks

### T21: Schema — Remove `requestedPageCount`, Add `FulfillmentOrder`

**Effort: 2–3 hours**

- Remove `requestedPageCount` from `PricingQuoteSnapshot` model in schema (field already unused in new flow)
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
- Run and commit migration

---

### T22: Auto-Release Assignment to Collector Booklet

**Effort: 3–4 hours**

When a creator publishes a new release for the current open cycle, automatically create `CollectorReleaseSelection` records for all collectors subscribed to that creator (who do not yet have a selection for this release).

- Server action / service: `assignReleaseToSubscribers(releaseId)`
  - Find all active `CollectorCreatorSubscription` for the release's creator
  - Insert `CollectorReleaseSelection` for each collector (idempotent)
- Hook into `publishRelease` action to call this after publish
- Unit test coverage

---

### T23: Collector Booklet Selection UI

**Effort: 5–7 hours**

Collector-facing page showing the current cycle booklet contents:

- List of auto-assigned releases grouped by creator
- Per-release: thumbnail preview, title, image count
- Running total: "Your booklet will contain X images across Y creators"
- Toggle to deselect/reselect a release (updates `CollectorReleaseSelection`)
- Deselect removes from booklet; reselect re-adds
- Locked state: read-only view after cycle lock date
- Route: `app/collector/booklet/page.tsx`

---

### T24: PDF Generation Trigger at Cycle Lock

**Effort: 4–5 hours**

When a cycle transitions to `LOCKED` status, automatically trigger PDF generation for all eligible collectors.

- Service: `triggerBookletGenerationForCycle(cycleId)`
  - Find all collectors with at least one `CollectorReleaseSelection` for this cycle
  - For each: create or update `GeneratedPrintFile` record (`status: PENDING`)
  - Enqueue BullMQ job per collector
- Hook into cycle status transition (either scheduled job or admin status change trigger)
- Edge case handling: collector with zero selections → skip (log, no file created)
- Edge case handling: creator with no release this cycle → selections exclude them naturally
- Admin alert if any collector in cycle has zero eligible selections

---

### T25: PDF Worker — Booklet Composition

**Effort: 8–10 hours**

Implement the BullMQ job handler in `apps/pdf-worker` that builds the actual PDF:

- Job payload: `{ generatedPrintFileId, collectorProfileId, cycleId }`
- Steps:
  1. Fetch all selected releases with their artwork images (ordered)
  2. Build PDF layout: cover page, artwork pages (1 artwork = 1 page), back cover, pad to even page count
  3. Upload PDF to storage (S3/local), update `GeneratedPrintFile.storageUrl`, `pageCount`, `status: READY`, `generatedAt`
  4. On failure: set `status: FAILED`, `errorMessage`, retry up to 3× (existing BullMQ config)
- Unit tests for page count calculation and layout logic (mocked image fetch)

---

### T26: POD Order Submission

**Effort: 6–8 hours**

After `GeneratedPrintFile.status = READY`, submit a print order to Peecho.

- Service: `submitFulfillmentOrder(generatedPrintFileId)`
  - Fetch collector's shipping address and locked `PricingQuoteSnapshot`
  - Call Peecho `POST /v1/orders`:
    - PDF URL (`storageUrl`)
    - Shipping address
    - Product spec (offering, format)
    - Locked pricing reference
  - Create `FulfillmentOrder` record with `podOrderId`, `status: SUBMITTED`
- Error handling: set `status: FAILED`, store `errorMessage`, flag for admin
- Can be triggered automatically after PDF ready (BullMQ job chain) or batched per cycle

---

### T27: Peecho Webhook Handler

**Effort: 4–5 hours**

Handle inbound Peecho webhook events to track order progress.

- Route: `app/api/webhooks/peecho/route.ts`
- Verify Peecho webhook signature
- Handle events:
  - `order.confirmed` → `FulfillmentOrder.status = CONFIRMED`
  - `order.shipped` → `status = SHIPPED`, store `trackingNumber`, `shippingCarrier`, `shippedAt`
  - `order.delivered` → `status = DELIVERED`, `deliveredAt`
  - `order.failed` → `status = FAILED`, `errorMessage`, admin alert
- Update collector notification on ship event

---

### T28: Collector Order Status & Tracking UI

**Effort: 3–4 hours**

Collector-facing view of their fulfillment status per cycle:

- Route: `app/collector/orders/page.tsx` or inline in booklet page
- Show: order status badge, tracking number (with carrier link when available), estimated delivery
- States: Generating → Processing → Shipped → Delivered / Failed
- Email notification on ship (hook into T27 webhook handler)

---

### T29: Admin Fulfillment Dashboard

**Effort: 3–4 hours**

Admin view of fulfillment status for a cycle:

- Route: `app/admin/cycles/[id]/fulfillment/page.tsx`
- Table: collector, PDF status, POD order status, tracking
- Highlight failures for manual intervention
- Manual retry action for failed orders
- Summary stats: total, generating, ready, submitted, shipped, delivered, failed

---

## Out of Scope for Sprint 5

- Recurring billing / payment collection
- Creator payout disbursement
- Advanced booklet layout (orientation-aware, multi-image pages)
- Duplicate artwork prevention across cycles
- Prodigi as alternative POD provider (Peecho only)

---

## Data Model Changes Summary

### Remove from `PricingQuoteSnapshot`
- `requestedPageCount Int` — no longer used (flat-rate pricing)

### Add `FulfillmentOrder`

```prisma
model FulfillmentOrder {
  id                   String               @id @default(cuid())
  collectorProfileId   String
  cycleId              String
  generatedPrintFileId String               @unique
  podOrderId           String?
  status               FulfillmentStatus    @default(PENDING)
  trackingNumber       String?
  shippingCarrier      String?
  submittedAt          DateTime?
  shippedAt            DateTime?
  deliveredAt          DateTime?
  errorMessage         String?
  createdAt            DateTime             @default(now())
  updatedAt            DateTime             @updatedAt

  collectorProfile   CollectorProfile   @relation(fields: [collectorProfileId], references: [id], onDelete: Cascade)
  cycle              SubscriptionCycle  @relation(fields: [cycleId], references: [id])
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

---

## Effort Estimate

| Task | Effort     |
| ---- | ---------- |
| T21  | 2–3 hours  |
| T22  | 3–4 hours  |
| T23  | 5–7 hours  |
| T24  | 4–5 hours  |
| T25  | 8–10 hours |
| T26  | 6–8 hours  |
| T27  | 4–5 hours  |
| T28  | 3–4 hours  |
| T29  | 3–4 hours  |
| **Total** | **38–50 hours (5–7 working days)** |

---

## Dependencies & Prerequisites

- Peecho sandbox API key configured
- Object storage (S3 or Railway volume) accessible from pdf-worker
- Peecho webhook endpoint registered in Peecho dashboard
- Collector shipping address collection in place (verify from Sprint 3/4)
