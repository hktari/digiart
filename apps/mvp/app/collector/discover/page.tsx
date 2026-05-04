import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CollectorDiscoverReleasesGrid } from "@/components/collector-discover-releases-grid";
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
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Discover</h1>
          <p className="mt-2 text-neutral-600">
            Find more creators and releases to expand your booklet
          </p>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div className="flex gap-2">
            <Link
              href="/collector/discover?view=creators"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === "creators"
                  ? "bg-fuchsia-600 text-white"
                  : "bg-white text-neutral-700 border border-neutral-200 hover:border-fuchsia-300"
              }`}
            >
              Creators
            </Link>
            <Link
              href="/collector/discover?view=releases"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === "releases"
                  ? "bg-fuchsia-600 text-white"
                  : "bg-white text-neutral-700 border border-neutral-200 hover:border-fuchsia-300"
              }`}
            >
              Releases
            </Link>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/collector/discover?view=${view}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  !tag
                    ? "bg-ocean-600 text-white"
                    : "bg-white text-neutral-700 border border-neutral-200 hover:border-ocean-300"
                }`}
              >
                All
              </Link>
              {tags.map((t) => (
                <Link
                  key={t.slug}
                  href={`/collector/discover?view=${view}&tag=${t.slug}`}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    tag === t.slug
                      ? "bg-ocean-600 text-white"
                      : "bg-white text-neutral-700 border border-neutral-200 hover:border-ocean-300"
                  }`}
                >
                  {t.name} ({t._count.releaseTags})
                </Link>
              ))}
            </div>
          </div>
        )}

        {view === "creators" &&
          (creators.length === 0 ? (
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
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-neutral-900">
                  No creators found
                </h2>
                <p className="text-neutral-600">
                  {tag
                    ? "Try selecting a different tag or view all creators"
                    : "Check back soon for new creators"}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {creators.map((creator) => (
                <div
                  key={creator.id}
                  className="bg-white rounded-lg border border-neutral-200 p-6 hover:border-fuchsia-300 hover:shadow-md transition-all"
                >
                  <Link
                    href={`/creators/${creator.slug}`}
                    className="flex items-start gap-4"
                  >
                    {creator.avatar ? (
                      <Image
                        src={creator.avatar}
                        alt={creator.displayName}
                        width={64}
                        height={64}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-fuchsia-100 to-ocean-100 flex items-center justify-center">
                        <span className="text-2xl font-bold">
                          {creator.displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-neutral-900 truncate">
                        {creator.displayName}
                      </h3>
                      <p className="text-sm text-neutral-500 mt-1">
                        {creator._count.releases}{" "}
                        {creator._count.releases === 1 ? "release" : "releases"}
                      </p>
                    </div>
                  </Link>
                  {creator.bio && (
                    <p className="mt-4 text-sm text-neutral-600 line-clamp-3">
                      {creator.bio}
                    </p>
                  )}
                  <Link
                    href={`/creators/${creator.slug}/subscribe`}
                    className="mt-4 block w-full text-center px-4 py-2 rounded-lg bg-fuchsia-600 text-white font-medium hover:bg-fuchsia-700 transition-colors"
                  >
                    Subscribe
                  </Link>
                </div>
              ))}
            </div>
          ))}

        {view === "releases" &&
          (releases.length === 0 ? (
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
            <CollectorDiscoverReleasesGrid
              releases={releases}
              cycleId={currentCycle?.id ?? null}
              initiallySelectedReleaseIds={selectedReleaseIds}
            />
          ))}
      </div>
    </div>
  );
}
