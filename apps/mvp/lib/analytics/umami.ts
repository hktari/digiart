import umami from "@umami/node";
import { logger } from "@/lib/logger";

/**
 * Umami server-side analytics client configuration.
 *
 * Environment variables required:
 * - NEXT_PUBLIC_UMAMI_WEBSITE_ID: Website ID for tracking
 * - UMAMI_HOST_URL: URL to your Umami instance (e.g., https://cloud.umami.is)
 */

let isInitialized = false;

function initUmami(): boolean {
  if (isInitialized) return true;

  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const hostUrl = process.env.UMAMI_HOST_URL || "https://cloud.umami.is";

  if (!websiteId) {
    logger.warn(
      "[analytics] Umami not configured. Set NEXT_PUBLIC_UMAMI_WEBSITE_ID.",
    );
    return false;
  }

  try {
    umami.init({
      websiteId,
      hostUrl,
    });
    isInitialized = true;
    return true;
  } catch (error) {
    logger.error("[analytics] Failed to initialize Umami:", error);
    return false;
  }
}

export type UmamiEventPayload = {
  hostname?: string;
  language?: string;
  referrer?: string;
  screen?: string;
  title?: string;
  url?: string;
  name?: string;
  data?: Record<string, string | number | boolean>;
};

/**
 * Track a server-side event with Umami.
 * Falls back gracefully if Umami is not configured.
 */
export async function trackUmamiEvent(
  eventName: string,
  payload?: Omit<UmamiEventPayload, "name">,
): Promise<void> {
  if (!initUmami()) return;

  try {
    await umami.track({
      name: eventName,
      ...payload,
    });
  } catch (error) {
    // Don't throw - analytics should not break the app
    logger.error("[analytics] Failed to track Umami event:", {
      eventName,
      error,
    });
  }
}

/**
 * Track a page view with Umami.
 */
export async function trackUmamiPageView(
  pathname: string,
  metadata?: { title?: string; referrer?: string },
): Promise<void> {
  if (!initUmami()) return;

  try {
    await umami.track({
      url: pathname,
      title: metadata?.title,
      referrer: metadata?.referrer,
    });
  } catch (error) {
    logger.error("[analytics] Failed to track Umami page view:", {
      pathname,
      error,
    });
  }
}

/**
 * Identify a user with Umami (for session tracking).
 * Note: Umami doesn't have explicit user identification,
 * but we can pass user_id in event data.
 */
export async function identifyUmamiUser(
  userId: string,
  traits?: Record<string, string | number | boolean>,
): Promise<void> {
  await trackUmamiEvent("user_identified", {
    data: { user_id: userId, ...traits },
  });
}
