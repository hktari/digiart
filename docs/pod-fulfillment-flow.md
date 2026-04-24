# POD Fulfillment Flow

## Overview

This document describes the complete print-on-demand (POD) fulfillment flow from PDF generation to physical booklet delivery. The platform uses a third-party POD provider (Peecho/Prodigi) for printing and shipping.

## Key Concepts

### Pricing Quote Lock-In

**When a collector subscribes to a creator, they agree to a pricing quote for that subscription cycle.** This quote includes:

- **Product Amount**: Base cost of printing the booklet (based on page count and format)
- **Shipping Amount**: Delivery cost based on destination country (€3-27 range for Peecho)
- **Tax Amount**: VAT/tax calculated based on collector's region
- **Total Estimate**: Sum of all charges in the agreed currency (default: EUR)

This pricing quote is locked in at subscription time and stored in `PricingQuoteSnapshot`. The collector is committed to this price for the cycle, regardless of any subsequent pricing changes by the POD provider.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUBSCRIPTION & PRICING PHASE                        │
└─────────────────────────────────────────────────────────────────────────────┘

Collector Subscribes to Creator
            │
            ▼
┌─────────────────────────────┐
│ 1. Calculate Page Estimate  │
│    - Based on creator's     │
│      typical release size     │
│    - Or default estimate    │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 2. Fetch POD Pricing        │
│    - Call Peecho/Prodigi API│
│    - Pass: country, pages,   │
│      format (magazine)       │
│    - Get: product + shipping│
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 3. Store PricingQuoteSnapshot│
│    - collectorProfileId     │
│    - cycleId (future cycle) │
│    - offeringId (product)   │
│    - country                │
│    - requestedPageCount     │
│    - shippingAmount         │
│    - productAmount          │
│    - taxAmount              │
│    - totalEstimate          │
│    - currency (EUR)         │
│    - quotedAt               │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 4. Display to Collector     │
│    "Your monthly booklet      │
│     will cost €X (including   │
│     €Y shipping to Z)"        │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 5. Collector Confirms        │
│    Subscription              │
│    → Locks in pricing quote  │
└─────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                        SELECTION & GENERATION PHASE                       │
└─────────────────────────────────────────────────────────────────────────────┘

Cycle Selection Window Opens
            │
            ▼
┌─────────────────────────────┐
│ Collector Makes Selections   │
│ - Chooses releases from      │
│   subscribed creators        │
│ - Stores in                  │
│   CollectorReleaseSelection  │
└─────────────────────────────┘
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
│ 3. Validate Against Quote     │
│    - If page count differs    │
│      significantly from       │
│      quoted estimate,         │
│      flag for review          │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 4. Generate PDF              │
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
│                         FULFILLMENT & ORDERING PHASE                        │
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
│ 2. Call POD API              │
│    - Submit PDF URL          │
│    - Submit shipping address │
│    - Submit product spec      │
│      (page count, format)    │
│    - Submit locked pricing     │
│      reference               │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 3. POD Provider Processes    │
│    - Receives order          │
│    - Routes to nearest       │
│      printer                 │
│    - Prints booklet          │
│    - Packages & ships        │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 4. Webhook/Callback          │
│    - Order confirmed           │
│    - Tracking number           │
│    - Shipment status updates   │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 5. Update Platform           │
│    - Store tracking number     │
│    - Update fulfillment status │
│    - Notify collector          │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 6. Collector Receives        │
│    Physical Booklet          │
└─────────────────────────────┘
```

## Data Models

### PricingQuoteSnapshot

Stored when collector subscribes, locks in pricing for the cycle:

| Field | Type | Description |
|-------|------|-------------|
| `collectorProfileId` | String | FK to CollectorProfile |
| `cycleId` | String | FK to SubscriptionCycle (future cycle) |
| `offeringId` | String | FK to PodOffering (product spec) |
| `country` | String | Destination country for shipping |
| `requestedPageCount` | Int | Estimated pages at subscription time |
| `shippingAmount` | Decimal | Locked shipping cost (€3-27) |
| `productAmount` | Decimal | Locked product/printing cost |
| `taxAmount` | Decimal | Locked VAT/tax |
| `totalEstimate` | Decimal | Total locked price |
| `currency` | String | Default: "EUR" |
| `quotedAt` | DateTime | When quote was generated |

### GeneratedPrintFile

Stored when PDF is generated:

| Field | Type | Description |
|-------|------|-------------|
| `collectorProfileId` | String | FK to CollectorProfile |
| `cycleId` | String | FK to SubscriptionCycle |
| `storageUrl` | String? | URL to PDF in S3/local storage |
| `pageCount` | Int? | Actual generated page count |
| `status` | PrintFileStatus | PENDING → GENERATING → READY/FAILED |
| `errorMessage` | String? | Error details if failed |
| `generatedAt` | DateTime? | When PDF was completed |

## Pricing Strategy Notes

### Regional Shipping Variance

Per Peecho/Prodigi research, shipping costs vary significantly by destination:

| Tier | Region | Shipping Range |
|------|--------|----------------|
| Tier 1 | Core EU | €3-6 |
| Tier 2 | Extended EU | €7-10 |
| Tier 3 | UK/Europe non-EU | €11-16 |
| Tier 4 | North America | €17-22 |
| Tier 5 | Asia-Pacific | €23-27 |

### Quote Lock-In Benefits

1. **Price Transparency**: Collector knows exact cost before subscribing
2. **No Surprises**: Shipping fluctuations don't affect committed subscribers
3. **Creator Revenue Predictability**: Platform can calculate margins upfront
4. **Simplified Billing**: Single charge per cycle, not per-order

### Handling Page Count Variance

If actual page count differs from quoted estimate:

- **Small variance (< 10%)**: Absorb into platform margin
- **Large variance (> 10%)**: Flag for manual review, possibly adjust future cycle pricing
- **Under quote**: Platform keeps margin difference
- **Over quote**: Platform absorbs cost or adjusts future pricing

## API Integration Points

### Peecho/Prodigi API (Planned)

1. **Get Quote** (`POST /v1/quotes`)
   - Input: country, page count, format (magazine)
   - Output: product cost, shipping cost, tax, total

2. **Create Order** (`POST /v1/orders`)
   - Input: PDF URL, shipping address, product spec, quote reference
   - Output: order ID, estimated ship date

3. **Webhook Events**
   - `order.confirmed`: Order received by printer
   - `order.shipped`: Tracking number available
   - `order.delivered`: Confirmed delivery
   - `order.failed`: Print/shipping failure

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

## Success Metrics

- **Quote Accuracy**: % of cycles where actual pages match quoted estimate
- **Fulfillment Rate**: % of cycles successfully printed and shipped
- **Delivery Time**: Days from cycle lock to delivery
- **Cost Variance**: Average difference between quoted and actual costs
- **Collector Satisfaction**: Retention rate after first physical delivery
