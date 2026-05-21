import { describe, expect, it } from "vitest";
import { KeywordFilter } from "../src/filters/keyword-filter.js";
import type { RedditPost } from "../src/scrapers/rss-fetcher.js";

describe("KeywordFilter", () => {
  const filter = new KeywordFilter();

  const createMockPost = (title: string, content: string): RedditPost => ({
    id: "test123",
    url: "https://reddit.com/r/test/comments/test123",
    title,
    content,
    author: "testuser",
    subreddit: "test",
    publishedAt: new Date(),
  });

  it("should pass posts with high-weight monetization keywords", () => {
    const post = createMockPost(
      "How do I monetize my AI art?",
      "I've been creating AI art for months and want to start earning income.",
    );

    const result = filter.filterPost(post);

    expect(result.filterResult.passed).toBe(true);
    expect(result.filterResult.matches.length).toBeGreaterThan(0);
    expect(result.filterResult.totalScore).toBeGreaterThanOrEqual(3);
  });

  it("should pass posts about payment issues", () => {
    const post = createMockPost(
      "DeviantArt payment not received",
      "Just withdrew my earnings from DA to Stripe and there was no transaction",
    );

    const result = filter.filterPost(post);

    expect(result.filterResult.passed).toBe(true);
    expect(
      result.filterResult.matches.some((m) => m.category === "payment_issues"),
    ).toBe(true);
  });

  it("should fail posts with no pain point keywords", () => {
    const post = createMockPost(
      "Check out my new artwork!",
      "Here's a landscape I made with Midjourney today.",
    );

    const result = filter.filterPost(post);

    expect(result.filterResult.passed).toBe(false);
    expect(result.filterResult.totalScore).toBeLessThan(3);
  });

  it("should identify correct pain point categories", () => {
    const post = createMockPost(
      "Platform fees are too high",
      "I'm tired of these platforms taking 30% commission on my sales",
    );

    const result = filter.filterPost(post);

    expect(result.filterResult.passed).toBe(true);
    expect(
      result.filterResult.matches.some((m) => m.category === "platform_fees"),
    ).toBe(true);
  });

  it("should accumulate scores from multiple keywords", () => {
    const post = createMockPost(
      "Need help with monetization and platform fees",
      "How do I sell my AI art without high commission rates?",
    );

    const result = filter.filterPost(post);

    expect(result.filterResult.passed).toBe(true);
    expect(result.filterResult.totalScore).toBeGreaterThan(5); // Multiple keywords
    expect(result.filterResult.matches.length).toBeGreaterThanOrEqual(3);
  });
});
