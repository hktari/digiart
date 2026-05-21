import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DatabaseService } from "../src/database/database-service.js";
import type { QualifiedPost } from "../src/qualifiers/llm-qualifier.js";

describe("DatabaseService", () => {
  let db: DatabaseService;
  let runId: string;

  beforeAll(async () => {
    db = new DatabaseService();
    runId = await db.startScrapingRun();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  const createMockQualifiedPost = (
    id: string,
    title: string,
  ): QualifiedPost => ({
    id,
    url: `https://reddit.com/r/test/comments/${id}/test/`,
    title,
    content: "Test content",
    author: "testuser",
    subreddit: "test",
    publishedAt: new Date(),
    filterResult: {
      passed: true,
      matches: [{ keyword: "monetize", category: "monetization", weight: 3 }],
      totalScore: 3,
    },
    qualification: {
      score: 75,
      reasoning: "Test reasoning",
      isHotLead: false,
      painPoints: [
        {
          category: "monetization",
          description: "Needs monetization help",
          severity: "medium",
        },
      ],
    },
  });

  describe("getExistingPostIds", () => {
    it("should return empty set for empty input", async () => {
      const result = await db.getExistingPostIds([]);
      expect(result.size).toBe(0);
    });

    it("should return empty set when no posts exist", async () => {
      const result = await db.getExistingPostIds([
        "nonexistent1",
        "nonexistent2",
      ]);
      expect(result.size).toBe(0);
    });

    it("should return existing post IDs", async () => {
      // Create some test leads
      const post1 = createMockQualifiedPost("testpost1", "Test Post 1");
      const post2 = createMockQualifiedPost("testpost2", "Test Post 2");
      const post3 = createMockQualifiedPost("testpost3", "Test Post 3");

      await db.saveLead(runId, post1);
      await db.saveLead(runId, post2);
      await db.saveLead(runId, post3);

      // Query for 5 IDs (3 exist, 2 new)
      const result = await db.getExistingPostIds([
        "testpost1",
        "testpost2",
        "testpost3",
        "newpost1",
        "newpost2",
      ]);

      expect(result.size).toBe(3);
      expect(result.has("testpost1")).toBe(true);
      expect(result.has("testpost2")).toBe(true);
      expect(result.has("testpost3")).toBe(true);
      expect(result.has("newpost1")).toBe(false);
      expect(result.has("newpost2")).toBe(false);
    });

    it(
      "should handle large batches efficiently",
      { timeout: 15000 },
      async () => {
        // Create 10 test leads
        const posts = Array.from({ length: 10 }, (_, i) =>
          createMockQualifiedPost(`batchtest${i}`, `Batch Test ${i}`),
        );

        for (const post of posts) {
          await db.saveLead(runId, post);
        }

        // Query for 20 IDs (10 exist, 10 new)
        const postIds = [
          ...posts.map((p) => p.id),
          ...Array.from({ length: 10 }, (_, i) => `newbatch${i}`),
        ];

        const startTime = Date.now();
        const result = await db.getExistingPostIds(postIds);
        const duration = Date.now() - startTime;

        expect(result.size).toBe(10);
        expect(duration).toBeLessThan(1000); // Should be < 1 second

        // Verify correct IDs are returned
        for (const post of posts) {
          expect(result.has(post.id)).toBe(true);
        }

        for (let i = 0; i < 10; i++) {
          expect(result.has(`newbatch${i}`)).toBe(false);
        }
      },
    );
  });

  describe("saveLead deduplication", () => {
    it("should update existing lead on duplicate postId", async () => {
      const post1 = createMockQualifiedPost("duptest1", "Original Title");
      post1.qualification!.score = 50;

      // Save first time
      const leadId1 = await db.saveLead(runId, post1);

      // Update with new score
      const post2 = createMockQualifiedPost("duptest1", "Updated Title");
      post2.qualification!.score = 90;
      post2.qualification!.isHotLead = true;

      // Save again (should update)
      const leadId2 = await db.saveLead(runId, post2);

      // Should return same ID
      expect(leadId1).toBe(leadId2);
    });
  });
});
