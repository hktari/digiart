#!/usr/bin/env tsx

/**
 * Verify environment setup before running the scraper
 */

import { PrismaClient } from "@prisma/client";
import { loadConfig } from "../src/utils/config.js";

async function verify() {
  console.log("🔍 Verifying Lead Scraper Setup...\n");

  // Check config
  console.log("1. Checking environment variables...");
  try {
    const config = loadConfig();
    console.log("   ✓ DATABASE_URL: configured");
    console.log("   ✓ FIREWORKS_API_KEY: configured");
    console.log("   ✓ TELEGRAM_BOT_TOKEN: configured");
    console.log("   ✓ TELEGRAM_CHAT_ID: configured");
  } catch (error) {
    console.error("   ✗ Environment variables missing or invalid");
    console.error(error);
    process.exit(1);
  }

  // Check database connection
  console.log("\n2. Checking database connection...");
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log("   ✓ Database connection successful");

    // Check if tables exist
    const runCount = await prisma.scrapingRun.count();
    console.log(`   ✓ Database tables exist (${runCount} scraping runs)`);
  } catch (error) {
    console.error("   ✗ Database connection failed");
    console.error("   Run: npx prisma db push");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  // Check Fireworks AI
  console.log("\n3. Checking Fireworks AI connection...");
  try {
    const config = loadConfig();
    const response = await fetch(
      "https://api.fireworks.ai/inference/v1/models",
      {
        headers: {
          Authorization: `Bearer ${config.FIREWORKS_API_KEY}`,
        },
      },
    );

    if (response.ok) {
      console.log("   ✓ Fireworks AI API key valid");
    } else {
      console.error(`   ✗ Fireworks AI API returned ${response.status}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("   ✗ Failed to connect to Fireworks AI");
    console.error(error);
    process.exit(1);
  }

  // Check Telegram
  console.log("\n4. Checking Telegram bot...");
  try {
    const config = loadConfig();
    const response = await fetch(
      `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/getMe`,
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✓ Telegram bot connected: @${data.result.username}`);
    } else {
      console.error("   ✗ Telegram bot token invalid");
      process.exit(1);
    }
  } catch (error) {
    console.error("   ✗ Failed to connect to Telegram");
    console.error(error);
    process.exit(1);
  }

  console.log("\n✅ All checks passed! Ready to run lead scraper.");
  console.log("\nUsage:");
  console.log("  pnpm run scrape:test  # Test with 10 posts per subreddit");
  console.log("  pnpm run scrape       # Full run with 50 posts per subreddit");
}

verify();
