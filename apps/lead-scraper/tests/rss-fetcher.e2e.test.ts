import { beforeAll, describe, expect, it } from "vitest";
import { RedditRSSFetcher } from "../src/scrapers/rss-fetcher.js";

describe("RedditRSSFetcher E2E", () => {
  let fetcher: RedditRSSFetcher;

  beforeAll(() => {
    fetcher = new RedditRSSFetcher();
  });

  it("should fetch posts from r/aiArt", async () => {
    const result = await fetcher.fetchSubreddit("aiArt", 10);

    expect(result.subreddit).toBe("aiArt");
    expect(result.error).toBeUndefined();
    expect(result.posts.length).toBeGreaterThan(0);
    expect(result.posts.length).toBeLessThanOrEqual(10);

    const firstPost = result.posts[0];
    expect(firstPost.id).toBeTruthy();
    expect(firstPost.url).toMatch(/^https:\/\/www\.reddit\.com/);
    expect(firstPost.title).toBeTruthy();
    expect(firstPost.author).toBeTruthy();
    expect(firstPost.publishedAt).toBeInstanceOf(Date);
  }, 15000);

  it("should fetch posts from multiple subreddits in parallel", async () => {
    const subreddits = ["midjourney", "StableDiffusion"];
    const results = await fetcher.fetchMultipleSubreddits(subreddits, 5);

    expect(results.length).toBe(2);

    for (const result of results) {
      expect(subreddits).toContain(result.subreddit);
      expect(result.posts.length).toBeGreaterThan(0);
    }
  }, 20000);

  it("should handle invalid subreddit gracefully", async () => {
    const result = await fetcher.fetchSubreddit(
      "this_subreddit_definitely_does_not_exist_12345",
      10,
    );

    expect(result.subreddit).toBe(
      "this_subreddit_definitely_does_not_exist_12345",
    );
    expect(result.posts.length).toBe(0);
    expect(result.error).toBeTruthy();
  }, 15000);
});
