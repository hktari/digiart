# Creator Payout Calculator & Economics Analysis

## Current Problem

With the existing 70/30 split (creators/platform), a creator with 5k followers needs unrealistically high conversion rates to make meaningful income.

### Your Scenario (Current 70/30 Split)
- **Creator followers**: 5,000
- **Conversion rate**: 5% (250 subscribers)
- **Releases per cycle**: 3 releases × 10 artworks = 30 pages total
- **Subscription price (EU)**: €25
- **Peecho cost**: €17.41
- **Total margin**: €3.42
- **Platform profit per booklet**: €1.03 (30%)
- **Creator pool**: €2.39 (70%)

### Best Case Scenario (1 creator only in booklet)
**Creator earns**: 250 subscribers × €2.39 = **€597.50/month**

### Realistic Scenario (collectors select 3 creators on average)
- Total booklet pages: 90 pages (3 creators × 30 pages each)
- Creator's share: 30 pages / 90 pages = 33.3%
- Creator earns: €597.50 × 0.333 = **€199/month**

**This is NOT worth it for most creators.**

---

## Recommended Split Adjustments

### Option A: 85/15 Split (Conservative)
**Creator pool**: €2.907 (85% of €3.42)  
**Platform fee**: €0.513 (15% of €3.42)

#### Best case (1 creator):
- €2.907 × 250 = **€726.75/month**

#### Realistic (3 creators):
- €726.75 × (30/90) = **€242.25/month**

**Platform still makes**: €0.513 × 250 = **€128.25/month from this creator's followers**

---

### Option B: 90/10 Split (Aggressive - Creator First)
**Creator pool**: €3.078 (90% of €3.42)  
**Platform fee**: €0.342 (10% of €3.42)

#### Best case (1 creator):
- €3.078 × 250 = **€769.50/month**

#### Realistic (3 creators):
- €769.50 × (30/90) = **€256.50/month**

**Platform makes**: €0.342 × 250 = **€85.50/month from this creator's followers**

---

### Option C: Dynamic Split Based on Scale

| Followers Converted | Split (Creator/Platform) | Monthly Earnings (1 creator) | Monthly Earnings (3 creators) |
|---------------------|--------------------------|------------------------------|-------------------------------|
| 0-100               | 95/5                     | €3.249 × qty                 | €108 @ 100 conv              |
| 101-500             | 90/10                    | €3.078 × qty                 | €257 @ 250 conv              |
| 501-1000            | 85/15                    | €2.907 × qty                 | €485 @ 500 conv              |
| 1000+               | 80/20                    | €2.736 × qty                 | €912 @ 1000 conv             |

**Rationale**: Small creators need higher incentive. As they grow, platform takes slightly more (but still fair).

---

## Payout Function Models

### Model 1: Share by Page Count (Current Implementation)
```typescript
function calculateCreatorPayout(params: {
  totalMargin: number;           // €3.42 per subscriber
  creatorPageCount: number;      // 30 pages
  totalBookletPages: number;     // 90 pages (3 creators)
  creatorPayoutSplit: number;    // 0.7 (70%)
}): number {
  const creatorPool = params.totalMargin * params.creatorPayoutSplit;
  const creatorShare = params.creatorPageCount / params.totalBookletPages;
  return creatorPool * creatorShare;
}

// Example:
// €3.42 × 0.7 = €2.39 (creator pool)
// 30 / 90 = 0.333 (33.3% of booklet)
// €2.39 × 0.333 = €0.796 per booklet
```

### Model 2: Weighted by Engagement (Alternative)
```typescript
// If we track which artworks collectors actually selected
function calculateCreatorPayoutWeighted(params: {
  totalMargin: number;
  creatorSelectionCount: number;     // How many times creator was chosen
  totalSelectionCount: number;       // Total selections across all creators
  creatorPayoutSplit: number;
}): number {
  const creatorPool = params.totalMargin * params.creatorPayoutSplit;
  const creatorShare = params.creatorSelectionCount / params.totalSelectionCount;
  return creatorPool * creatorShare;
}

// Example:
// If collector explicitly selected 12 artworks from Creator A,
// 10 from Creator B, 8 from Creator C
// Creator A: 12/30 = 40% of pool
```

