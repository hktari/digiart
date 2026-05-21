import { z } from "zod";

const ConfigSchema = z.object({
  DATABASE_URL: z.string().url(),
  FIREWORKS_API_KEY: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_CHAT_ID: z.string().min(1),
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
  "civitai",
  "aiArt",
];
