# Platform Pricing Model (Dynamic Page-Based Pricing)

## Dynamic Pricing Formula

**The platform uses page-based dynamic pricing, not fixed subscription prices.**

```
Retail Price = Wholesale + Markup
where:
  Wholesale = Product + Shipping + VAT
  Markup = (Product + VAT_on_product) × marginPercentage
```

### Peecho Wholesale Costs

**Product pricing:**
```
Product = basePrice + (pricePerPage × numberOfPages)
```

**Current Peecho rates (EU):**
- Base price: €2.90
- Price per page: €0.12
- Shipping (Austria/EU): ~€7.00
- VAT: 20% on (Product + Shipping)

### Example: 30-Page Booklet (EU/Austria)

```
Product = €2.90 + (€0.12 × 30) = €6.50
Shipping = €7.00
Subtotal = €13.50
VAT (20%) = €2.70
───────────────────────────────
Wholesale Total = €16.20
```

## Platform Margin Calculation

**Margin is calculated on (Product + VAT on product) only, NOT on shipping:**

```
Markup Base = Product + (Product × 0.20)
            = €6.50 + €1.30
            = €7.80

Markup (30%) = €7.80 × 0.30
             = €2.34

Retail Total = €16.20 + €2.34
             = €18.54
```

**Available margin for split: €2.34 per booklet**

## Revenue Split Options

### Current Split (70/30)

For a 30-page booklet:
- **Total margin**: €2.34
- **Creator pool (70%)**: €1.638 per booklet
- **Platform fee (30%)**: €0.702 per booklet

**Example (250 subscribers):**
- Best case (solo): 250 × €1.638 = **€409.50/month**
- Realistic (3 creators): €409.50 ÷ 3 = **€136.50/month**

❌ **Problem**: Not enough to motivate creators

### Recommended Split (90/10)

For a 30-page booklet:
- **Total margin**: €2.34
- **Creator pool (90%)**: €2.106 per booklet
- **Platform fee (10%)**: €0.234 per booklet

**Example (250 subscribers):**
- Best case (solo): 250 × €2.106 = **€526.50/month**
- Realistic (3 creators): €526.50 ÷ 3 = **€175.50/month**

✅ **Better**: 28.6% increase over 70/30 split

### Alternative Split (85/15)

For a 30-page booklet:
- **Total margin**: €2.34
- **Creator pool (85%)**: €1.989 per booklet
- **Platform fee (15%)**: €0.351 per booklet

**Example (250 subscribers):**
- Best case (solo): 250 × €1.989 = **€497.25/month**
- Realistic (3 creators): €497.25 ÷ 3 = **€165.75/month**

## Pricing by Page Count

| Pages | Product | + Shipping | + VAT | Wholesale | Markup (30%) | Retail | Margin |
|-------|---------|------------|-------|-----------|--------------|--------|--------|
| 10    | €4.10   | €11.10     | €2.22 | €13.32    | €1.476       | €14.80 | €1.48  |
| 20    | €5.30   | €12.30     | €2.46 | €14.76    | €1.908       | €16.67 | €1.91  |
| 30    | €6.50   | €13.50     | €2.70 | €16.20    | €2.340       | €18.54 | €2.34  |
| 40    | €7.70   | €14.70     | €2.94 | €17.64    | €2.772       | €20.41 | €2.77  |
| 50    | €8.90   | €15.90     | €3.18 | €19.08    | €3.204       | €22.28 | €3.20  |

**Key insight**: More pages = higher margin per booklet, but also higher collector cost.

## Creator Earnings by Page Count (90/10 Split, 250 Subscribers, 3 Creators)

| Pages | Margin | Creator Pool (90%) | Per Subscriber | × 250 Subs | ÷ 3 Creators | Monthly Earnings |
|-------|--------|-------------------|----------------|------------|--------------|------------------|
| 10    | €1.48  | €1.332            | €0.444         | €111.00    | ÷ 3          | **€37/month**    |
| 20    | €1.91  | €1.717            | €0.572         | €143.00    | ÷ 3          | **€47.67/month** |
| 30    | €2.34  | €2.106            | €0.702         | €175.50    | ÷ 3          | **€175.50/month**|
| 40    | €2.77  | €2.495            | €0.832         | €208.00    | ÷ 3          | **€69.33/month** |
| 50    | €3.20  | €2.884            | €0.961         | €240.33    | ÷ 3          | **€80.11/month** |

**Note**: This assumes booklet = (creator pages) × 3 creators. Actual share is proportional.

## Scenario: Your Example (5k followers, 5% conversion, 30 pages)

**Assumptions:**
- 5,000 followers
- 5% conversion = 250 subscribers
- 3 releases × 10 artworks = 30 pages
- Typical booklet = 3 creators (90 pages total)
- Collector pays: €18.54 per booklet

