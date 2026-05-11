import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectorBookletCart } from "@/components/collector-booklet-cart";
import { DiscoverBookletBar } from "@/components/discover-booklet-bar";
import { PublicReleaseBookletCta } from "@/components/public-release-booklet-cta";
import { ReleaseArtworkLightbox } from "@/components/release-artwork-lightbox";
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
    userId && hasCollectorRole
      ? getCollectorProfile(userId, { allowPrefill: false })
      : null,
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
    <div className="bg-muted">
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-8 lg:pr-80">
        <div className="space-y-3">
          <Link
            href={`/creators/${slug}/releases`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to releases
          </Link>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                By{" "}
                <Link
                  href={`/creators/${slug}`}
                  className="font-medium text-foreground hover:text-fuchsia-600"
                >
                  {release.creatorProfile.displayName}
                </Link>
              </p>
              <h1 className="text-3xl font-bold text-foreground">
                {release.title}
              </h1>
              {release.description ? (
                <p className="max-w-3xl text-muted-foreground">
                  {release.description}
                </p>
              ) : null}
            </div>
            <div className="text-sm text-muted-foreground">
              {release._count.artworks} artwork
              {release._count.artworks === 1 ? "" : "s"}
            </div>
          </div>
          {release.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {release.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground border"
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

        <ReleaseArtworkLightbox
          artworks={release.artworks.map((item) => ({
            id: item.artwork.id,
            title: item.artwork.title,
            orientation: item.artwork.orientation,
            imageUrl: item.artwork.imageUrl,
            thumbnailUrl: item.artwork.thumbnailUrl,
          }))}
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
          initiallySelected={isSelected}
        />
      </div>
      {hasCollectorRole ? <CollectorBookletCart /> : <DiscoverBookletBar />}
    </div>
  );
}
