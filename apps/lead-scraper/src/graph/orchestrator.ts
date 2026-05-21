import { END, StateGraph } from "@langchain/langgraph";
import { DatabaseService } from "../database/database-service.js";
import { KeywordFilter } from "../filters/keyword-filter.js";
import { TelegramNotifier } from "../notifiers/telegram-notifier.js";
import { LLMQualifier } from "../qualifiers/llm-qualifier.js";
import { RedditRSSFetcher } from "../scrapers/rss-fetcher.js";
import { GraphState, type GraphStateType } from "./state.js";

export class LeadScraperOrchestrator {
  private fetcher: RedditRSSFetcher;
  private filter: KeywordFilter;
  private qualifier: LLMQualifier;
  private db: DatabaseService;
  private notifier: TelegramNotifier;

  constructor(
    fireworksApiKey: string,
    telegramBotToken: string,
    telegramChatId: string,
  ) {
    this.fetcher = new RedditRSSFetcher();
    this.filter = new KeywordFilter();
    this.qualifier = new LLMQualifier(fireworksApiKey);
    this.db = new DatabaseService();
    this.notifier = new TelegramNotifier(telegramBotToken, telegramChatId);
  }

  async scrapeNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    console.log(`📡 Scraping ${state.subreddits.length} subreddits...`);

    const results = await this.fetcher.fetchMultipleSubreddits(
      state.subreddits,
      state.testMode ? 10 : 50,
    );

    const allPosts = results.flatMap((r) => r.posts);
    const errors = results
      .filter((r) => r.error)
      .map((r) => `${r.subreddit}: ${r.error}`);

    console.log(`✓ Scraped ${allPosts.length} posts`);

    return {
      allPosts,
      errors,
    };
  }

  async filterNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    console.log(`🔍 Filtering ${state.allPosts.length} posts...`);

    const filteredPosts = this.filter.getPassedPosts(state.allPosts);

    console.log(
      `✓ ${filteredPosts.length} posts passed filter (${Math.round((filteredPosts.length / state.allPosts.length) * 100)}%)`,
    );

    return { filteredPosts };
  }

  async qualifyNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    console.log(
      `🤖 Qualifying ${state.filteredPosts.length} posts with LLM...`,
    );

    const qualifiedPosts = await this.qualifier.qualifyPosts(
      state.filteredPosts,
    );

    const successfulQualifications = qualifiedPosts.filter(
      (p) => p.qualification,
    );
    const failedQualifications = qualifiedPosts.filter(
      (p) => p.qualificationError,
    );

    const errors = failedQualifications.map(
      (p) => `Qualification failed for ${p.id}: ${p.qualificationError}`,
    );

    console.log(
      `✓ Qualified ${successfulQualifications.length} posts, ${failedQualifications.length} failures`,
    );

    return {
      qualifiedPosts,
      errors,
    };
  }

  async storeNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    console.log("💾 Storing leads in database...");

    const runId = await this.db.startScrapingRun();
    await this.db.saveLeads(runId, state.qualifiedPosts);

    const hotLeads = state.qualifiedPosts.filter(
      (p) => p.qualification?.isHotLead,
    ).length;
    const qualifiedLeads = state.qualifiedPosts.filter(
      (p) => p.qualification,
    ).length;

    const stats = {
      totalPosts: state.allPosts.length,
      filteredPosts: state.filteredPosts.length,
      qualifiedLeads,
      hotLeads,
    };

    await this.db.completeScrapingRun(runId, {
      ...stats,
      errors: state.errors,
    });

    console.log(`✓ Stored ${state.qualifiedPosts.length} leads`);

    return {
      scrapingRunId: runId,
      stats,
    };
  }

  async notifyNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    console.log("📲 Sending notifications...");

    // Send daily summary
    await this.notifier.sendDailySummary(state.qualifiedPosts, {
      ...state.stats,
      errors: state.errors.length,
    });

    // Send hot lead alerts
    const hotLeads = state.qualifiedPosts.filter(
      (p) => p.qualification?.isHotLead,
    );

    for (const lead of hotLeads) {
      await this.notifier.sendHotLeadAlert(lead);
    }

    console.log(`✓ Sent daily summary + ${hotLeads.length} hot lead alerts`);

    return {};
  }

  buildGraph() {
    const workflow = new StateGraph(GraphState)
      .addNode("scrape", this.scrapeNode.bind(this))
      .addNode("filter", this.filterNode.bind(this))
      .addNode("qualify", this.qualifyNode.bind(this))
      .addNode("store", this.storeNode.bind(this))
      .addNode("notify", this.notifyNode.bind(this))
      .addEdge("__start__", "scrape")
      .addEdge("scrape", "filter")
      .addEdge("filter", "qualify")
      .addEdge("qualify", "store")
      .addEdge("store", "notify")
      .addEdge("notify", END);

    return workflow.compile();
  }

  async run(subreddits: string[], testMode = false) {
    const graph = this.buildGraph();

    const result = await graph.invoke({
      subreddits,
      testMode,
      allPosts: [],
      filteredPosts: [],
      qualifiedPosts: [],
      errors: [],
      scrapingRunId: null,
      stats: {
        totalPosts: 0,
        filteredPosts: 0,
        qualifiedLeads: 0,
        hotLeads: 0,
      },
    });

    await this.db.disconnect();

    return result;
  }
}
