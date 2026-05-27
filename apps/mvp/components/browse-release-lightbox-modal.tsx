"use client";

import { useEffect, useState } from "react";
import { ReleaseArtworkLightbox } from "@/components/release-artwork-lightbox";
import type { ReleaseData } from "@/hooks/use-booklet-toggle";

type Artwork = {
  id: string;
  title: string | null;
  orientation: string;
  imageUrl: string;
  thumbnailUrl: string;
};

type BrowseReleaseLightboxModalProps = {
  releaseId: string;
  releaseData: ReleaseData;
  cycleId: string | null;
  isAuthenticated: boolean;
  hasCollectorRole: boolean;
  initiallySelected: boolean;
  onClose: () => void;
};

export function BrowseReleaseLightboxModal({
  releaseId,
  releaseData,
  cycleId,
  isAuthenticated,
  hasCollectorRole,
  initiallySelected,
  onClose,
}: BrowseReleaseLightboxModalProps) {
  const [artworks, setArtworks] = useState<Artwork[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setArtworks(null);
    setError(false);

    fetch(`/api/browse/releases/${releaseId}/artworks`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load artworks");
        return res.json();
      })
      .then((data: { artworks: Artwork[] }) => {
        if (!cancelled) setArtworks(data.artworks);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [releaseId]);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="rounded-xl bg-card p-8 text-center shadow-2xl">
          <p className="text-destructive-foreground">Failed to load artworks</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-md bg-muted px-4 py-2 text-sm text-foreground"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!artworks) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-fuchsia-500 border-t-transparent" />
          <p className="text-sm text-white/70">Loading artworks…</p>
        </div>
      </div>
    );
  }

  return (
    <ReleaseArtworkLightbox
      artworks={artworks}
      releaseId={releaseId}
      releaseData={releaseData}
      cycleId={cycleId}
      isAuthenticated={isAuthenticated}
      hasCollectorRole={hasCollectorRole}
      initiallySelected={initiallySelected}
      initialIndex={0}
      onClose={onClose}
    />
  );
}
