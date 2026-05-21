"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import useSWR, { mutate } from "swr";
import { CART_SUMMARY_KEY } from "@/components/collector-booklet-cart";
import type { CollectorCartSummary } from "@/lib/actions/collector";
import { toggleReleaseSelection } from "@/lib/actions/collector";

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
      thumbnailUrl: string;
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

interface CartData extends CollectorCartSummary {
  quote: unknown | null;
  checkoutIntent: unknown | null;
  cycleLockDate: string | null;
}

const fetcher = async (url: string): Promise<CartData> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load cart summary");
  return res.json();
};

export function ReleaseSelectionGrid({
  releases,
  selectedReleaseIds: initialSelectedIds,
  cycleId,
}: ReleaseSelectionGridProps) {
  // Optimistic overrides: releaseId -> boolean, applied on top of SWR truth
  const [optimisticOverrides, setOptimisticOverrides] = useState<
    Map<string, boolean>
  >(new Map());
  const [isPending, startTransition] = useTransition();

  const { data: cartData } = useSWR<CartData>(CART_SUMMARY_KEY, fetcher, {
    revalidateOnFocus: true,
  });

  // SWR cart is source of truth; fall back to SSR value while loading
  const serverIds = useMemo<Set<string>>(() => {
    if (cartData) {
      return new Set(cartData.selectedReleases.map((r) => r.releaseId));
    }
    return initialSelectedIds;
  }, [cartData, initialSelectedIds]);

  // Apply any in-flight optimistic overrides on top
  const selectedIds = useMemo<Set<string>>(() => {
    if (optimisticOverrides.size === 0) return serverIds;
    const result = new Set(serverIds);
    for (const [id, selected] of optimisticOverrides) {
      if (selected) result.add(id);
      else result.delete(id);
    }
    return result;
  }, [serverIds, optimisticOverrides]);

  const clearOverride = (releaseId: string) => {
    setOptimisticOverrides((prev) => {
      const next = new Map(prev);
      next.delete(releaseId);
      return next;
    });
  };

  const handleToggle = (releaseId: string) => {
    const nextSelected = !selectedIds.has(releaseId);
    setOptimisticOverrides((prev) =>
      new Map(prev).set(releaseId, nextSelected),
    );

    startTransition(async () => {
      try {
        const result = await toggleReleaseSelection(releaseId, cycleId);
        if (!result.success) {
          clearOverride(releaseId);
          return;
        }
        clearOverride(releaseId);
        mutate(CART_SUMMARY_KEY);
      } catch (error) {
        console.error("Failed to toggle selection:", error);
        clearOverride(releaseId);
      }
    });
  };

  if (releases.length === 0) {
    return (
      <div className="bg-background rounded-lg border border-border p-12 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-ocean-100 dark:bg-ocean-900/30 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-ocean-600 dark:text-ocean-400"
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
          <h2 className="text-xl font-semibold text-foreground">
            No releases available
          </h2>
          <p className="text-muted-foreground">
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
          <Link
            key={release.id}
            href={`/creators/${release.creatorProfile.slug}/releases/${release.id}`}
            className={`bg-card rounded-lg border-2 overflow-hidden transition-all block ${
              isSelected
                ? "border-fuchsia-500 shadow-lg"
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
                  {release.artworks.length}{" "}
                  {release.artworks.length === 1 ? "page" : "pages"}
                </span>
                {isSelected && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                    In booklet
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggle(release.id);
                }}
                disabled={isPending}
                className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
                  isSelected
                    ? "bg-destructive-bg text-destructive-foreground border border-destructive-border hover:opacity-90"
                    : "bg-fuchsia-600 text-white hover:bg-fuchsia-700"
                }`}
              >
                {isSelected ? "Remove" : "Add to booklet"}
              </button>

              {release.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {release.tags.slice(0, 3).map((rt) => (
                    <span
                      key={rt.tag.slug}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground"
                    >
                      {rt.tag.name}
                    </span>
                  ))}
                  {release.tags.length > 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                      +{release.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
