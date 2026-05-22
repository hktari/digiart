import { ChatFireworks } from "@langchain/community/chat_models/fireworks";
import { z } from "zod";
import type { FilteredPost } from "../filters/keyword-filter.js";

export const PainPointSchema = z.object({
  category: z.enum([
    "monetization",
    "platform_fees",
    "discovery",
    "spam_bots",
    "payment_issues",
    "disclosure_requirements",
    "print_physical",
    "quality_curation",
  ]),
  description: z.string().describe("Brief description of the pain point"),
  severity: z
    .enum(["low", "medium", "high"])
    .describe("How severe is this pain point"),
});

export const QualificationSchema = z.object({
  score: z.number().min(0).max(100).describe("Lead quality score from 0-100"),
  reasoning: z
    .string()
    .describe("Brief explanation of why this score was given"),
  painPoints: z
    .array(PainPointSchema)
    .describe("Identified pain points from the post"),
  isHotLead: z
    .boolean()
    .describe("Whether this is a hot lead requiring immediate attention"),
});

export type QualificationResult = z.infer<typeof QualificationSchema>;
export type PainPoint = z.infer<typeof PainPointSchema>;

export interface QualifiedPost extends FilteredPost {
  qualification?: QualificationResult;
  qualificationError?: string;
}

export class LLMQualifier {
  private model: ChatFireworks;

  constructor(
    apiKey: string,
    modelName = "accounts/fireworks/models/minimax-m2p5",
  ) {
    this.model = new ChatFireworks({
      model: modelName,
      temperature: 0.1,
      apiKey,
    });
  }

  async qualifyPost(post: FilteredPost): Promise<QualifiedPost> {
    try {
      const prompt = this.buildPrompt(post);

      const structuredModel =
        this.model.withStructuredOutput(QualificationSchema);
      const result = await structuredModel.invoke(prompt);

      return {
        ...post,
        qualification: result,
      };
    } catch (error) {
      return {
        ...post,
        qualificationError:
          error instanceof Error ? error.message : String(error),
      };
    }
  }

  async qualifyPosts(posts: FilteredPost[]): Promise<QualifiedPost[]> {
    // Process in parallel with rate limiting (max 5 concurrent)
    const results: QualifiedPost[] = [];
    const batchSize = 5;

    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((post) => this.qualifyPost(post)),
      );
      results.push(...batchResults);
    }

    return results;
  }

  private buildPrompt(post: FilteredPost): string {
    const matchedCategories = [
      ...new Set(post.filterResult.matches.map((m) => m.category)),
    ].join(", ");

    return `You are a lead qualification expert for a platform that helps AI artists monetize their work.

Analyze this Reddit post from r/${post.subreddit} and determine if the author is a potential customer.

POST TITLE: ${post.title}

POST CONTENT: ${post.content}

MATCHED PAIN POINT CATEGORIES: ${matchedCategories}

Our platform solves:
- **Monetization**: Fair revenue sharing for AI artists
- **Platform Fees**: Low commission rates (unlike traditional platforms)
- **Discovery**: Curated marketplace with quality control
- **Print/Physical**: Digital to physical art printing and shipping
- **Quality Curation**: Monthly upload limits ensure quality > quantity
- **Payment Issues**: Reliable payment processing
- **Disclosure**: Transparent AI art labeling

Evaluate this lead based on:
1. **Pain Intensity**: How much is this person struggling with these issues?
2. **Buying Intent**: Are they actively looking for solutions or just venting?
3. **Fit**: Would our platform solve their problem?
4. **Urgency**: Do they need a solution now or just discussing generally?

SCORING GUIDE:
- 80-100: Hot lead - Clear pain, actively seeking solutions, perfect fit
- 60-79: Warm lead - Real pain, might be interested if approached right
- 40-59: Cold lead - Mentions issues but not actively looking for solutions
- 0-39: Not a lead - Just discussing, no real pain point, or bad fit

Return a structured JSON response with:
- score (0-100)
- reasoning (1-2 sentences)
- painPoints (array of identified pain points with category, description, severity)
- isHotLead (true if score >= 80)`;
  }
}
