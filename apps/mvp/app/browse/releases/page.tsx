<<<<<<< /home/bostjan/source/projects/art-subscription-platform/apps/mvp/app/browse/releases/page.tsx

import { getPublishedReleases } from "@/lib/actions/browse";
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
=======
import Link from "next/link";
import Image from "next/image";
import { getAllPublishedReleases, getAllTags } from "@/lib/actions/browse";

type Props = {
  searchParams: Promise<{ tag?: string }>;
};

export default async function BrowseReleasesPage({ searchParams }: Props) {
  const { tag } = await searchParams;
  const [releases, tags] = await Promise.all([
    getAllPublishedReleases(tag),
    getAllTags(),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">
            Browse Releases
          </h1>
          <p className="mt-2 text-neutral-600">
            Explore monthly art releases from creators
          </p>
        </div>

        {tags.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/browse/releases"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  !tag
                    ? "bg-fuchsia-600 text-white"
                    : "bg-white text-neutral-700 border border-neutral-200 hover:border-fuchsia-300"
                }`}
              >
                All
              </Link>
              {tags.map((t) => (
                <Link
                  key={t.slug}
                  href={`/browse/releases?tag=${t.slug}`}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    tag === t.slug
                      ? "bg-fuchsia-600 text-white"
                      : "bg-white text-neutral-700 border border-neutral-200 hover:border-fuchsia-300"
                  }`}
                >
                  {t.name} ({t._count.releaseTags})
                </Link>
              ))}
            </div>
          </div>
        )}

        {releases.length === 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-ocean-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-ocean-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-neutral-900">
                No releases found
              </h2>
              <p className="text-neutral-600">
                {tag
                  ? "Try selecting a different tag or view all releases"
                  : "Check back soon for new releases"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {releases.map((release) => {
              const coverArtwork = release.artworks[0]?.artwork;

              return (
                <div
                  key={release.id}
                  className="bg-white rounded-lg border border-neutral-200 overflow-hidden hover:border-fuchsia-300 hover:shadow-md transition-all"
                >
                  {coverArtwork && (
                    <div className="relative aspect-[4/3] bg-neutral-100">
                      <Image
                        src={`/api/storage/${coverArtwork.storageKey}`}
                        alt={coverArtwork.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-neutral-900 line-clamp-1">
                        {release.title}
                      </h3>
                      <Link
                        href={`/creators/${release.creatorProfile.slug}`}
                        className="text-sm text-neutral-600 hover:text-fuchsia-600"
                      >
                        by {release.creatorProfile.displayName}
                      </Link>
                    </div>

                    {release.description && (
                      <p className="text-sm text-neutral-600 line-clamp-2">
                        {release.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>
                        {release._count.artworks}{" "}
                        {release._count.artworks === 1 ? "artwork" : "artworks"}
                      </span>
                    </div>

                    {release.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {release.tags.slice(0, 3).map((rt) => (
                          <span
                            key={rt.tag.slug}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-beige-100 text-beige-800"
                          >
                            {rt.tag.name}
                          </span>
                        ))}
                        {release.tags.length > 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600">
                            +{release.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <Link
                      href={`/creators/${release.creatorProfile.slug}`}
                      className="block w-full text-center px-4 py-2 text-sm font-medium text-fuchsia-600 border border-fuchsia-600 rounded-md hover:bg-fuchsia-50 transition-colors"
                    >
                      View Creator
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
>>>>>>> /home/bostjan/.windsurf/worktrees/art-subscription-platform/art-subscription-platform-3533524b/apps/mvp/app/browse/releases/page.tsx
  );
}
