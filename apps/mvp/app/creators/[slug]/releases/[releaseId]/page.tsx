import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscoverBookletBar } from "@/components/discover-booklet-bar";
import { PublicReleaseBookletCta } from "@/components/public-release-booklet-cta";
import {
  getCollectorProfile,
  getCollectorReleaseSelections,
} from "@/lib/actions/collector";
import { getPublicReleaseDetail } from "@/lib/actions/creator";
import { getCurrentCycle } from "@/lib/actions/cycles";
import { auth } from "@/lib/auth";

type Props = {
  params: Promise<{ slug: string; releaseId: string }>;
};

export default async function PublicReleaseDetailPage({ params }: Props) {
  const { slug, releaseId } = await params;
  const session = await auth();
  const release = await getPublicReleaseDetail(slug, releaseId);

  if (!release) {
    notFound();
  }

  const isAuthenticated = Boolean(session?.user?.id);
  const userId = session?.user?.id ?? null;
  const hasCollectorRole = session?.user?.roles?.includes("COLLECTOR") ?? false;

  const [collectorProfile, currentCycle] = await Promise.all([
    userId && hasCollectorRole ? getCollectorProfile(userId) : null,
    getCurrentCycle(),
  ]);

  const selectedReleaseIds =
    userId && collectorProfile && currentCycle
      ? await getCollectorReleaseSelections(userId, currentCycle.id)
      : [];

  const isSelected = selectedReleaseIds.some(
    (selection) => selection.release.id === release.id,
  );

  return (
    <div className="bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-8 lg:pr-80">
        <div className="space-y-3">
          <Link
            href={`/creators/${slug}/releases`}
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            ← Back to releases
          </Link>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm text-neutral-500">
                By{" "}
                <Link
                  href={`/creators/${slug}`}
                  className="font-medium text-neutral-700 hover:text-fuchsia-600"
                >
                  {release.creatorProfile.displayName}
                </Link>
              </p>
              <h1 className="text-3xl font-bold text-neutral-900">
                {release.title}
              </h1>
              {release.description ? (
                <p className="max-w-3xl text-neutral-600">
                  {release.description}
                </p>
              ) : null}
            </div>
            <div className="text-sm text-neutral-500">
              {release._count.artworks} artwork
              {release._count.artworks === 1 ? "" : "s"}
            </div>
          </div>
          {release.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {release.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-600 border border-neutral-200"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <PublicReleaseBookletCta
          releaseId={release.id}
          releaseData={{
            id: release.id,
            title: release.title,
            creatorProfile: release.creatorProfile,
            _count: release._count,
          }}
          cycleId={currentCycle?.id ?? null}
          isAuthenticated={isAuthenticated}
          hasCollectorRole={hasCollectorRole}
          hasCollectorProfile={Boolean(collectorProfile)}
          initiallySelected={isSelected}
        />

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {release.artworks.map((item) => (
            <article
              key={item.artwork.id}
              className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
            >
              <div className="relative aspect-square bg-neutral-100">
                <Image
                  src={item.artwork.imageUrl}
                  alt={item.artwork.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-1 p-4">
                <h2 className="text-sm font-semibold text-neutral-900">
                  {item.artwork.title}
                </h2>
                <p className="text-xs text-neutral-500">
                  {item.artwork.orientation.toLowerCase()}
                </p>
              </div>
            </article>
          ))}
        </section>
      </div>
      <DiscoverBookletBar />
    </div>
  );
}
