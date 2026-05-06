import {
  getAllPublishedCreators,
  getAllPublishedReleases,
  getAllTags,
} from "@/lib/actions/browse";
import { getCollectorProfile } from "@/lib/actions/collector";
import { getCurrentCycle } from "@/lib/actions/cycles";
import { auth } from "@/lib/auth";
import { BrowseClient } from "./browse-client";

type Props = {
  searchParams: Promise<{ tag?: string; view?: "creators" | "releases" }>;
};

export default async function BrowsePage({ searchParams }: Props) {
  const { tag, view = "creators" } = await searchParams;
  const session = await auth();

  const isAuthenticated = Boolean(session?.user?.id);
  const hasCollectorRole = session?.user?.roles?.includes("COLLECTOR") ?? false;

  const [creators, releases, tags, _collectorProfile, currentCycle] =
    await Promise.all([
      view === "creators" ? getAllPublishedCreators(tag) : [],
      view === "releases" ? getAllPublishedReleases(tag) : [],
      getAllTags(),
      isAuthenticated && hasCollectorRole && session?.user?.id
        ? getCollectorProfile(session.user.id)
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
