#!/usr/bin/env tsx
/**
 * Registers the Telegram webhook against a deployed lead-scraper-web.
 * Run once per environment (and again if the domain or secret changes).
 *
 * Usage: pnpm --filter lead-scraper telegram:webhook <https://host/telegram/webhook>
 */

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const url = process.argv[2];

if (!token || !secret || !url) {
  console.error(
    "Usage: TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... tsx scripts/set-telegram-webhook.ts <https://host/telegram/webhook>",
  );
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url,
    secret_token: secret,
    // Only callback queries matter; this keeps ordinary group chatter out.
    allowed_updates: ["callback_query"],
  }),
});

console.log(await res.json());
