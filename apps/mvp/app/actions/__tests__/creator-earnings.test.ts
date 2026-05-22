import { describe, expect, it } from "vitest";
import {
  calculateAnnualProjection,
  calculateEstimatedEarnings,
  calculateRequiredFollowers,
  compareSplitScenarios,
} from "../creator-earnings";

describe("Creator Earnings Calculator", () => {
  describe("calculateEstimatedEarnings", () => {
    it("should calculate earnings for the scenario in the problem statement", async () => {
      // 5k followers, 5% conversion, 3 releases × 10 artworks, 90/10 split
      const result = await calculateEstimatedEarnings({
        followerCount: 5000,
        conversionRate: 0.05,
        releasesPerCycle: 3,
        artworksPerRelease: 10,
        avgCreatorsPerBooklet: 3,
        split: 0.9,
      });

      expect(result.subscribers).toBe(250);
      expect(result.creatorPages).toBe(30);
      expect(result.avgBookletPages).toBe(90);

      // Best case (solo booklet): 250 × €4.439 = €1109.70
      expect(result.earnings.bestCase).toBeCloseTo(1109.7, 1);

      // Realistic (3 creators): €1109.70 × (30/90) = €369.90
      expect(result.earnings.realistic).toBeCloseTo(369.9, 1);

      // Breakdown
      expect(result.breakdown.marginPerBooklet).toBeCloseTo(4.93, 2);
      expect(result.breakdown.creatorPoolPerBooklet).toBeCloseTo(4.44, 2);
      expect(result.breakdown.platformFeePerBooklet).toBeCloseTo(0.49, 2);
      expect(result.breakdown.split).toBe(90);
      expect(result.breakdown.pageShare).toBeCloseTo(33.3, 1);
    });

    it("should calculate earnings with 70/30 split (old model)", async () => {
      const result = await calculateEstimatedEarnings({
        followerCount: 5000,
        conversionRate: 0.05,
        releasesPerCycle: 3,
        artworksPerRelease: 10,
        avgCreatorsPerBooklet: 3,
        split: 0.7,
      });

      expect(result.subscribers).toBe(250);

      // Best case: 250 × €3.452 = €863.10
      expect(result.earnings.bestCase).toBeCloseTo(863.1, 1);

      // Realistic: €863.10 × (30/90) = €287.70
      expect(result.earnings.realistic).toBeCloseTo(287.7, 1);

      expect(result.breakdown.creatorPoolPerBooklet).toBeCloseTo(3.45, 2);
      expect(result.breakdown.platformFeePerBooklet).toBeCloseTo(1.48, 2);
    });

    it("should calculate earnings with 85/15 split", async () => {
      const result = await calculateEstimatedEarnings({
        followerCount: 5000,
        conversionRate: 0.05,
        releasesPerCycle: 3,
        artworksPerRelease: 10,
        avgCreatorsPerBooklet: 3,
        split: 0.85,
      });

      expect(result.subscribers).toBe(250);

      // Best case: 250 × €4.192 = €1048.05
      expect(result.earnings.bestCase).toBeCloseTo(1048.05, 1);

      // Realistic: €1048.05 × (30/90) = €349.35
      expect(result.earnings.realistic).toBeCloseTo(349.35, 1);

      expect(result.breakdown.creatorPoolPerBooklet).toBeCloseTo(4.19, 2);
      expect(result.breakdown.platformFeePerBooklet).toBeCloseTo(0.74, 2);
    });

    it("should handle small creator scenario (500 followers, 3% conversion)", async () => {
      const result = await calculateEstimatedEarnings({
        followerCount: 500,
        conversionRate: 0.03,
        releasesPerCycle: 3,
        artworksPerRelease: 10,
        avgCreatorsPerBooklet: 3,
        split: 0.9,
      });

      expect(result.subscribers).toBe(15);
      expect(result.earnings.bestCase).toBeCloseTo(66.58, 1);
      expect(result.earnings.realistic).toBeCloseTo(22.19, 1);
    });

    it("should handle established creator scenario (20k followers, 7% conversion)", async () => {
      const result = await calculateEstimatedEarnings({
        followerCount: 20000,
        conversionRate: 0.07,
        releasesPerCycle: 3,
        artworksPerRelease: 10,
        avgCreatorsPerBooklet: 3,
        split: 0.9,
      });

      expect(result.subscribers).toBe(1400);
      expect(result.earnings.bestCase).toBeCloseTo(6214.32, 1);
      expect(result.earnings.realistic).toBeCloseTo(2071.44, 1);
    });

    it("should handle best case (only creator in booklet)", async () => {
      const result = await calculateEstimatedEarnings({
        followerCount: 1000,
        conversionRate: 0.05,
        releasesPerCycle: 3,
        artworksPerRelease: 10,
        avgCreatorsPerBooklet: 1, // Solo booklet
        split: 0.9,
      });

      expect(result.subscribers).toBe(50);
      expect(result.earnings.bestCase).toBe(result.earnings.realistic);
    });

    it("should handle worst case (5 creators per booklet)", async () => {
      const result = await calculateEstimatedEarnings({
        followerCount: 5000,
        conversionRate: 0.05,
        releasesPerCycle: 3,
        artworksPerRelease: 10,
        avgCreatorsPerBooklet: 3,
        split: 0.9,
      });

      expect(result.subscribers).toBe(250);
      // Worst case: 250 × €6.771 × (30/150) = €338.58
      expect(result.earnings.worstCase).toBeCloseTo(338.58, 1);
    });
  });

  describe("calculateAnnualProjection", () => {
    it("should project annual earnings with 5% monthly growth", async () => {
      const result = await calculateAnnualProjection({
        currentFollowers: 1000,
        currentConversionRate: 0.05,
        monthlyGrowthRate: 0.05,
        releasesPerCycle: 3,
        artworksPerRelease: 10,
        split: 0.9,
      });

      expect(result.monthlyEarnings).toHaveLength(12);
      expect(result.monthlyEarnings[0].followers).toBe(1000);
      expect(result.monthlyEarnings[11].followers).toBeGreaterThan(1000);
      expect(result.annualTotal).toBeGreaterThan(0);
    });

    it("should handle no growth scenario", async () => {
      const result = await calculateAnnualProjection({
        currentFollowers: 1000,
        currentConversionRate: 0.05,
        monthlyGrowthRate: 0,
        releasesPerCycle: 3,
        artworksPerRelease: 10,
        split: 0.9,
      });

      expect(result.monthlyEarnings[0].followers).toBe(
        result.monthlyEarnings[11].followers,
      );
      expect(result.monthlyEarnings[0].realistic).toBe(
        result.monthlyEarnings[11].realistic,
      );
    });
  });

  describe("compareSplitScenarios", () => {
    it("should compare all split scenarios", async () => {
      const result = await compareSplitScenarios({
        followerCount: 5000,
        conversionRate: 0.05,
        releasesPerCycle: 3,
        artworksPerRelease: 10,
        avgCreatorsPerBooklet: 3,
      });

      expect(result.scenarios).toHaveLength(5);
      expect(result.scenarios[0].split).toBe(70);
      expect(result.scenarios[4].split).toBe(95);

      // Higher splits should yield higher creator earnings
      expect(result.scenarios[4].earnings.realistic).toBeGreaterThan(
        result.scenarios[0].earnings.realistic,
      );

      // Lower splits should yield higher platform fees
      expect(
        result.scenarios[0].breakdown.platformFeePerBooklet,
      ).toBeGreaterThan(result.scenarios[4].breakdown.platformFeePerBooklet);
    });
  });

  describe("calculateRequiredFollowers", () => {
    it("should calculate followers needed for €500/month target", async () => {
      const result = await calculateRequiredFollowers({
        targetMonthlyIncome: 500,
        conversionRate: 0.05,
        releasesPerCycle: 3,
        artworksPerRelease: 10,
        avgCreatorsPerBooklet: 3,
        split: 0.9,
      });

      expect(result.requiredFollowers).toBeGreaterThan(0);
      expect(result.earningsAtTarget.realistic).toBeGreaterThanOrEqual(500);

      // Verify the calculation
      const verification = await calculateEstimatedEarnings({
        followerCount: result.requiredFollowers,
        conversionRate: 0.05,
        releasesPerCycle: 3,
        artworksPerRelease: 10,
        avgCreatorsPerBooklet: 3,
        split: 0.9,
      });

      expect(verification.earnings.realistic).toBeCloseTo(
        result.earningsAtTarget.realistic,
        2,
      );
    });

    it("should handle high income targets", async () => {
      const result = await calculateRequiredFollowers({
        targetMonthlyIncome: 2000,
        conversionRate: 0.05,
        releasesPerCycle: 3,
        artworksPerRelease: 10,
        avgCreatorsPerBooklet: 3,
        split: 0.9,
      });

      expect(result.requiredFollowers).toBeGreaterThan(10000);
      expect(result.earningsAtTarget.realistic).toBeGreaterThanOrEqual(2000);
    });
  });

  describe("edge cases", () => {
    it("should handle zero followers", async () => {
      const result = await calculateEstimatedEarnings({
        followerCount: 0,
        conversionRate: 0.05,
        releasesPerCycle: 3,
        artworksPerRelease: 10,
        split: 0.9,
      });

      expect(result.subscribers).toBe(0);
      expect(result.earnings.bestCase).toBe(0);
      expect(result.earnings.realistic).toBe(0);
    });

    it("should handle zero conversion rate", async () => {
      const result = await calculateEstimatedEarnings({
        followerCount: 5000,
        conversionRate: 0,
        releasesPerCycle: 3,
        artworksPerRelease: 10,
        split: 0.9,
      });

      expect(result.subscribers).toBe(0);
      expect(result.earnings.bestCase).toBe(0);
    });

    it("should handle single artwork per release", async () => {
      const result = await calculateEstimatedEarnings({
        followerCount: 5000,
        conversionRate: 0.05,
        releasesPerCycle: 1,
        artworksPerRelease: 1,
        split: 0.9,
      });

      expect(result.creatorPages).toBe(1);
      expect(result.subscribers).toBe(250);
    });

    it("should handle very high conversion rate", async () => {
      const result = await calculateEstimatedEarnings({
        followerCount: 1000,
        conversionRate: 0.5, // 50% conversion
        releasesPerCycle: 3,
        artworksPerRelease: 10,
        split: 0.9,
      });

      expect(result.subscribers).toBe(500);
      expect(result.earnings.bestCase).toBeGreaterThan(1000);
    });
  });
});
