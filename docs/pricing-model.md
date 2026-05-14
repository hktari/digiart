# Platform Pricing Model

## Peecho Costs (50-page A5 Magazine)

| Region       | Product | Shipping | Total      |
| ------------ | ------- | -------- | ---------- |
| Austria (EU) | €8.90   | €6.93    | **€17.41** |
| USA          | €8.90   | €6.66    | **€15.56** |

## Subscription Prices

**Current proposal is UNPROFITABLE for EU.**

| Region | Price      | Net (after VAT) | Peecho Cost | Margin     |
| ------ | ---------- | --------------- | ----------- | ---------- |
| EU     | €19        | €15.83          | €17.41      | **-€1.58** |
| EU     | €25        | €20.83          | €17.41      | **€3.42**  |
| USA    | $24 (~€22) | €22.00          | €15.56      | **€6.44**  |

## Recommended Prices

- **EU**: €25/month (€20.83 net, €3.42 margin after Peecho)
- **USA**: $24/month (~€22 net, €6.44 margin after Peecho)

## Revenue Split (per subscriber, EU €25)

1. Net revenue: €20.83
2. Peecho cost: -€17.41
3. Remaining: €3.42
4. Platform fee (30%): -€1.03
5. Creator pool (70%): **€2.39**

productPrice = quantity _ (basePrice +(basePrice _ marginPercentage) + (pricePerPage + (basePrice _ marginPercentage)) _ numberOfPages)

e.g.
quantity = 1
basePrice = 3.5€
pricePerPage = 0.06€
marginPercentage = 0.3

marginPercentage is applied to basePrice and
marginPercentage is further split into platformFee and creatorPayout

## Creator Earnings Example

100 subscribers, 2 creators selected each = 200 total selections:

- Per selection: €2.39 / 2 = **€1.20**
- Creator with 80 selections: **€96/month**
- Creator with 50 selections: **€60/month**

## Subscription Billing Model

Two billing paths depending on how the collector engages:

**Active collector (Order Now):**

- Collector manually finalises their selections and clicks "Order Now" at any point before cycle lock.
- Stripe is charged immediately at that moment for the exact quoted amount.
- Fulfillment (PDF generation → Peecho order) starts right away.
- Cycle lock does not re-bill or re-process these collectors.

**Passive collector (Delayed / Netflix model):**

- Collector subscribes and lets the platform auto-populate their booklet.
- First charge occurs on the **next cycle lock date** (1st of month).
- Billing aligns to lock date going forward (monthly on the 1st).
- Stripe supports this via trial periods or scheduled subscription start dates.

**Example:**

- Collector subscribes on March 15th
- First charge: April 1st (next lock date)
- Ongoing: Charged 1st of every month
- First booklet ships April 1st

**Why this works:**

- Fair to collector (no paying while waiting)
- Predictable cash flow (all revenue received on lock date)
- Aligns perfectly with fulfillment timing
- Reduces churn from "paying for nothing" feeling

**Implementation:**

- Use Stripe `trial_end` parameter to set first charge date
- Or create subscription with `billing_cycle_anchor` on lock date
- Collector enters payment method at subscribe time for verification

## Payout Schedule

**Fixed payout date**: 7 days after cycle lock/shipment date

This creates a safe buffer to verify:

1. All orders successfully submitted to Peecho
2. Peecho confirmed receipt (via webhook)
3. No mass failures occurred
4. Credit balance was sufficient

**Example timeline:**

- Cycle lock: 1st of month (also billing date)
- Orders submitted: 1st–2nd
- Peecho processing: 2nd–5th
- Payout date: **8th of month**

If any orders failed, admin can retry before payout date, and creator earnings are adjusted accordingly.

## Key Decisions Needed

1. **Final EU price**: €25 or higher?
2. **Split ratio**: 70/30 (creators/platform) or different?
3. **Payout timing**: ✅ Fixed date, 7 days after shipment
4. **VAT handling**: Price inclusive or exclusive? (EU law requires inclusive display)
