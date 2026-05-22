import type { RedditPost } from "../scrapers/rss-fetcher.js";

export type PainPointCategory =
  | "monetization"
  | "platform_fees"
  | "discovery"
  | "spam_bots"
  | "payment_issues"
  | "disclosure_requirements"
  | "print_physical"
  | "quality_curation";

export interface KeywordMatch {
  category: PainPointCategory;
  keyword: string;
  weight: number;
}

export interface FilterResult {
  passed: boolean;
  matches: KeywordMatch[];
  totalScore: number;
}

export interface FilteredPost extends RedditPost {
  filterResult: FilterResult;
}

interface CategoryKeywords {
  category: PainPointCategory;
  keywords: Array<{ term: string; weight: number }>;
}

export class KeywordFilter {
  private readonly painPointKeywords: CategoryKeywords[] = [
    {
      category: "monetization",
      keywords: [
        { term: "monetize", weight: 3 },
        { term: "make money", weight: 3 },
        { term: "earn", weight: 2 },
        { term: "income", weight: 2 },
        { term: "revenue", weight: 2 },
        { term: "sell", weight: 2 },
        { term: "profit", weight: 2 },
        { term: "commission", weight: 2 },
      ],
    },
    {
      category: "platform_fees",
      keywords: [
        { term: "fee", weight: 3 },
        { term: "commission rate", weight: 3 },
        { term: "take a cut", weight: 3 },
        { term: "percentage", weight: 2 },
        { term: "expensive", weight: 2 },
        { term: "cost", weight: 1 },
      ],
    },
    {
      category: "discovery",
      keywords: [
        { term: "visibility", weight: 3 },
        { term: "algorithm", weight: 3 },
        { term: "buried", weight: 3 },
        { term: "no views", weight: 3 },
        { term: "no one sees", weight: 3 },
        { term: "hidden", weight: 2 },
        { term: "shadowban", weight: 2 },
        { term: "promote", weight: 2 },
      ],
    },
    {
      category: "spam_bots",
      keywords: [
        { term: "spam", weight: 3 },
        { term: "bot", weight: 3 },
        { term: "scam", weight: 3 },
        { term: "fake account", weight: 3 },
        { term: "harassment", weight: 2 },
        { term: "stolen", weight: 2 },
        { term: "copycat", weight: 2 },
      ],
    },
    {
      category: "payment_issues",
      keywords: [
        { term: "payment", weight: 3 },
        { term: "payout", weight: 3 },
        { term: "withdraw", weight: 3 },
        { term: "stripe", weight: 2 },
        { term: "paypal", weight: 2 },
        { term: "transaction", weight: 2 },
        { term: "didn't receive", weight: 3 },
        { term: "pending", weight: 2 },
      ],
    },
    {
      category: "disclosure_requirements",
      keywords: [
        { term: "ai generated", weight: 3 },
        { term: "disclosure", weight: 3 },
        { term: "label", weight: 2 },
        { term: "watermark", weight: 2 },
        { term: "transparent", weight: 2 },
        { term: "declare", weight: 2 },
      ],
    },
    {
      category: "print_physical",
      keywords: [
        { term: "print", weight: 3 },
        { term: "physical", weight: 3 },
        { term: "poster", weight: 3 },
        { term: "canvas", weight: 3 },
        { term: "framed", weight: 2 },
        { term: "shipping", weight: 2 },
        { term: "tangible", weight: 2 },
        { term: "merchandise", weight: 2 },
        { term: "wall art", weight: 3 },
      ],
    },
    {
      category: "quality_curation",
      keywords: [
        { term: "too much content", weight: 3 },
        { term: "oversaturated", weight: 3 },
        { term: "low quality", weight: 3 },
        { term: "spam content", weight: 3 },
        { term: "quality control", weight: 3 },
        { term: "curated", weight: 2 },
        { term: "overwhelmed", weight: 2 },
        { term: "flooding", weight: 2 },
        { term: "diluted", weight: 2 },
      ],
    },
  ];

  private readonly minimumScore = 3; // Require at least one strong match or multiple weak matches

  filterPost(post: RedditPost): FilteredPost {
    const matches: KeywordMatch[] = [];
    const searchText = `${post.title} ${post.content}`.toLowerCase();

    for (const category of this.painPointKeywords) {
      for (const { term, weight } of category.keywords) {
        if (searchText.includes(term.toLowerCase())) {
          matches.push({
            category: category.category,
            keyword: term,
            weight,
          });
        }
      }
    }

    const totalScore = matches.reduce((sum, match) => sum + match.weight, 0);
    const passed = totalScore >= this.minimumScore;

    return {
      ...post,
      filterResult: {
        passed,
        matches,
        totalScore,
      },
    };
  }

  filterPosts(posts: RedditPost[]): FilteredPost[] {
    return posts.map((post) => this.filterPost(post));
  }

  getPassedPosts(posts: RedditPost[]): FilteredPost[] {
    return this.filterPosts(posts).filter((post) => post.filterResult.passed);
  }
}