---

## Real-World Examples

### Example 1: Small Creator (500 followers, 3% conversion)
**Subscribers**: 15

| Split | Best Case (1 creator) | Realistic (3 creators) | Platform Revenue |
|-------|-----------------------|------------------------|------------------|
| 70/30 | €35.85                | €11.95                 | €15.45           |
| 85/15 | €43.65                | €14.55                 | €7.65            |
| 90/10 | €46.20                | €15.40                 | €5.10            |

**Recommendation**: 90/10 split to help small creators gain traction.

---

### Example 2: Mid-Tier Creator (5k followers, 5% conversion)
**Subscribers**: 250

| Split | Best Case (1 creator) | Realistic (3 creators) | Platform Revenue |
|-------|-----------------------|------------------------|------------------|
| 70/30 | €598.50               | €199.50                | €256.50          |
| 85/15 | €726.75               | €242.25                | €128.25          |
| 90/10 | €769.50               | €256.50                | €85.50           |

**Recommendation**: 85/15 split balances creator earnings and platform sustainability.

---

### Example 3: Established Creator (20k followers, 7% conversion)
**Subscribers**: 1,400

| Split | Best Case (1 creator) | Realistic (3 creators) | Platform Revenue |
|-------|-----------------------|------------------------|------------------|
| 70/30 | €3,352                | €1,117                 | €1,436           |
| 85/15 | €4,070                | €1,357                 | €718             |
| 90/10 | €4,309                | €1,436                 | €479             |
| 80/20 | €3,830                | €1,277                 | €957             |

**Recommendation**: 80/20 split - creator makes great income, platform scales revenue.

---

## Recommended Implementation Strategy

### Phase 1: Launch with 90/10
- **Goal**: Attract early creators, prove value proposition
- **Duration**: First 6 months or until 50 active creators
- **Creator message**: "We take only 10% - you keep 90%"

### Phase 2: Transition to Tiered
- **Goal**: Reward loyalty, scale sustainably
- **Trigger**: After 50 active creators OR €50k monthly GMV
- **Model**: Dynamic split based on scale (see Option C above)

### Phase 3: Introduce Creator Plus
- **Premium tier**: Creators pay €49/month for:
  - 95/5 split (vs 90/10 standard)
  - Advanced analytics
  - Priority support
  - Early access to features

---

## Calculator Implementation

### Server Action: `calculateEstimatedEarnings`

```typescript
// apps/mvp/app/actions/creator-earnings.ts
"use server";

export async function calculateEstimatedEarnings(params: {
  followerCount: number;
  conversionRate: number;        // 0.05 = 5%
  releasesPerCycle: number;      // 3
  artworksPerRelease: number;    // 10
  avgCreatorsPerBooklet?: number; // 3 (default)
  split?: number;                 // 0.9 (default 90/10)
}) {
  const {
    followerCount,
    conversionRate,
    releasesPerCycle,
    artworksPerRelease,
    avgCreatorsPerBooklet = 3,
    split = 0.9,
  } = params;

  const subscribers = Math.floor(followerCount * conversionRate);
  const creatorPages = releasesPerCycle * artworksPerRelease;
  const avgBookletPages = avgCreatorsPerBooklet * creatorPages;
  
  const marginPerBooklet = 3.42; // €25 subscription - €17.41 Peecho - €4.17 VAT
  const creatorPoolPerBooklet = marginPerBooklet * split;
  
  // Best case (100% of booklet is this creator)
  const bestCaseMonthly = subscribers * creatorPoolPerBooklet;
  
  // Realistic case (share booklet with other creators)
  const pageShare = creatorPages / avgBookletPages;
  const realisticMonthly = bestCaseMonthly * pageShare;
  
  // Worst case (share with 5 creators)
  const worstCasePages = 5 * creatorPages;
  const worstCaseShare = creatorPages / worstCasePages;
  const worstCaseMonthly = subscribers * creatorPoolPerBooklet * worstCaseShare;

  return {
    subscribers,
    earnings: {
      bestCase: Math.round(bestCaseMonthly * 100) / 100,
      realistic: Math.round(realisticMonthly * 100) / 100,
      worstCase: Math.round(worstCaseMonthly * 100) / 100,
    },
    breakdown: {
      marginPerBooklet,
      creatorPoolPerBooklet: Math.round(creatorPoolPerBooklet * 100) / 100,
      platformFeePerBooklet: Math.round(marginPerBooklet * (1 - split) * 100) / 100,
      pageShare: Math.round(pageShare * 100) / 100,
    },
  };
}
```

