"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toggleReleaseSelection } from "@/lib/actions/collector";
import { dispatchCollectorCartUpdated } from "@/lib/cart-events";

type Release = {
  id: string;
  title: string;
  description: string | null;
  creatorProfile: {
    displayName: string;
    slug: string;
    avatar: string | null;
  };
  artworks: Array<{
    artwork: {
      id: string;
      title: string;
      storageKey: string;
    };
  }>;
  tags: Array<{
    tag: {
      name: string;
      slug: string;
    };
  }>;
};

interface ReleaseSelectionGridProps {
  releases: Release[];
  selectedReleaseIds: Set<string>;
  cycleId: string;
}

export function ReleaseSelectionGrid({
  releases,
  selectedReleaseIds: initialSelectedIds,
  cycleId,
}: ReleaseSelectionGridProps) {
  const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (releaseId: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(releaseId)) {
      newSelectedIds.delete(releaseId);
    } else {
      newSelectedIds.add(releaseId);
    }
    setSelectedIds(newSelectedIds);

    startTransition(async () => {
      try {
        const result = await toggleReleaseSelection(releaseId, cycleId);
        if (!result.success) {
          setSelectedIds(selectedIds);
          return;
        }
        dispatchCollectorCartUpdated();
      } catch (error) {
        console.error("Failed to toggle selection:", error);
        setSelectedIds(selectedIds);
      }
    });
  };

  if (releases.length === 0) {
    return (
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
            No releases available
          </h2>
          <p className="text-neutral-600">
            Check back soon for new releases from your subscribed creators
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {releases.map((release) => {
        const isSelected = selectedIds.has(release.id);
        const coverArtwork = release.artworks[0]?.artwork;

        return (
          <div
            key={release.id}
            className={`bg-white rounded-lg border-2 overflow-hidden transition-all ${
              isSelected
                ? "border-fuchsia-500 shadow-lg"
                : "border-neutral-200 hover:border-neutral-300"
            }`}
          >
            {coverArtwork && (
              <div className="relative aspect-[4/3] bg-neutral-100">
                <Image
                  src={`/api/storage/${coverArtwork.storageKey}`}
                  alt={coverArtwork.title}
                  fill
                  className="object-cover"
                />
                {isSelected && (
                  <div className="absolute top-2 right-2 w-8 h-8 bg-fuchsia-600 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
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
                  {release.artworks.length}{" "}
                  {release.artworks.length === 1 ? "page" : "pages"}
                </span>
                {isSelected && (
                  <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-fuchsia-700">
                    In booklet
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(release.id)}
                  disabled={isPending}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isSelected
                      ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                      : "bg-fuchsia-600 text-white hover:bg-fuchsia-700"
                  } disabled:opacity-50`}
                >
                  {isSelected ? "Remove" : "Add to booklet"}
                </button>
                <Link
                  href={`/creators/${release.creatorProfile.slug}/releases/${release.id}`}
                  className="block px-3 py-2 text-center text-sm font-medium rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  View release details
                </Link>
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
