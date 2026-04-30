# POD Fulfillment Flow

## Overview

This document describes the complete print-on-demand (POD) fulfillment flow from PDF generation to physical booklet delivery. The platform uses a third-party POD provider (Peecho/Prodigi) for printing and shipping.

## Key Concepts

### Pricing Model

**Fixed regional subscription price.** The platform charges a flat monthly fee based on collector's region (EU or USA). No dynamic pricing calculation at subscription time.

- **Subscription Price**: Fixed amount per region (e.g., €25/month for EU, $24/month for USA)
- **Regions**: EU + USA only (MVP launch)
- **Payment**: Stripe subscription with delayed first charge (next lock date)
- **Peecho Credits**: Admin manages merchant account balance manually in Peecho dashboard

This fixed price is stored in `PricingQuoteSnapshot` at subscription time. The collector is committed to this price for the cycle.

### Booklet Content Selection

Creators publish releases each cycle. Collectors subscribe to creators and the system automatically assigns new releases to the collector's booklet for that cycle. Releases have **variable size** (no fixed image count enforced on creators).

The collector has agency: they can review the releases assigned to their booklet and deselect any. The platform shows a running total of images (pages) that will be in their final booklet. This updates live as the collector changes their selection.

### Automatic Generation

Booklet PDF generation is fully automatic once the cycle lock date is reached. The only manual edge case requiring admin attention is when a creator has **not uploaded new art for the cycle** — in this case no release exists to include.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUBSCRIPTION & PRICING PHASE                        │
└─────────────────────────────────────────────────────────────────────────────┘

Collector Subscribes to Creator
            │
            ▼
┌─────────────────────────────┐
│ 1. Display Fixed Price       │
│    Based on Region           │
│    - EU: €19/month           │
│    - USA: $24/month          │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 2. Store PricingQuoteSnapshot│
│    - collectorProfileId      │
│    - cycleId (future cycle)  │
│    - region (EU/USA)         │
│    - fixedPrice              │
│    - currency                │
│    - quotedAt                │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 3. Setup Payment Method      │
│    via Stripe                │
│    - Card/token saved         │
│    - No charge yet            │
│    - Scheduled for next lock │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 4. Subscription Active       │
│    - Collector sees content  │
│    - Awaiting cycle          │
└─────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                        SELECTION & GENERATION PHASE                       │
└─────────────────────────────────────────────────────────────────────────────┘

Cycle Selection Window Opens
            │
            ▼
┌─────────────────────────────────────────────┐
│ System Auto-assigns Releases                 │
│ - New releases from subscribed creators      │
│   automatically added to collector's booklet │
│ - Stored in CollectorReleaseSelection        │
│ - Collector sees running image/page count    │
└─────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────┐
│ Collector Reviews & Curates (optional)       │
│ - Can deselect releases                      │
│ - Running total updates live                 │
│ - Any changes update                         │
│   CollectorReleaseSelection                  │
└─────────────────────────────────────────────┘
            │
            ▼
Cycle Lock Date Reached
            │
            ▼
┌─────────────────────────────┐
│ 1. Count Total Artworks      │
│    Per Collector             │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 2. Calculate Actual Page     │
│    Count                     │
│    - Cover pages (2)          │
│    - Artwork pages            │
│    - Back cover (1)           │
│    - Pad to even number       │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 3. Generate PDF (automatic)  │
│    - Enqueue job to           │
│      BullMQ queue             │
│    - PDF Worker processes:    │
│      * Fetch artwork images   │
│      * Build PDF document     │
│      * Upload to storage      │
│    - Update                   │
│      GeneratedPrintFile:      │
│      status: READY            │
│      storageUrl: <url>        │
│      pageCount: <actual>      │
└─────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│               FULFILLMENT & ORDERING PHASE  [NOT YET IMPLEMENTED]           │
│                           Planned for Sprint 5                               │
└─────────────────────────────────────────────────────────────────────────────┘

PDF Generated & Ready
            │
            ▼
