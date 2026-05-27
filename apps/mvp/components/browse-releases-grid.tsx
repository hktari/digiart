"use client";

import Image from "next/image";
import { useState } from "react";
import { BrowseReleaseLightboxModal } from "@/components/browse-release-lightbox-modal";
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
      title: string | null;
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
  const [openRelease, setOpenRelease] = useState<ReleaseItem | null>(null);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {releases.map((release, index) => (
          <ReleaseCard
            key={release.id}
            release={release}
            index={index}
            isAuthenticated={isAuthenticated}
            hasCollectorRole={hasCollectorRole}
            cycleId={cycleId}
            onOpen={() => setOpenRelease(release)}
          />
        ))}
      </div>

      {openRelease && (
        <BrowseReleaseLightboxModal
          releaseId={openRelease.id}
          releaseData={{
            id: openRelease.id,
            title: openRelease.title,
            creatorProfile: openRelease.creatorProfile,
            _count: openRelease._count,
          }}
          cycleId={cycleId}
          isAuthenticated={isAuthenticated}
          hasCollectorRole={hasCollectorRole}
          initiallySelected={false}
          onClose={() => setOpenRelease(null)}
        />
      )}
    </>
  );
}

function ReleaseCard({
  release,
  index,
  isAuthenticated,
  hasCollectorRole,
  cycleId,
  onOpen,
}: {
  release: ReleaseItem;
  index: number;
  isAuthenticated: boolean;
  hasCollectorRole: boolean;
  cycleId: string | null;
  onOpen: () => void;
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
    <div
      className={`bg-card rounded-xl border overflow-hidden transition-all flex flex-col ${
        isSelected && isHydrated
          ? "border-fuchsia-400 shadow-md"
          : "border-border hover:border-fuchsia-300 hover:shadow-md"
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="relative aspect-4/3 bg-muted w-full block overflow-hidden group"
        aria-label={`View artworks in ${release.title}`}
      >
        {coverArtwork ? (
          <Image
            src={coverArtwork.thumbnailUrl}
            alt={coverArtwork.title || release.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={index < 6}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-muted-foreground text-sm">No preview</span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />

        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 backdrop-blur-sm">
          <ViewIcon />
          <span className="text-xs font-medium text-white">
            {release._count.artworks}{" "}
            {release._count.artworks === 1 ? "page" : "pages"}
          </span>
        </div>
      </button>

      <div className="flex flex-1 items-start gap-3 p-4">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div>
            <h3 className="font-semibold text-foreground line-clamp-1 leading-snug">
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

          {release.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {release.tags.slice(0, 3).map((rt) => (
                <span
                  key={rt.slug}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground"
                >
                  {rt.name}
                </span>
              ))}
              {release.tags.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  +{release.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          disabled={isPending || !isHydrated}
          aria-label={
            isSelected && isHydrated ? "Remove from booklet" : "Add to booklet"
          }
          className={`shrink-0 flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-semibold transition-colors disabled:opacity-50 ${
            isSelected && isHydrated
              ? "bg-destructive-bg text-destructive-foreground border border-destructive-border hover:bg-destructive-bg/80"
              : "bg-fuchsia-600 text-white hover:bg-fuchsia-700"
          }`}
        >
          {isSelected && isHydrated ? <RemoveIcon /> : <CollectIcon />}
          <span className="[writing-mode:vertical-rl] rotate-180 leading-none">
            {isPending
              ? "Saving"
              : isSelected && isHydrated
                ? "Remove"
                : "Collect"}
          </span>
        </button>
      </div>
    </div>
  );
}

function ViewIcon() {
  return (
    <svg
      className="w-3 h-3 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CollectIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
    </svg>
  );
}
