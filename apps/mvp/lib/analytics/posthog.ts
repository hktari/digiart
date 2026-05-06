import { PostHog } from "posthog-node";
import { logger } from "@/lib/logger";

// PostHog Node.js SDK client for server-side analytics
let posthogClient: PostHog | null = null;

/**
 * Initialize and get the PostHog client singleton
 */
function getPostHogClient(): PostHog | null {
  if (posthogClient) return posthogClient;

  const apiKey = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST || "https://us.i.posthog.com";

  if (!apiKey) {
    logger.warn(
      "[analytics] PostHog not configured. Set POSTHOG_API_KEY env variable.",
    );
    return null;
  }

  try {
    posthogClient = new PostHog(apiKey, {
      host,
      flushAt: 1, // Flush immediately for serverless environments
      flushInterval: 0, // Disable periodic flush
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
 * Flush all pending events - call this before process exit
 */
export async function flushPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown();
    posthogClient = null;
  }
}
