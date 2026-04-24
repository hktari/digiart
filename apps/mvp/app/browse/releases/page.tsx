import { getAllPublishedReleases, getAllTags } from "@/lib/actions/browse";
import { BrowseReleasesClient } from "./browse-releases-client";

export default async function BrowseReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ tags?: string }>;
}) {
  const params = await searchParams;
  const tagSlug = params.tags;

  const [tags, releases] = await Promise.all([
    getAllTags(),
    getAllPublishedReleases(tagSlug),
  ]);

  return (
    <BrowseReleasesClient
      initialTags={tags}
      initialReleases={releases}
      initialSelectedTags={tagSlug ? [tagSlug] : []}
    />
  );
}
