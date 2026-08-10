#!/usr/bin/env tsx
/**
 * Local development entry point for the lead bot.
 *
 * The webhook needs a public HTTPS URL, which a laptop does not have, so this
 * drives the same bot over long polling instead.
 *
 * WARNING: never run this while the production webhook is registered.
 * Telegram refuses getUpdates when a webhook is set, and bot.start() deletes
 * it - which would silently break production until it is re-registered. Use
 * .env.dev with a separate test bot token.
 */
import { PrismaClient } from "@prisma/client";
import { createLeadBot } from "../src/bot/lead-bot.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}

const bot = createLeadBot({
  token,
  prisma: new PrismaClient(),
  fireworksApiKey: process.env.FIREWORKS_API_KEY ?? "",
});

console.log("Polling for callback queries — Ctrl-C to stop");
await bot.start({ allowed_updates: ["callback_query"] });
