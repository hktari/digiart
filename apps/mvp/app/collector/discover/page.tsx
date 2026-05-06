import { redirect } from "next/navigation";
import {
  getAllPublishedCreators,
  getAllPublishedReleases,
  getAllTags,
} from "@/lib/actions/browse";
import {
  getCollectorProfile,
  getCollectorReleaseSelections,
} from "@/lib/actions/collector";
import { getCurrentCycle } from "@/lib/actions/cycles";
import { auth } from "@/lib/auth";
import { CollectorDiscoverClient } from "./collector-discover-client";

type Props = {
  searchParams: Promise<{ tag?: string; view?: "creators" | "releases" }>;
};

export default async function CollectorDiscoverPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const collectorProfile = await getCollectorProfile(session.user.id);
  if (!collectorProfile) {
    redirect("/collector/setup");
  }

  const { tag, view = "creators" } = await searchParams;
  const [creators, releases, tags, currentCycle] = await Promise.all([
    view === "creators" ? getAllPublishedCreators(tag) : [],
    view === "releases" ? getAllPublishedReleases(tag) : [],
    getAllTags(),
    view === "releases" ? getCurrentCycle() : null,
  ]);

  const selectedReleaseIds =
    view === "releases" && currentCycle
      ? (
          await getCollectorReleaseSelections(session.user.id, currentCycle.id)
        ).map((selection) => selection.release.id)
      : [];

  return (
    <CollectorDiscoverClient
      initialCreators={creators}
      initialReleases={releases}
      tags={tags}
      view={view}
      tag={tag}
      cycleId={currentCycle?.id ?? null}
      initiallySelectedReleaseIds={selectedReleaseIds}
    />
  );
}