### Usage in Creator Dashboard

```typescript
// apps/mvp/app/creator/earnings/page.tsx
import { calculateEstimatedEarnings } from "@/app/actions/creator-earnings";

export default async function CreatorEarningsPage() {
  const estimate = await calculateEstimatedEarnings({
    followerCount: 5000,
    conversionRate: 0.05,
    releasesPerCycle: 3,
    artworksPerRelease: 10,
  });

  return (
    <div>
      <h1>Estimated Monthly Earnings</h1>
      <p>Based on {estimate.subscribers} subscribers:</p>
      <ul>
        <li>Best case (solo booklet): €{estimate.earnings.bestCase}</li>
        <li>Realistic (3 creators): €{estimate.earnings.realistic}</li>
        <li>Worst case (5 creators): €{estimate.earnings.worstCase}</li>
      </ul>
    </div>
  );
}
```

---

## Migration Plan for Split Changes

### Database Update
```typescript
// Update PlatformConfig
await db.platformConfig.update({
  where: { id: configId },
  data: {
    creatorPayoutSplit: 0.9,  // Changed from 0.7
    platformFeeSplit: 0.1,    // Changed from 0.3
    updatedBy: adminUserId,
  },
});
```

### Grandfathering Strategy
```typescript
// Store split ratio at cycle freeze time
model CollectorQuoteSnapshot {
  // ... existing fields
  creatorPayoutSplitSnapshot: Float  // Store active split at freeze time
  platformFeeSplitSnapshot: Float
}

// Then use snapshot values in payout calculation
// This ensures fairness if splits change mid-cycle
```

---

## Communication to Creators

### Messaging for 90/10 Launch
> **"We're creator-first. You keep 90%."**
>
> Most platforms take 30-50% commission. We believe creators deserve more.
>
> **Here's the math:**
> - Subscription price: €25
> - Printing cost: €17.41
> - VAT: €4.17
> - Remaining margin: €3.42
> - **Your share (90%)**: €3.078 per booklet
> - Our fee (10%): €0.342 per booklet
>
> **Example earnings:**
> - 100 subscribers = €307.80/month (if you're the only creator they follow)
> - 500 subscribers = €1,539/month
> - 1,000 subscribers = €3,078/month
>
> *Actual earnings depend on how many creators each collector selects.*

---

## Recommended Next Steps

1. **Update `PlatformConfig` default values** to 90/10 split
2. **Implement `calculateEstimatedEarnings` server action**
3. **Add calculator UI** to creator dashboard (apps/mvp/app/creator/earnings)
4. **Update marketing pages** with new split messaging
5. **Add transparency**: Show real payout calculations in creator statements
6. **Consider tiered splits** after platform scales

---

## Questions to Decide

1. **What split do you want to launch with?** (Recommend: 90/10)
2. **Should we grandfather existing creators** if we change splits later?
3. **Do we want tiered splits** based on creator performance?
4. **Should we add a "Creator Plus" paid tier** for better splits?
5. **How do we communicate** realistic vs best-case earnings to avoid disappointment?
