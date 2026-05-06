import {
  getAllPublishedCreators,
  getAllPublishedReleases,
  getAllTags,
} from "@/lib/actions/browse";
import { DiscoverClient } from "./discover-client";

type Props = {
  searchParams: Promise<{ tag?: string; view?: "creators" | "releases" }>;
};

export default async function DiscoverPage({ searchParams }: Props) {
  const { tag, view = "creators" } = await searchParams;
  const [creators, releases, tags] = await Promise.all([
    view === "creators" ? getAllPublishedCreators(tag) : [],
    view === "releases" ? getAllPublishedReleases(tag) : [],
    getAllTags(),
  ]);

  return (
    <DiscoverClient
      initialCreators={creators}
      initialReleases={releases}
      tags={tags}
      view={view}
      tag={tag}
    />
  );
}
