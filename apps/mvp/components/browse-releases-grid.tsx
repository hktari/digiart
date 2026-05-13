"use client";

import Image from "next/image";
import Link from "next/link";
import { useBookletToggle } from "@/hooks/use-booklet-toggle";

type ReleaseItem = {
  id: string;
  title: string;
  description: string | null;
  creatorProfile: {
    id: string;
    displayName: string;
    slug: string;
  };
  artworks: Array<{
    artwork: {
      storageKey: string;
      title: string;
      thumbnailUrl: string;
    };
  }>;
  tags: Array<{
    name: string;
    slug: string;
  }>;
  _count: {
    artworks: number;
  };
};

type BrowseReleasesGridProps = {
  releases: ReleaseItem[];
  isAuthenticated: boolean;
  hasCollectorRole: boolean;
  cycleId: string | null;
};

export function BrowseReleasesGrid({
  releases,
  isAuthenticated,
  hasCollectorRole,
  cycleId,
}: BrowseReleasesGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {releases.map((release) => (
        <ReleaseCard
          key={release.id}
          release={release}
          isAuthenticated={isAuthenticated}
          hasCollectorRole={hasCollectorRole}
          cycleId={cycleId}
        />
      ))}
    </div>
  );
}

function ReleaseCard({
  release,
  isAuthenticated,
  hasCollectorRole,
  cycleId,
}: {
  release: ReleaseItem;
  isAuthenticated: boolean;
  hasCollectorRole: boolean;
  cycleId: string | null;
}) {
  const { isSelected, isPending, isHydrated, toggle } = useBookletToggle(
    release.id,
    {
      id: release.id,
      title: release.title,
      creatorProfile: release.creatorProfile,
      _count: release._count,
    },
    {
      isAuthenticated,
      hasCollectorRole,
      cycleId,
    },
  );

  const coverArtwork = release.artworks[0]?.artwork;

  return (
    <Link
      href={`/creators/${release.creatorProfile.slug}/releases/${release.id}`}
      className={`bg-white rounded-lg border overflow-hidden transition-all block ${
        isSelected && isHydrated
          ? "border-fuchsia-400 shadow-md"
          : "border-border hover:border-fuchsia-300 hover:shadow-md"
      }`}
    >
      {coverArtwork && (
        <div className="relative aspect-4/3 bg-muted">
          <Image
            src={coverArtwork.thumbnailUrl}
            alt={coverArtwork.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1">
            {release.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            by {release.creatorProfile.displayName}
          </p>
        </div>

        {release.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {release.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {release._count.artworks}{" "}
            {release._count.artworks === 1 ? "page" : "pages"}
          </span>
          {isSelected && isHydrated && (
            <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-fuchsia-700">
              Selected
            </span>
          )}
        </div>

        {release.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {release.tags.slice(0, 3).map((rt) => (
              <span
                key={rt.slug}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-beige-100 text-beige-800"
              >
                {rt.name}
              </span>
            ))}
            {release.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                +{release.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }}
          disabled={isPending || !isHydrated}
          className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
            isSelected && isHydrated
              ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
              : "bg-fuchsia-600 text-white hover:bg-fuchsia-700"
          }`}
        >
          {isPending
            ? "Saving..."
            : isSelected && isHydrated
              ? "Remove"
              : "Add to booklet"}
        </button>
      </div>
    </Link>
  );
}
