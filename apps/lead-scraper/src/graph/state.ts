import { Annotation } from "@langchain/langgraph";
import type { FilteredPost } from "../filters/keyword-filter.js";
import type { QualifiedPost } from "../qualifiers/llm-qualifier.js";
import type { RedditPost } from "../scrapers/rss-fetcher.js";

export const GraphState = Annotation.Root({
  // Configuration
  subreddits: Annotation<string[]>,
  testMode: Annotation<boolean>,

  // Data flow
  allPosts: Annotation<RedditPost[]>({
    // Replace instead of append - allows deduplicate node to filter the array
    reducer: (current, update) => update,
    default: () => [],
  }),
  filteredPosts: Annotation<FilteredPost[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  qualifiedPosts: Annotation<QualifiedPost[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  // Error tracking
  errors: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  // Database
  scrapingRunId: Annotation<string | null>,

  // Stats
  stats: Annotation<{
    totalPosts: number;
    filteredPosts: number;
    qualifiedLeads: number;
    hotLeads: number;
  }>,
});

export type GraphStateType = typeof GraphState.State;
