"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toggleReleaseSelection } from "@/lib/actions/collector";
import { dispatchCollectorCartUpdated } from "@/lib/cart-events";

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

type Props = {
  releases: ReleaseItem[];
  cycleId: string | null;
  initiallySelectedReleaseIds: string[];
};

export function CollectorDiscoverReleasesGrid({
  releases,
  cycleId,
  initiallySelectedReleaseIds,
}: Props) {
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(initiallySelectedReleaseIds),
  );
  const [isPending, startTransition] = useTransition();

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);
  const [expandedReleaseId, setExpandedReleaseId] = useState<string | null>(
    null,
  );

  const onToggle = (releaseId: string) => {
    if (!cycleId) return;
    const next = new Set(selectedIds);
    if (next.has(releaseId)) {
      next.delete(releaseId);
    } else {
      next.add(releaseId);
    }
    setSelectedIds(next);

    startTransition(async () => {
      const result = await toggleReleaseSelection(releaseId, cycleId);
      if (!result.success) {
        setSelectedIds(new Set(selectedIds));
        return;
      }
      dispatchCollectorCartUpdated();
    });
  };

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
          const isInspecting = expandedReleaseId === release.id;

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
                    disabled={isPending || !cycleId}
                    onClick={() => onToggle(release.id)}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isSelected
                        ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                        : "bg-fuchsia-600 text-white hover:bg-fuchsia-700"
                    } disabled:opacity-50`}
                  >
                    {isSelected ? "Remove" : "Add to booklet"}
                  </button>
                  <Link
                    href={`/creators/${release.creatorProfile.slug}`}
                    className="block w-full text-center px-3 py-2 text-sm font-medium text-fuchsia-600 border border-fuchsia-600 rounded-md hover:bg-fuchsia-50 transition-colors"
                  >
                    View Creator
                  </Link>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setExpandedReleaseId(isInspecting ? null : release.id)
                  }
                  className="w-full px-3 py-2 text-sm font-medium rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  {isInspecting
                    ? "Hide release contents"
                    : "Inspect release contents"}
                </button>

                {isInspecting && (
                  <div className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">
                      Release contents
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {release.artworks.map(({ artwork }) => (
                        <div key={artwork.storageKey} className="space-y-1">
                          <div className="relative aspect-square overflow-hidden rounded bg-neutral-100">
                            <Image
                              src={`/api/storage/${artwork.storageKey}`}
                              alt={artwork.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <p
                            className="truncate text-[11px] text-neutral-600"
                            title={artwork.title}
                          >
                            {artwork.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
