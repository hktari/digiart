import { z } from "zod";

export const ConfigSchema = z.object({
  DATABASE_URL: z.string().url(),
  FIREWORKS_API_KEY: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_CHAT_ID: z.string().min(1),

  // Forum topic thread IDs. Optional: an unconfigured deploy posts to the
  // group's General topic rather than failing to boot.
  TELEGRAM_TOPIC_LEADS: z.coerce.number().int().positive().optional(),
  TELEGRAM_TOPIC_STATUS: z.coerce.number().int().positive().optional(),

  // Only lead-scraper-web needs this; the cron never serves the webhook.
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1).optional(),

  LEAD_CARD_MIN_SCORE: z.coerce.number().int().default(60),
  LEAD_CARD_DAILY_CAP: z.coerce.number().int().positive().default(10),

  DEBUG: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  try {
    return ConfigSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Configuration error:");
      for (const issue of error.issues) {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      }
      process.exit(1);
    }
    throw error;
  }
}

export const SUBREDDITS = [
  "midjourney",
  "StableDiffusion",
  "DeviantArt",
  "DigitalArt",
  "artbusiness",
  "civitai",
  "digitalminimalism",
  "SeaArtAI",
  "leonardoai",
  "Art",
  "ArtistLounge",
  "printondemand",
  "aiArt",
  "dalle2",
  // "DiscoDiffusion", // Removed: subreddit no longer exists (404)
  "starryai",
];

const comicBookSubReddits = [
  "aicomicmakers",
  "AiComicBookArt",
  "AIcomics",
  "ImageComics",
];
