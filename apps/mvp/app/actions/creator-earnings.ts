"use server";

/**
 * Calculate estimated monthly earnings for a creator based on their audience metrics
 * and content production using DYNAMIC PAGE-BASED PRICING.
 *
 * This helps creators understand potential income based on:
 * - Follower count and conversion rate
 * - Number of releases and artworks per cycle
 * - How many other creators collectors typically select
 *
 * Pricing is calculated per booklet based on page count:
 * - Product = €2.90 base + (€0.12 × pages)
 * - Wholesale = Product + Shipping + VAT
 * - Markup = (Product + VAT on product) × 30%
 * - Margin available for split = Markup
 *
 * @example
 * const estimate = await calculateEstimatedEarnings({
 *   followerCount: 5000,
 *   conversionRate: 0.05, // 5%
 *   releasesPerCycle: 3,
 *   artworksPerRelease: 10,
 * });
 * // Returns: { subscribers: 250, earnings: { bestCase: 526.50, realistic: 175.50, ... } }
 */
export async function calculateEstimatedEarnings(params: {
  followerCount: number;
  conversionRate: number; // 0.05 = 5%
  releasesPerCycle: number; // e.g. 3
  artworksPerRelease: number; // e.g. 10
  avgCreatorsPerBooklet?: number; // default: 3
  split?: number; // default: 0.9 (90% to creators)
  basePrice?: number; // default: 2.90 (Peecho base)
  pricePerPage?: number; // default: 0.12 (Peecho per page)
  shipping?: number; // default: 7.00 (EU shipping)
  vatRate?: number; // default: 0.20 (20% VAT)
  marginPercentage?: number; // default: 0.30 (30% markup)
}) {
  const {
    followerCount,
    conversionRate,
    releasesPerCycle,
    artworksPerRelease,
    avgCreatorsPerBooklet = 3,
    split = 0.9,
    basePrice = 2.9,
    pricePerPage = 0.12,
    shipping = 7.0,
    vatRate = 0.2,
    marginPercentage = 0.3,
  } = params;

  // Calculate total subscribers
  const subscribers = Math.floor(followerCount * conversionRate);

  // Calculate creator's page contribution
  const creatorPages = releasesPerCycle * artworksPerRelease;

  // Average booklet size when shared with other creators
  const avgBookletPages = avgCreatorsPerBooklet * creatorPages;

  // Dynamic pricing calculation for the booklet
  const product = basePrice + pricePerPage * avgBookletPages;
  const productWithVAT = product + product * vatRate;
  const markup = productWithVAT * marginPercentage;

  // Margin available for split (this is what we distribute)
  const marginPerBooklet = markup;
  const creatorPoolPerBooklet = marginPerBooklet * split;

  // Best case: Creator is the only one in the booklet (100% of pages)
  const bestCaseMonthly = subscribers * creatorPoolPerBooklet;

  // Realistic case: Share booklet with avgCreatorsPerBooklet creators
  const pageShare = creatorPages / avgBookletPages;
  const realisticMonthly = bestCaseMonthly * pageShare;

  // Worst case: Share with 5 creators
  const worstCaseBookletPages = 5 * creatorPages;
  const worstCaseProduct = basePrice + pricePerPage * worstCaseBookletPages;
  const worstCaseProductWithVAT = worstCaseProduct + worstCaseProduct * vatRate;
  const worstCaseMarkup = worstCaseProductWithVAT * marginPercentage;
  const worstCaseCreatorPool = worstCaseMarkup * split;
  const worstCaseShare = creatorPages / worstCaseBookletPages;
  const worstCaseMonthly = subscribers * worstCaseCreatorPool * worstCaseShare;

  // Calculate retail price collector pays
  const wholesaleTotal = product + shipping + (product + shipping) * vatRate;
  const retailTotal = wholesaleTotal + markup;

  return {
    subscribers,
    creatorPages,
    avgBookletPages,
    earnings: {
      bestCase: Math.round(bestCaseMonthly * 100) / 100,
      realistic: Math.round(realisticMonthly * 100) / 100,
      worstCase: Math.round(worstCaseMonthly * 100) / 100,
    },
    breakdown: {
      marginPerBooklet: Math.round(marginPerBooklet * 100) / 100,
      creatorPoolPerBooklet: Math.round(creatorPoolPerBooklet * 100) / 100,
      platformFeePerBooklet:
        Math.round(marginPerBooklet * (1 - split) * 100) / 100,
      pageShare: Math.round(pageShare * 1000) / 10, // percentage with 1 decimal
      split: Math.round(split * 100), // convert to percentage
      retailPrice: Math.round(retailTotal * 100) / 100,
      wholesalePrice: Math.round(wholesaleTotal * 100) / 100,
      productCost: Math.round(product * 100) / 100,
    },
  };
}

