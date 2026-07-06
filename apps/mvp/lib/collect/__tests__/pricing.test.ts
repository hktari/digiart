import { describe, expect, it } from "vitest";
import {
  creatorEarningsCents,
  EARNINGS_PER_COLLECT_CENTS,
  formatEur,
  magazinePriceCents,
} from "../pricing";

describe("magazinePriceCents", () => {
  it("is monotonic in item count", () => {
    expect(magazinePriceCents(1)).toBeLessThan(magazinePriceCents(2));
    expect(magazinePriceCents(5)).toBeLessThan(magazinePriceCents(10));
  });

  it("has a base price at zero pages", () => {
    expect(magazinePriceCents(0)).toBe(1200);
  });

  it("floors negatives to the base price", () => {
    expect(magazinePriceCents(-3)).toBe(1200);
  });
});

describe("creatorEarningsCents", () => {
  it("scales with distinct collectors", () => {
    expect(creatorEarningsCents(0)).toBe(0);
    expect(creatorEarningsCents(3)).toBe(3 * EARNINGS_PER_COLLECT_CENTS);
  });
});

describe("formatEur", () => {
  it("formats cents as EUR", () => {
    expect(formatEur(1800)).toBe("€18.00");
    expect(formatEur(0)).toBe("€0.00");
  });
});
