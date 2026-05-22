import type { Metadata } from "next";
import {
  getAllPublishedCreators,
  getAllPublishedReleases,
  getAllTags,
} from "@/lib/actions/browse";
import { getCollectorProfile } from "@/lib/actions/collector";
import { getCurrentCycle } from "@/lib/actions/cycles";
import { auth } from "@/lib/auth";
import { BrowseClient } from "./browse-client";

export const metadata: Metadata = {
  title: "Browse Digital Art Creators & Booklet Releases",
  description:
    "Explore digital art creators and curated booklet releases on DigiArt. Subscribe to your favourite artists and receive printed A5 art booklets delivered to your door monthly.",
  openGraph: {
    title: "Browse Digital Art Creators & Booklet Releases",
    description:
      "Explore digital art creators and curated booklet releases on DigiArt. Subscribe and receive printed art delivered monthly.",
    url: "https://app.digiart.btechhub.top/browse",
  },
};

type Props = {
  searchParams: Promise<{ tag?: string; view?: "creators" | "releases" }>;
};

export default async function BrowsePage({ searchParams }: Props) {
  const { tag, view = "releases" } = await searchParams;
  const session = await auth();

  const isAuthenticated = Boolean(session?.user?.id);
  const hasCollectorRole = session?.user?.roles?.includes("COLLECTOR") ?? false;

  const [creators, releases, tags, _collectorProfile, currentCycle] =
    await Promise.all([
      view === "creators" ? getAllPublishedCreators(tag) : [],
      view === "releases" ? getAllPublishedReleases(tag) : [],
      getAllTags(),
      isAuthenticated && hasCollectorRole && session?.user?.id
        ? getCollectorProfile(session.user.id, { allowPrefill: false })
        : null,
      hasCollectorRole ? getCurrentCycle() : null,
    ]);

  const cycleId = currentCycle?.id ?? null;

  return (
    <BrowseClient
      initialCreators={creators}
      initialReleases={releases}
      tags={tags}
      view={view}
      tag={tag}
      isAuthenticated={isAuthenticated}
      hasCollectorRole={hasCollectorRole}
      cycleId={cycleId}
    />
  );
}
