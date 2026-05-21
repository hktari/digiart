#!/usr/bin/env tsx
import "dotenv/config";
import { TelegramNotifier } from "../src/notifiers/telegram-notifier.js";

async function testErrorNotification() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env");
    process.exit(1);
  }

  console.log("📲 Testing error notification...");

  const notifier = new TelegramNotifier(botToken, chatId);

  // Create a fake error
  const testError = new Error("This is a test error from the lead scraper");
  testError.stack = `Error: This is a test error from the lead scraper
    at testErrorNotification (/path/to/script.ts:15:20)
    at async main (/path/to/script.ts:5:3)`;

  try {
    await notifier.sendErrorAlert(
      testError,
      "Testing error notification system",
    );
    console.log("✅ Test error notification sent successfully!");
  } catch (error) {
    console.error("❌ Failed to send test notification:", error);
    process.exit(1);
  }
}

testErrorNotification();