/**
 * Calculate annual earnings projection based on growth assumptions
 */
export async function calculateAnnualProjection(params: {
  currentFollowers: number;
  currentConversionRate: number;
  monthlyGrowthRate?: number; // 0.05 = 5% monthly growth
  releasesPerCycle: number;
  artworksPerRelease: number;
  split?: number;
}) {
  const {
    currentFollowers,
    currentConversionRate,
    monthlyGrowthRate = 0.05,
    releasesPerCycle,
    artworksPerRelease,
    split = 0.9,
  } = params;

  const monthlyEarnings: Array<{
    month: number;
    followers: number;
    subscribers: number;
    realistic: number;
  }> = [];
  let followers = currentFollowers;

  for (let month = 0; month < 12; month++) {
    const estimate = await calculateEstimatedEarnings({
      followerCount: followers,
      conversionRate: currentConversionRate,
      releasesPerCycle,
      artworksPerRelease,
      split,
    });

    monthlyEarnings.push({
      month: month + 1,
      followers: Math.round(followers),
      subscribers: estimate.subscribers,
      realistic: estimate.earnings.realistic,
    });

    // Apply growth for next month
    followers *= 1 + monthlyGrowthRate;
  }

  const totalRealistic = monthlyEarnings.reduce(
    (sum, m) => sum + m.realistic,
    0,
  );

  return {
    monthlyEarnings,
    annualTotal: Math.round(totalRealistic * 100) / 100,
    finalFollowers: Math.round(followers),
  };
}

/**
 * Compare different split scenarios side-by-side
 */
export async function compareSplitScenarios(params: {
  followerCount: number;
  conversionRate: number;
  releasesPerCycle: number;
  artworksPerRelease: number;
  avgCreatorsPerBooklet?: number;
}) {
  const { avgCreatorsPerBooklet = 3, ...baseParams } = params;

  const splits = [0.7, 0.8, 0.85, 0.9, 0.95];
  const scenarios: Array<{
    split: number;
    platformFee: number;
    earnings: {
      bestCase: number;
      realistic: number;
      worstCase: number;
    };
    breakdown: {
      marginPerBooklet: number;
      creatorPoolPerBooklet: number;
      platformFeePerBooklet: number;
      pageShare: number;
      split: number;
      retailPrice: number;
      wholesalePrice: number;
      productCost: number;
    };
  }> = [];

  for (const split of splits) {
    const estimate = await calculateEstimatedEarnings({
      ...baseParams,
      avgCreatorsPerBooklet,
      split,
    });

    scenarios.push({
      split: Math.round(split * 100),
      platformFee: Math.round((1 - split) * 100),
      earnings: estimate.earnings,
      breakdown: estimate.breakdown,
    });
  }

  return {
    subscribers: scenarios[0]?.earnings.bestCase
      ? Math.floor(
          scenarios[0].earnings.bestCase /
            scenarios[0].breakdown.creatorPoolPerBooklet,
        )
      : 0,
    scenarios,
  };
}

/**
 * Calculate minimum followers needed to reach target monthly income
 */
export async function calculateRequiredFollowers(params: {
  targetMonthlyIncome: number; // e.g. 500 for €500/month
  conversionRate: number;
  releasesPerCycle: number;
  artworksPerRelease: number;
  avgCreatorsPerBooklet?: number;
  split?: number;
}): Promise<{
  requiredFollowers: number;
  requiredSubscribers: number;
  earningsAtTarget: {
    bestCase: number;
    realistic: number;
    worstCase: number;
  };
}> {
  const {
    targetMonthlyIncome,
    conversionRate,
    releasesPerCycle,
    artworksPerRelease,
    avgCreatorsPerBooklet = 3,
    split = 0.9,
  } = params;

  // Binary search to find required followers
  let low = 100;
  let high = 1000000;
  let result = {
    requiredFollowers: 0,
    requiredSubscribers: 0,
    earningsAtTarget: { bestCase: 0, realistic: 0, worstCase: 0 },
  };

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const estimate = await calculateEstimatedEarnings({
      followerCount: mid,
      conversionRate,
      releasesPerCycle,
      artworksPerRelease,
      avgCreatorsPerBooklet,
      split,
    });

    if (estimate.earnings.realistic >= targetMonthlyIncome) {
      result = {
        requiredFollowers: mid,
        requiredSubscribers: estimate.subscribers,
        earningsAtTarget: estimate.earnings,
      };
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return result;
}
