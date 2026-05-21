import { LeadScraperOrchestrator } from "./graph/orchestrator.js";
import { loadConfig, SUBREDDITS } from "./utils/config.js";

async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes("--test");
  const dailyMode = args.includes("--daily");

  if (!testMode && !dailyMode) {
    console.log("Usage:");
    console.log("  npm run scrape:test   # Test mode (10 posts per subreddit)");
    console.log(
      "  npm run scrape        # Daily mode (50 posts per subreddit)",
    );
    process.exit(1);
  }

  console.log("🚀 Lead Scraper Starting...");
  console.log(`Mode: ${testMode ? "TEST" : "DAILY"}`);
  console.log(`Subreddits: ${SUBREDDITS.join(", ")}`);
  console.log("");

  const config = loadConfig();

  const orchestrator = new LeadScraperOrchestrator(
    config.FIREWORKS_API_KEY,
    config.TELEGRAM_BOT_TOKEN,
    config.TELEGRAM_CHAT_ID,
  );

  try {
    const result = await orchestrator.run(SUBREDDITS, testMode);

    console.log("");
    console.log("✅ Lead scraping completed!");
    console.log(`📊 Stats:`);
    console.log(`   Total Posts: ${result.stats.totalPosts}`);
    console.log(`   Filtered: ${result.stats.filteredPosts}`);
    console.log(`   Qualified: ${result.stats.qualifiedLeads}`);
    console.log(`   Hot Leads: ${result.stats.hotLeads}`);
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`);
    }
  } catch (error) {
    console.error("❌ Error during scraping:", error);
    process.exit(1);
  }
}

main();