┌─────────────────────────────┐
│ 1. Create Fulfillment Order  │
│    - Batch by cycle          │
│    - Group by region/        │
│      provider                │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 2. Call Peecho Order API     │
│    POST /rest/v3/order/      │
│    - item_reference          │
│    - offering_id             │
│    - content_url (PDF)       │
│    - number_of_pages         │
│    - shipping_address        │
│    Returns: order_id         │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 3. Pay Order via Credits     │
│    POST /order/payment/      │
│    - order_id                │
│    - Uses merchant credits   │
│    (Admin manages balance    │
│     in Peecho dashboard)     │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 4. Peecho Processes          │
│    - Receives order          │
│    - Routes to nearest       │
│      printer                 │
│    - Prints booklet          │
│    - Packages & ships        │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 5. Webhook/Callback          │
│    - Order confirmed           │
│    - Tracking number           │
│    - Shipment status updates   │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 6. Update Platform           │
│    - Store tracking number     │
│    - Update fulfillment status │
│    - Notify collector          │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 7. Collector Receives        │
│    Physical Booklet          │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 8. Creator Payout            │
│    (7 days after shipment)   │
│    - Calculate earnings      │
│    - Disburse via PayPal     │
│    - Safe buffer for retries │
└─────────────────────────────┘
```

## Data Models

### PricingQuoteSnapshot

Stored when collector subscribes, locks in fixed regional pricing:

| Field                | Type     | Description                            |
| -------------------- | -------- | -------------------------------------- |
| `collectorProfileId` | String   | FK to CollectorProfile                 |
| `cycleId`            | String   | FK to SubscriptionCycle (future cycle) |
| `region`             | String   | "EU" or "USA"                          |
| `fixedPrice`         | Decimal  | Locked subscription price              |
| `currency`           | String   | "EUR" or "USD"                         |
| `quotedAt`           | DateTime | When subscription was created          |

### GeneratedPrintFile

Stored when PDF is generated:

| Field                | Type            | Description                         |
| -------------------- | --------------- | ----------------------------------- |
| `collectorProfileId` | String          | FK to CollectorProfile              |
| `cycleId`            | String          | FK to SubscriptionCycle             |
| `storageUrl`         | String?         | URL to PDF in S3/local storage      |
| `pageCount`          | Int?            | Actual generated page count         |
| `status`             | PrintFileStatus | PENDING → GENERATING → READY/FAILED |
| `errorMessage`       | String?         | Error details if failed             |
| `generatedAt`        | DateTime?       | When PDF was completed              |

## Pricing Strategy Notes

### Flat-Rate Model

The platform charges a fixed subscription price per cycle. This covers printing up to a **platform-configured maximum page count**. The platform absorbs any cost difference between a collector's actual booklet size and the maximum — there is no per-page billing.

This simplifies:

- Collector UX (single predictable price)
- Billing implementation (no per-cycle recalculation)
- Creator incentive (no reason to limit release size)

### Regional Shipping Variance

The only variable in collector pricing is destination country. Per Peecho/Prodigi research:

| Tier   | Region           | Shipping Range |
| ------ | ---------------- | -------------- |
| Tier 1 | Core EU          | €3–6           |
| Tier 2 | Extended EU      | €7–10          |
| Tier 3 | UK/Europe non-EU | €11–16         |
| Tier 4 | North America    | €17–22         |
| Tier 5 | Asia-Pacific     | €23–27         |

### Quote Lock-In Benefits

1. **Price Transparency**: Collector knows exact cost before subscribing
2. **No Surprises**: Shipping fluctuations don't affect committed subscribers
3. **Creator Revenue Predictability**: Platform can calculate margins upfront
4. **Simplified Billing**: Single charge per cycle, not per-order

## Error Handling

### PDF Generation Failures

- `GeneratedPrintFile.status = FAILED`
- `errorMessage` stored
- Retry queue (up to 3 attempts via BullMQ config)
- Admin notification after final failure

### POD Order Failures

- Flag for manual intervention
- Collector notification with apology + options
- Potential reprint or refund flow

### Shipping Address Issues

- Validate address at subscription time
- Allow update until cycle lock date
- Flag invalid addresses before ordering

### Peecho Credit Management

Peecho uses a **credit system** - the merchant account must have sufficient credits to place orders.

- **Admin Responsibility**: Monitor Peecho merchant dashboard for credit balance
- **Top-up Required**: Admin manually adds credits before each fulfillment cycle
- **Insufficient Credits**: Order creation will fail → flag for manual retry after credits added
- **Recommendation**: Maintain buffer of ~2x expected monthly orders

## Success Metrics

- **Quote Accuracy**: % of cycles where actual pages match quoted estimate
- **Fulfillment Rate**: % of cycles successfully printed and shipped
- **Delivery Time**: Days from cycle lock to delivery
- **Cost Variance**: Average difference between quoted and actual costs
- **Collector Satisfaction**: Retention rate after first physical delivery
