import type { LeadStatus, LeadType } from "@prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { type AttributionData, linkAttributionToLead } from "./attribution";
import { getAnonymousId } from "./identity";
import {
  aliasPostHogUser,
  identifyPostHogUser,
  trackPostHogEvent,
  trackPostHogPageView,
} from "./posthog";

/**
 * Event taxonomy matching the GTM strategy document.
 * These events track the full creator and collector funnels.
 */
export const AnalyticsEvents = {
  // Public traffic events
  PAGE_VIEW_HOME: "page_view_home",
  PAGE_VIEW_CREATOR: "page_view_creator",
  CTA_CLICK_SIGNUP: "cta_click_signup",
  CTA_CLICK_SUBSCRIBE_CREATOR: "cta_click_subscribe_creator",
  CTA_CLICK_BROWSE_RELEASES: "cta_click_browse_releases",

  // Auth and signup events
  AUTH_SIGNIN_STARTED: "auth_signin_started",
  AUTH_MAGIC_LINK_SENT: "auth_magic_link_sent",
  AUTH_COMPLETED: "auth_completed",
  ROLE_SELECTED_CREATOR: "role_selected_creator",
  ROLE_SELECTED_COLLECTOR: "role_selected_collector",

  // Collector activation events
  COLLECTOR_SETUP_STARTED: "collector_setup_started",
  COLLECTOR_SETUP_COMPLETED: "collector_setup_completed",
  CREATOR_SUBSCRIPTION_STARTED: "creator_subscription_started",
  CREATOR_SUBSCRIPTION_COMPLETED: "creator_subscription_completed",
  RELEASE_SELECTED: "release_selected",
  PRICING_VIEWED: "pricing_viewed",
  CHECKOUT_READY: "checkout_ready",
  CHECKOUT_COMPLETED: "checkout_completed",

  // Creator activation events
  CREATOR_SETUP_STARTED: "creator_setup_started",
  CREATOR_SETUP_COMPLETED: "creator_setup_completed",
  CREATOR_PROFILE_PUBLISHED: "creator_profile_published",
  RELEASE_CREATED: "release_created",
  CREATOR_RELEASE_PUBLISHED: "creator_release_published",
  CREATOR_SHARED_LINK_RECORDED: "creator_shared_link_recorded",

  // Outreach / CRM events
  LEAD_CREATED: "lead_created",
  LEAD_CONTACTED: "lead_contacted",
  LEAD_REPLIED: "lead_replied",
  LEAD_QUALIFIED: "lead_qualified",
  LEAD_DISQUALIFIED: "lead_disqualified",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

export type EventMetadata = Record<string, string | number | boolean>;

/**
 * Track an anonymous event (before user is authenticated).
 * Stores in database via AttributionSession and sends to PostHog.
 * Never throws — analytics failures must not affect API responses.
 */
export async function trackAnonymousEvent(
  eventName: AnalyticsEventName,
  metadata?: EventMetadata,
): Promise<void> {
  try {
    // Get anonymous ID for PostHog tracking
    const anonymousId = await getAnonymousId();

    // Send to PostHog using anonymous ID as distinct_id
    if (anonymousId) {
      void trackPostHogEvent(anonymousId, eventName, metadata);
    } else {
      return; // No anonymous ID, can't track
    }

    // Store in database via anonymous session

    // Get or create a lead for this anonymous user
    let lead = await db.lead.findFirst({
      where: {
        sessions: { some: { anonymousId } },
      },
    });

    if (!lead) {
      // Create a placeholder lead for this anonymous user
      lead = await db.lead.create({
        data: {
          type: "COLLECTOR", // Default assumption - will be updated on role selection
          status: "NEW",
        },
      });

      // Link attribution session to lead
      await linkAttributionToLead(anonymousId, lead.id);
    }

    // Log the event
    await db.leadEvent.create({
      data: {
        leadId: lead.id,
        eventName,
        metadata: metadata ?? {},
      },
    });
  } catch (error) {
    logger.error("[analytics] Failed to track anonymous event:", error, {
      eventName,
    });
  }
}

/**
 * Track an event for an authenticated user.
 * Links to their Lead record and sends to PostHog.
 */
export async function trackUserEvent(
  userId: string,
  eventName: AnalyticsEventName,
  metadata?: EventMetadata,
): Promise<void> {
  // Send to PostHog using user ID as distinct_id
  void trackPostHogEvent(userId, eventName, metadata);

  try {
    // Find or create lead for this user
    let lead = await db.lead.findUnique({
      where: { ownerUserId: userId },
    });

    if (!lead) {
      // Check if there's an anonymous session to link
      const anonymousId = await getAnonymousId();
      let attributionData: AttributionData | null = null;

      if (anonymousId) {
        const session = await db.attributionSession.findUnique({
          where: { anonymousId },
          include: { lead: true },
        });
        if (session?.lead) {
          lead = session.lead;
        }
        attributionData = {
          utmSource: session?.utmSource ?? null,
          utmMedium: session?.utmMedium ?? null,
          utmCampaign: session?.utmCampaign ?? null,
          utmContent: session?.utmContent ?? null,
          utmTerm: session?.utmTerm ?? null,
          referrerUrl: session?.referrerUrl ?? null,
          landingPath: session?.firstPath ?? "/",
          creatorProfileId: session?.creatorProfileId ?? null,
          entryPageType: session?.entryPageType ?? "OTHER",
        };
      }

      // Create new lead if none exists
      if (!lead) {
        lead = await db.lead.create({
          data: {
            type: "COLLECTOR", // Default, will be updated
            status: "SIGNED_UP",
            ownerUserId: userId,
            utmSource: attributionData?.utmSource,
            utmMedium: attributionData?.utmMedium,
            utmCampaign: attributionData?.utmCampaign,
            utmContent: attributionData?.utmContent,
            utmTerm: attributionData?.utmTerm,
            referrerUrl: attributionData?.referrerUrl,
            landingPath: attributionData?.landingPath,
            creatorProfileId: attributionData?.creatorProfileId,
          },
        });
      } else {
        // Update existing lead to link to user
        await db.lead.update({
          where: { id: lead.id },
          data: {
            ownerUserId: userId,
            status: "SIGNED_UP",
          },
        });
      }

      // Link attribution session if exists
      if (anonymousId) {
        await linkAttributionToLead(anonymousId, lead.id);
        // Alias anonymous ID to user ID in PostHog for identity merging
        void aliasPostHogUser(userId, anonymousId);
      }
    }

    // Identify user in PostHog with their properties
    void identifyPostHogUser(userId, {
      lead_id: lead.id,
      lead_type: lead.type,
      email: lead.email ?? "",
      ...metadata,
    });

    // Log the event
    await db.leadEvent.create({
      data: {
        leadId: lead.id,
        eventName,
        metadata: metadata ?? {},
      },
    });
  } catch (error) {
    logger.error("[analytics] Failed to track user event:", {
      userId,
      eventName,
      error,
    });
  }
}

/**
 * Track a page view event.
 * Sends to PostHog and optionally to database.
 */
export async function trackPageView(
  pathname: string,
  options?: {
    title?: string;
    referrer?: string;
    userId?: string;
    isAnonymous?: boolean;
  },
): Promise<void> {
  // Determine distinct ID for PostHog
  let distinctId: string | null = null;
  if (options?.userId) {
    distinctId = options.userId;
  } else if (options?.isAnonymous) {
    distinctId = await getAnonymousId();
  }

  // Send to PostHog if we have an ID
  if (distinctId) {
    void trackPostHogPageView(distinctId, pathname, {
      title: options?.title,
      referrer: options?.referrer,
    });
  }

  // Determine event name based on path
  let eventName: AnalyticsEventName = AnalyticsEvents.PAGE_VIEW_HOME;
  if (pathname.startsWith("/creators/")) {
    eventName = AnalyticsEvents.PAGE_VIEW_CREATOR;
  }

  // Track in database
  if (options?.userId) {
    await trackUserEvent(options.userId, eventName, { pathname });
  } else if (options?.isAnonymous) {
    await trackAnonymousEvent(eventName, { pathname });
  }
}

/**
 * Create a lead manually (for CRM/outreach tracking).
 * Use this when manually adding creator leads from outreach.
 */
export async function createLead(
  type: LeadType,
  data: {
    email?: string;
    source: string;
    campaign?: string;
    notes?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  },
): Promise<string> {
  const lead = await db.lead.create({
    data: {
      type,
      email: data.email,
      source: data.source,
      campaign: data.campaign,
      notes: data.notes,
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      status: "NEW",
    },
  });

  await db.leadEvent.create({
    data: {
      leadId: lead.id,
      eventName: AnalyticsEvents.LEAD_CREATED,
      metadata: { source: data.source, type },
    },
  });

  return lead.id;
}

/**
 * Update lead status (for CRM workflow).
 */
export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  metadata?: EventMetadata,
): Promise<void> {
  await db.lead.update({
    where: { id: leadId },
    data: {
      status,
      lastSeenAt: new Date(),
    },
  });

  const eventMap: Record<LeadStatus, AnalyticsEventName> = {
    NEW: AnalyticsEvents.LEAD_CREATED,
    CONTACTED: AnalyticsEvents.LEAD_CONTACTED,
    REPLIED: AnalyticsEvents.LEAD_REPLIED,
    QUALIFIED: AnalyticsEvents.LEAD_QUALIFIED,
    DISQUALIFIED: AnalyticsEvents.LEAD_DISQUALIFIED,
    SIGNED_UP: AnalyticsEvents.AUTH_COMPLETED,
    ACTIVATED: AnalyticsEvents.CREATOR_SETUP_COMPLETED,
  };

  await db.leadEvent.create({
    data: {
      leadId,
      eventName: eventMap[status],
      metadata: metadata ?? {},
    },
  });
}

/**
 * Get all events for a lead (for debugging/admin).
 */
export async function getLeadEvents(leadId: string) {
  return db.leadEvent.findMany({
    where: { leadId },
    orderBy: { occurredAt: "desc" },
  });
}
