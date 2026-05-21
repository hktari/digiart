import { PrismaClient } from "@prisma/client";
import type { QualifiedPost } from "../qualifiers/llm-qualifier.js";

export interface ScrapingRunStats {
  totalPosts: number;
  filteredPosts: number;
  qualifiedLeads: number;
  hotLeads: number;
  errors: string[];
}

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async startScrapingRun(): Promise<string> {
    const run = await this.prisma.scrapingRun.create({
      data: {
        status: "running",
      },
    });
    return run.id;
  }

  async completeScrapingRun(
    runId: string,
    stats: ScrapingRunStats,
  ): Promise<void> {
    await this.prisma.scrapingRun.update({
      where: { id: runId },
      data: {
        status: "completed",
        completedAt: new Date(),
        totalPosts: stats.totalPosts,
        filteredPosts: stats.filteredPosts,
        qualifiedLeads: stats.qualifiedLeads,
        hotLeads: stats.hotLeads,
        errors: stats.errors.length > 0 ? stats.errors : undefined,
      },
    });
  }

  async failScrapingRun(runId: string, errors: string[]): Promise<void> {
    await this.prisma.scrapingRun.update({
      where: { id: runId },
      data: {
        status: "failed",
        completedAt: new Date(),
        errors,
      },
    });
  }

  async saveLead(runId: string, post: QualifiedPost): Promise<string> {
    // Check if lead already exists
    const existing = await this.prisma.lead.findUnique({
      where: { postId: post.id },
    });

    if (existing) {
      // Update existing lead
      await this.prisma.lead.update({
        where: { id: existing.id },
        data: {
          passedFilter: post.filterResult.passed,
          matchedKeywords: post.filterResult.matches.map((m) => m.keyword),
          qualified: !!post.qualification,
          qualifiedAt: post.qualification ? new Date() : null,
          score: post.qualification?.score || null,
          reasoning: post.qualification?.reasoning || null,
          isHotLead: post.qualification?.isHotLead || false,
        },
      });

      // Delete old pain points and create new ones
      if (post.qualification?.painPoints) {
        await this.prisma.painPoint.deleteMany({
          where: { leadId: existing.id },
        });

        await this.prisma.painPoint.createMany({
          data: post.qualification.painPoints.map((pp) => ({
            leadId: existing.id,
            category: pp.category,
            description: pp.description,
            severity: pp.severity,
          })),
        });
      }

      return existing.id;
    }

    // Create new lead
    const lead = await this.prisma.lead.create({
      data: {
        postId: post.id,
        postUrl: post.url,
        subreddit: post.subreddit,
        title: post.title,
        content: post.content,
        author: post.author,
        publishedAt: post.publishedAt,
        passedFilter: post.filterResult.passed,
        matchedKeywords: post.filterResult.matches.map((m) => m.keyword),
        qualified: !!post.qualification,
        qualifiedAt: post.qualification ? new Date() : null,
        score: post.qualification?.score || null,
        reasoning: post.qualification?.reasoning || null,
        isHotLead: post.qualification?.isHotLead || false,
        scrapingRunId: runId,
        painPoints: post.qualification?.painPoints
          ? {
              create: post.qualification.painPoints.map((pp) => ({
                category: pp.category,
                description: pp.description,
                severity: pp.severity,
              })),
            }
          : undefined,
      },
    });

    return lead.id;
  }

  async saveLeads(runId: string, posts: QualifiedPost[]): Promise<string[]> {
    const leadIds: string[] = [];

    for (const post of posts) {
      try {
        const leadId = await this.saveLead(runId, post);
        leadIds.push(leadId);
      } catch (error) {
        console.error(`Failed to save lead ${post.id}:`, error);
      }
    }

    return leadIds;
  }

  async getExistingPostIds(postIds: string[]): Promise<Set<string>> {
    if (postIds.length === 0) {
      return new Set();
    }

    const leads = await this.prisma.lead.findMany({
      where: { postId: { in: postIds } },
      select: { postId: true },
    });

    return new Set(leads.map((l) => l.postId));
  }

  async markLeadNotified(leadId: string): Promise<void> {
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { notifiedAt: new Date() },
    });
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
