import { getPublishedReleases } from "@/lib/actions/browse";
import { getAllTags } from "@/lib/actions/tags";
import { BrowseReleasesClient } from "./browse-releases-client";

export default async function BrowseReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ tags?: string }>;
}) {
  const params = await searchParams;
  const tagSlugs = params.tags ? params.tags.split(",") : [];

  const [tags, releases] = await Promise.all([
    getAllTags(),
    getPublishedReleases(tagSlugs.length > 0 ? tagSlugs : undefined),
  ]);

  return (
    <BrowseReleasesClient
      initialTags={tags}
      initialReleases={releases}
      initialSelectedTags={tagSlugs}
    />
  );
}