**Per-booklet margin: €2.34**

### 70/30 Split Results
- Creator pool: €1.638 per booklet
- Creator share: 30/90 = 33.33%
- Creator earns: €1.638 × 0.3333 = €0.546 per booklet
- **Monthly earnings**: 250 × €0.546 = **€136.50**
- Platform: €0.702 × 250 = **€175.50**

### 90/10 Split Results (Recommended)
- Creator pool: €2.106 per booklet
- Creator share: 30/90 = 33.33%
- Creator earns: €2.106 × 0.3333 = €0.702 per booklet
- **Monthly earnings**: 250 × €0.702 = **€175.50**
- Platform: €0.234 × 250 = **€58.50**

**Improvement: +28.6% earnings for creator**

## Implementation Formula (Code)

```typescript
function calculateRetailPrice(params: {
  basePrice: number;        // €2.90
  pricePerPage: number;     // €0.12
  numberOfPages: number;
  shipping: number;         // €7.00
  vatRate: number;          // 0.20 (20%)
  marginPercentage: number; // 0.30 (30%)
}): {
  wholesaleTotal: number;
  markup: number;
  retailTotal: number;
  margin: number;
} {
  const { basePrice, pricePerPage, numberOfPages, shipping, vatRate, marginPercentage } = params;
  
  // Wholesale product cost
  const product = basePrice + (pricePerPage * numberOfPages);
  
  // VAT on product + shipping
  const vat = (product + shipping) * vatRate;
  
  // Wholesale total
  const wholesaleTotal = product + shipping + vat;
  
  // Markup on product + VAT (not shipping)
  const productWithVAT = product + (product * vatRate);
  const markup = productWithVAT * marginPercentage;
  
  // Retail price
  const retailTotal = wholesaleTotal + markup;
  
  return {
    wholesaleTotal,
    markup,
    retailTotal,
    margin: markup,
  };
}
```

## Subscription Billing Model

**No fixed subscription price.** Collectors are charged dynamically based on their booklet:

1. **Collector selects creators** during open cycle
2. **At cycle lock**: Calculate page count, fetch Peecho quote
3. **Charge collector**: Wholesale + markup for their specific booklet
4. **Submit to Peecho**: Wholesale amount
5. **Distribute margin**: Split markup between creators and platform

### Two Billing Paths

**Active collector (Order Now):**
- Collector clicks "Order Now" before cycle lock
- Stripe charged immediately for exact quoted amount
- Fulfillment starts right away

**Passive collector (Netflix model):**
- Collector subscribes and lets platform auto-populate
- First charge on **next cycle lock date** (1st of month)
- Ongoing: Charged monthly on cycle lock

## Creator Payout Calculation

```typescript
function calculateCreatorPayout(params: {
  totalMargin: number;           // €2.34 (for 30-page booklet)
  creatorPageCount: number;      // 30 pages
  totalBookletPages: number;     // 90 pages (3 creators)
  creatorPayoutSplit: number;    // 0.9 (90%)
}): number {
  const creatorPool = params.totalMargin * params.creatorPayoutSplit;
  const creatorShare = params.creatorPageCount / params.totalBookletPages;
  return creatorPool * creatorShare;
}

// Example:
// €2.34 × 0.9 = €2.106 (creator pool)
// 30 / 90 = 0.333 (33.3% of booklet)
// €2.106 × 0.333 = €0.702 per booklet
```

## Payout Schedule

**Fixed payout date**: 7 days after cycle lock

**Example timeline:**
- Cycle lock: 1st of month
- Orders submitted: 1st–2nd
- Peecho processing: 2nd–5th
- Payout date: **8th of month**

## Key Decisions

1. **Split ratio**: 90/10 (creators/platform) recommended
2. **Margin percentage**: 30% (configurable in `PlatformConfig.quoteMarginAmount`)
3. **Payout timing**: ✅ Fixed date, 7 days after shipment
4. **VAT handling**: ✅ Price inclusive (EU law requirement)
5. **Page limits**: Define min/max pages per cycle to control costs

## Comparison with Fixed Pricing (Old Model)

| Model | Fixed €25/month | Dynamic (30 pages) |
|-------|-----------------|-------------------|
| Collector pays | €25.00 | €18.54 |
| Wholesale cost | €17.41 (50 pages) | €16.20 (30 pages) |
| Margin | €3.42* | €2.34 |
| Creator (90/10) | €3.078 | €2.106 |

*Note: Old model assumed 50 pages; new model is dynamic

**Advantages of dynamic pricing:**
- Fair: Collectors pay only for what they get
- Flexible: Scales with content (more pages = more revenue)
- Transparent: Clear pricing formula
- Lower barrier: Smaller booklets cost less

**Disadvantages:**
- Variable revenue per subscriber
- More complex to communicate
- Harder to predict monthly income
