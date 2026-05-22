"use client";

import Image from "next/image";
import Link from "next/link";
import { useBookletToggle } from "@/hooks/use-booklet-toggle";

type Release = {
  id: string;
  title: string;
  description: string | null;
  artworks: Array<{
    artwork: {
      storageKey: string;
      title: string;
      thumbnailUrl: string;
    };
  }>;
  _count: {
    artworks: number;
  };
  creatorProfile: {
    displayName: string;
    slug: string;
  };
};

type CreatorReleasesGridProps = {
  releases: Release[];
  slug: string;
  isAuthenticated: boolean;
  hasCollectorRole: boolean;
  cycleId: string | null;
};

export function CreatorReleasesGrid({
  releases,
  slug,
  isAuthenticated,
  hasCollectorRole,
  cycleId,
}: CreatorReleasesGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {releases.map((release) => (
        <ReleaseCard
          key={release.id}
          release={release}
          slug={slug}
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
  slug,
  isAuthenticated,
  hasCollectorRole,
  cycleId,
}: {
  release: Release;
  slug: string;
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
  const coverUrl = coverArtwork?.thumbnailUrl ?? null;

  return (
    <Link
      href={`/creators/${slug}/releases/${release.id}`}
      className={`group rounded-xl border bg-card overflow-hidden transition-all block ${
        isSelected && isHydrated
          ? "border-fuchsia-400 shadow-md"
          : "border-border hover:border-fuchsia-300 hover:shadow-lg"
      }`}
    >
      <div className="aspect-4/3 bg-muted relative overflow-hidden">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={release.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <span className="text-6xl">📦</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-fuchsia-600 transition-colors">
          {release.title}
        </h3>

        {release.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {release.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {release._count.artworks}{" "}
            {release._count.artworks === 1 ? "artwork" : "artworks"}
          </p>
          {isSelected && isHydrated && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
              In booklet
            </span>
          )}
        </div>

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
              ? "bg-destructive-bg text-destructive-foreground border border-destructive-border hover:opacity-80"
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
