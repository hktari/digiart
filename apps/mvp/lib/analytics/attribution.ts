import type { EntryPageType } from "@prisma/client";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getOrCreateAnonymousId } from "./identity";

export type AttributionData = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrerUrl: string | null;
  landingPath: string;
  creatorProfileId: string | null;
  entryPageType: EntryPageType;
};

/**
 * Parse UTM parameters and referrer from URL search params and headers.
 */
export async function parseAttributionFromRequest(
  searchParams: URLSearchParams,
  pathname: string,
): Promise<AttributionData> {
  const headersList = await headers();
  const referrer = headersList.get("referer") ?? headersList.get("referrer");

  // Determine entry page type
  let entryPageType: EntryPageType = "OTHER";
  if (pathname === "/") {
    entryPageType = "HOME";
  } else if (pathname.startsWith("/creators/")) {
    entryPageType = "CREATOR_PAGE";
  } else if (pathname.startsWith("/browse")) {
    entryPageType = "BROWSE";
  }

  // Extract creator slug from pathname if on creator page
  let creatorProfileId: string | null = null;
  if (pathname.startsWith("/creators/")) {
    const slug = pathname.split("/")[2];
    if (slug) {
      // Will be resolved to ID when storing
      creatorProfileId = slug;
    }
  }

  // Also check ref_creator param
  const refCreator = searchParams.get("ref_creator");
  if (refCreator) {
    creatorProfileId = refCreator;
  }

  return {
    utmSource: searchParams.get("utm_source"),
    utmMedium: searchParams.get("utm_medium"),
    utmCampaign: searchParams.get("utm_campaign"),
    utmContent: searchParams.get("utm_content"),
    utmTerm: searchParams.get("utm_term"),
    referrerUrl: referrer,
    landingPath: pathname,
    creatorProfileId,
    entryPageType,
  };
}

/**
 * Store or update an attribution session for the current anonymous user.
 * This captures first-touch and last-touch data.
 */
export async function captureAttribution(
  searchParams: URLSearchParams,
  pathname: string,
): Promise<void> {
  const anonymousId = await getOrCreateAnonymousId();
  const attribution = await parseAttributionFromRequest(searchParams, pathname);

  // Resolve creator slug to ID if needed
  let resolvedCreatorId: string | null = null;
  if (attribution.creatorProfileId) {
    const creator = await db.creatorProfile.findUnique({
      where: { slug: attribution.creatorProfileId },
      select: { id: true },
    });
    if (creator) {
      resolvedCreatorId = creator.id;
    }
  }

  // Upsert attribution session
  await db.attributionSession.upsert({
    where: { anonymousId },
    create: {
      anonymousId,
      firstPath: attribution.landingPath,
      lastPath: attribution.landingPath,
      referrerUrl: attribution.referrerUrl,
      utmSource: attribution.utmSource,
      utmMedium: attribution.utmMedium,
      utmCampaign: attribution.utmCampaign,
      utmContent: attribution.utmContent,
      utmTerm: attribution.utmTerm,
      creatorProfileId: resolvedCreatorId,
      entryPageType: attribution.entryPageType,
    },
    update: {
      lastPath: attribution.landingPath,
      referrerUrl: attribution.referrerUrl ?? undefined,
      utmSource: attribution.utmSource ?? undefined,
      utmMedium: attribution.utmMedium ?? undefined,
      utmCampaign: attribution.utmCampaign ?? undefined,
      utmContent: attribution.utmContent ?? undefined,
      utmTerm: attribution.utmTerm ?? undefined,
      creatorProfileId: resolvedCreatorId ?? undefined,
    },
  });
}

/**
 * Link an attribution session to a lead after signup.
 */
export async function linkAttributionToLead(
  anonymousId: string,
  leadId: string,
): Promise<void> {
  await db.attributionSession.updateMany({
    where: { anonymousId },
    data: { leadId },
  });
}

/**
 * Get attribution data for an anonymous session.
 */
export async function getAttributionForAnonymousId(
  anonymousId: string,
): Promise<AttributionData | null> {
  const session = await db.attributionSession.findUnique({
    where: { anonymousId },
  });

  if (!session) return null;

  return {
    utmSource: session.utmSource,
    utmMedium: session.utmMedium,
    utmCampaign: session.utmCampaign,
    utmContent: session.utmContent,
    utmTerm: session.utmTerm,
    referrerUrl: session.referrerUrl,
    landingPath: session.firstPath,
    creatorProfileId: session.creatorProfileId,
    entryPageType: session.entryPageType,
  };
}
