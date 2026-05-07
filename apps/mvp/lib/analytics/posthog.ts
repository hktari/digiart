import { PostHog } from "posthog-node";
import { logger } from "@/lib/logger";

// PostHog Node.js SDK client for server-side analytics
let posthogClient: PostHog | null = null;

/**
 * Initialize and get the PostHog client singleton.
 * Configured for resilience: batching + error swallowing so that
 * PostHog rate limits or outages never affect API responses.
 */
function getPostHogClient(): PostHog | null {
  if (posthogClient) return posthogClient;

  // Disable PostHog in development
  if (process.env.NODE_ENV === "development") {
    return null;
  }

  const apiKey = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST || "https://eu.i.posthog.com";

  if (!apiKey) {
    logger.warn(
      "[analytics] PostHog not configured. Set POSTHOG_API_KEY env variable.",
    );
    return null;
  }

  try {
    // NOTE:revoew this config if deploying to Vercel serverless
    // https://posthog.com/docs/libraries/node#capturing-events
    posthogClient = new PostHog(apiKey, {
      host,
    });

    posthogClient.register({
      environment: process.env.NODE_ENV,
    });

    posthogClient.on("error", (err) => {
      logger.warn("[analytics] PostHog flush error (non-fatal)", {
        error: err,
      });
    });

    return posthogClient;
  } catch (error) {
    logger.error("[analytics] Failed to initialize PostHog:", error);
    return null;
  }
}

/**
 * Track an event in PostHog
 */
export async function trackPostHogEvent(
  distinctId: string,
  eventName: string,
  properties?: Record<string, string | number | boolean>,
): Promise<void> {
  const client = getPostHogClient();
  if (!client) return;

  try {
    client.capture({
      distinctId,
      event: eventName,
      properties: properties ?? {},
    });
  } catch (error) {
    // Don't throw - analytics should not break the app
    logger.error("[analytics] Failed to track PostHog event:", {
      eventName,
      error,
    });
  }
}

/**
 * Track a page view in PostHog
 */
export async function trackPostHogPageView(
  distinctId: string,
  pathname: string,
  metadata?: { title?: string; referrer?: string },
): Promise<void> {
  const client = getPostHogClient();
  if (!client) return;

  try {
    client.capture({
      distinctId,
      event: "$pageview",
      properties: {
        $current_url: pathname,
        $page_title: metadata?.title,
        $referrer: metadata?.referrer,
      },
    });
  } catch (error) {
    logger.error("[analytics] Failed to track PostHog page view:", {
      pathname,
      error,
    });
  }
}

/**
 * Identify a user in PostHog
 */
export async function identifyPostHogUser(
  distinctId: string,
  traits?: Record<string, string | number | boolean>,
): Promise<void> {
  const client = getPostHogClient();
  if (!client) return;

  try {
    client.identify({
      distinctId,
      properties: traits ?? {},
    });
  } catch (error) {
    logger.error("[analytics] Failed to identify PostHog user:", {
      distinctId,
      error,
    });
  }
}

/**
 * Create an alias between two distinct IDs
 * Useful for linking anonymous and authenticated users
 */
export async function aliasPostHogUser(
  distinctId: string,
  anonymousId: string,
): Promise<void> {
  const client = getPostHogClient();
  if (!client) return;

  try {
    client.alias({
      distinctId,
      alias: anonymousId,
    });
  } catch (error) {
    logger.error("[analytics] Failed to alias PostHog user:", {
      distinctId,
      anonymousId,
      error,
    });
  }
}

/**
 * Flush all pending events - call this before process exit.
 * Swallows errors so shutdown is never blocked by PostHog.
 */
export async function flushPostHog(): Promise<void> {
  if (posthogClient) {
    try {
      await posthogClient.shutdown();
    } catch (error) {
      logger.warn("[analytics] PostHog shutdown error (non-fatal)", { error });
    }
    posthogClient = null;
  }
}
