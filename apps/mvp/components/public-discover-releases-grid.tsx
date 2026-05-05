"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { dispatchDiscoverBookletUpdated } from "@/lib/discover-booklet-events";

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

type BookletItem = {
  releaseId: string;
  title: string;
  creatorDisplayName: string;
  creatorSlug: string;
  artworkCount: number;
};

const STORAGE_KEY = "discover-booklet";

function getStoredBooklet(): BookletItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStoredBooklet(items: BookletItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

type Props = {
  releases: ReleaseItem[];
};

export function PublicDiscoverReleasesGrid({ releases }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = getStoredBooklet();
    setSelectedIds(new Set(stored.map((item) => item.releaseId)));
    setIsHydrated(true);
  }, []);

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  const onToggle = (release: ReleaseItem) => {
    const stored = getStoredBooklet();
    const isSelected = selectedIds.has(release.id);

    let nextItems: BookletItem[];
    if (isSelected) {
      nextItems = stored.filter((item) => item.releaseId !== release.id);
    } else {
      const newItem: BookletItem = {
        releaseId: release.id,
        title: release.title,
        creatorDisplayName: release.creatorProfile.displayName,
        creatorSlug: release.creatorProfile.slug,
        artworkCount: release._count.artworks,
      };
      nextItems = [...stored, newItem];
    }

    setStoredBooklet(nextItems);
    setSelectedIds(new Set(nextItems.map((item) => item.releaseId)));
    dispatchDiscoverBookletUpdated();
  };

  // Prevent hydration mismatch by not rendering the selected count until hydrated
  if (!isHydrated) {
    return (
      <div className="space-y-4">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {releases.map((release) => (
            <ReleaseCardSkeleton key={release.id} release={release} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        Selected in this view:{" "}
        <span className="font-semibold">{selectedCount}</span>
      </p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {releases.map((release) => {
          const coverArtwork = release.artworks[0]?.artwork;
          const isSelected = selectedIds.has(release.id);

          return (
            <div
              key={release.id}
              className={`bg-white rounded-lg border overflow-hidden transition-all ${
                isSelected
                  ? "border-fuchsia-400 shadow-md"
                  : "border-neutral-200 hover:border-fuchsia-300 hover:shadow-md"
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
                    {release._count.artworks === 1 ? "page" : "pages"}
                  </span>
                  {isSelected && (
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600">
                        +{release.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onToggle(release)}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isSelected
                        ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                        : "bg-fuchsia-600 text-white hover:bg-fuchsia-700"
                    }`}
                  >
                    {isSelected ? "Remove" : "Add to booklet"}
                  </button>
                  <Link
                    href={`/creators/${release.creatorProfile.slug}/releases/${release.id}`}
                    className="block w-full text-center px-3 py-2 text-sm font-medium text-fuchsia-600 border border-fuchsia-600 rounded-md hover:bg-fuchsia-50 transition-colors"
                  >
                    View release details
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReleaseCardSkeleton({ release }: { release: ReleaseItem }) {
  const coverArtwork = release.artworks[0]?.artwork;

  return (
    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
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
            {release._count.artworks === 1 ? "page" : "pages"}
          </span>
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
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600">
                +{release.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled
            className="px-3 py-2 text-sm font-medium rounded-md bg-fuchsia-600 text-white opacity-50"
          >
            Add to booklet
          </button>
          <Link
            href={`/creators/${release.creatorProfile.slug}/releases/${release.id}`}
            className="block w-full text-center px-3 py-2 text-sm font-medium text-fuchsia-600 border border-fuchsia-600 rounded-md hover:bg-fuchsia-50 transition-colors"
          >
            View release details
          </Link>
        </div>
      </div>
    </div>
  );
}
