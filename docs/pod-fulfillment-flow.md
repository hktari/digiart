# POD Fulfillment Flow

## Overview

This document describes the complete print-on-demand (POD) fulfillment flow from PDF generation to physical booklet delivery. The platform uses a third-party POD provider (Peecho/Prodigi) for printing and shipping.

## Key Concepts

### Pricing Model

Variable pricing based on page count + country of delivery

### Booklet Content Selection

Creators publish releases each cycle. Collectors subscribe to creators and the system automatically assigns new releases to the collector's booklet for that cycle. Releases have **variable size** (no fixed image count enforced on creators).

The collector has agency: they can review the releases assigned to their booklet and deselect any. The platform shows a running total of images (pages) that will be in their final booklet. This updates live as the collector changes their selection.

### Automatic Generation

Booklet PDF generation is fully automatic once the cycle lock date is reached. The only manual edge case requiring admin attention is when a creator has **not uploaded new art for the cycle** — in this case no release exists to include.

## Flow Diagram

```mermaid
flowchart TD
    subgraph PHASE1["1. SUBSCRIPTION & COMMITMENT PHASE"]

Collector Subscribes to Creator
            │
            ▼
┌─────────────────────────────┐
│ 1. Display Dynamic Quote     │
│    Based on Inputs:          │
│    - Delivery country        │
│    - Estimated page count    │
│    (from selected artworks)  │
│    - Shows:                  │
│      * Base production       │
│      * Shipping amount       │
│      * Platform markup       │
│      * Estimated total       │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 2. Collector Commits Booklet │
│    - Persists CheckoutIntent │
│    - collectorProfileId      │
│    - cycleId (future cycle)  │
│    - quote input country     │
│    - quote input page count  │
│    - committedAt             │
│    - Selection snapshot      │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 3. Setup Payment Method      │
│    via Stripe                │
│    - Card/token saved        │
│    - No charge yet           │
│    - Charge scheduled for    │
│      cycle lock (frozen qty) │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 4. Subscription Active       │
│    - Collector sees content  │
│    - Awaiting cycle lock     │
│    - Quote shown as estimate │
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
│                           QUOTE FREEZE PHASE                                 │
│                           (At Cycle Lock)                                     │
└─────────────────────────────────────────────────────────────────────────────┘

Cycle Lock Date Reached
            │
            ▼
┌─────────────────────────────┐
│ 1. Recompute Final Page     │
│    Count                     │
│    - From locked selections  │
│    - Cover (1) + back (1)   │
│    - Pad to even number      │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 2. Fetch Fresh POD Quote     │
│    - With actual page count  │
│    - With delivery country   │
│    - Include platform markup │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 3. Persist QuoteFreeze       │
│    - Immutable snapshot      │
│    - baseAmount              │
│    - shippingAmount          │
│    - markupAmount            │
│    - totalAmount             │
│    - frozenAt timestamp      │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 4. Charge Collector         │
│    - Stripe charge from      │
│      frozen totalAmount      │
│    - Off-session payment     │
└─────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│               FULFILLMENT & ORDERING PHASE  [IMPLEMENTED Sprint 6]          │
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

### CheckoutIntent

Stored when collector commits booklet for upcoming cycle:

| Field                | Type     | Description                                 |
| -------------------- | -------- | ------------------------------------------- |
| `collectorProfileId` | String   | FK to CollectorProfile                      |
| `cycleId`            | String   | FK to SubscriptionCycle (future cycle)      |
| `committedAt`        | DateTime | When collector committed booklet            |
| `quoteCountry`       | String   | Delivery country from collector address     |
| `quotePageCount`     | Int      | Estimated page count at commit time         |
| `selectionSnapshot`  | JSON     | Snapshot of selected release IDs and counts |

### QuoteFreeze

Stored at cycle lock, immutable pricing snapshot:

| Field                | Type     | Description                                    |
| -------------------- | -------- | ---------------------------------------------- |
| `collectorProfileId` | String   | FK to CollectorProfile                         |
| `cycleId`            | String   | FK to SubscriptionCycle                        |
| `destinationCountry` | String   | Delivery country                               |
| `frozenPageCount`    | Int      | Final page count from locked selections        |
| `providerQuoteRef`   | String?  | POD provider quote reference                   |
| `baseAmount`         | Decimal  | Base production cost from POD quote            |
| `shippingAmount`     | Decimal  | Shipping cost from POD quote                   |
| `markupAmount`       | Decimal  | Platform markup (fixed fee)                    |
| `totalAmount`        | Decimal  | Final charge amount (base + shipping + markup) |
| `currency`           | String   | Currency code (e.g., "EUR", "USD")             |
| `frozenAt`           | DateTime | When quote was frozen at cycle lock            |

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

### Dynamic Pricing Model

Pricing is variable per collector per cycle, based on two inputs:

- **Page count**: Calculated from selected artworks (1 page per artwork + cover + back cover, padded to even)
- **Delivery country**: Determines shipping cost from POD provider

### Quote Lifecycle

1. **Estimate Phase** (during cycle selection window):
   - Collector sees live quote based on current selections and address
   - Quote is labeled as "Estimated" - not yet frozen
   - Collector can change selections and address, quote updates dynamically

2. **Freeze Phase** (at cycle lock):
   - System recomputes final page count from locked selections
   - Fetches fresh POD quote with actual delivery country
   - Persists immutable `QuoteFreeze` snapshot
   - This frozen total becomes the charge amount

3. **Charge Phase** (after freeze):
   - Stripe charges collector using frozen total amount
   - No further price changes for that cycle

### Quote Components

Per POD provider response:

- **Base production amount**: Cost of printing based on page count
- **Shipping amount**: Cost based on delivery country
- **Platform markup**: Fixed platform fee (configured via `PLATFORM_MARKUP_EUR`)
- **Total**: Base + Shipping + Markup (final charge amount)

### Regional Shipping Variance

Shipping cost varies by destination country. Per Peecho/Prodigi research:

| Tier   | Region           | Shipping Range |
| ------ | ---------------- | -------------- |
| Tier 1 | Core EU          | €3–6           |
| Tier 2 | Extended EU      | €7–10          |
| Tier 3 | UK/Europe non-EU | €11–16         |
| Tier 4 | North America    | €17–22         |
| Tier 5 | Asia-Pacific     | €23–27         |

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
