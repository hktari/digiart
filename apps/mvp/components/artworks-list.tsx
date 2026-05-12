"use client";

import type { Artwork, ArtworkStatus, Orientation } from "@prisma/client";
import { Archive, ImageOff, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { archiveArtwork, reactivateArtwork } from "@/lib/actions/artworks";

function getOrientationLabel(orientation: Orientation): string {
  const labels: Record<Orientation, string> = {
    PORTRAIT: "Portrait",
    LANDSCAPE: "Landscape",
    SQUARE: "Square",
    UNKNOWN: "Unknown",
  };
  return labels[orientation];
}

interface ArtworkWithThumbnail extends Artwork {
  thumbnailUrl?: string;
}

interface ArtworksListProps {
  artworks: ArtworkWithThumbnail[];
}

export function ArtworksList({ artworks }: ArtworksListProps) {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [items, setItems] = useState(artworks);

  const handleArchive = useCallback(async (artworkId: string) => {
    setPendingIds((prev) => new Set(prev).add(artworkId));
    try {
      await archiveArtwork(artworkId);
      setItems((prev) =>
        prev.map((item) =>
          item.id === artworkId
            ? { ...item, status: "ARCHIVED" as ArtworkStatus }
            : item,
        ),
      );
    } catch (err) {
      console.error("Failed to archive artwork:", err);
      alert("Failed to archive artwork. Please try again.");
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(artworkId);
        return next;
      });
    }
  }, []);

  const handleReactivate = useCallback(async (artworkId: string) => {
    setPendingIds((prev) => new Set(prev).add(artworkId));
    try {
      await reactivateArtwork(artworkId);
      setItems((prev) =>
        prev.map((item) =>
          item.id === artworkId
            ? { ...item, status: "ACTIVE" as ArtworkStatus }
            : item,
        ),
      );
    } catch (err) {
      console.error("Failed to reactivate artwork:", err);
      alert("Failed to reactivate artwork. Please try again.");
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(artworkId);
        return next;
      });
    }
  }, []);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-beige-100">
            <ImageOff className="h-8 w-8 text-beige-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            No artworks yet
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload your first artwork to get started.
          </p>
          <Link
            href="/creator/artworks/new"
            className="inline-flex items-center justify-center rounded-lg bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
          >
            Upload artwork
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Your Artworks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} artwork{items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/creator/artworks/new"
          className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
        >
          Upload new
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((artwork) => (
          <div
            key={artwork.id}
            className={`rounded-lg border bg-white overflow-hidden ${
              artwork.status === "ARCHIVED"
                ? "border-neutral-200 opacity-75"
                : "border-neutral-200"
            }`}
          >
            <div className="aspect-4/3 bg-beige-50 relative">
              {artwork.thumbnailUrl ? (
                <img
                  src={artwork.thumbnailUrl}
                  alt={artwork.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageOff className="h-8 w-8 text-beige-400" />
                </div>
              )}
              {artwork.status === "ARCHIVED" && (
                <div className="absolute inset-0 bg-neutral-900/50 flex items-center justify-center">
                  <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-medium text-white">
                    Archived
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-medium text-foreground truncate">
                  {artwork.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {getOrientationLabel(artwork.orientation)} ·{" "}
                  {artwork.width && artwork.height
                    ? `${artwork.width}×${artwork.height}px`
                    : "Dimensions unknown"}
                </p>
              </div>

              <div className="flex gap-2">
                {artwork.status === "ACTIVE" ? (
                  <button
                    onClick={() => handleArchive(artwork.id)}
                    disabled={pendingIds.has(artwork.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Archive className="h-4 w-4" />
                    {pendingIds.has(artwork.id) ? "..." : "Archive"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleReactivate(artwork.id)}
                    disabled={pendingIds.has(artwork.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-jade-300 px-3 py-2 text-sm font-medium text-jade-700 hover:bg-jade-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {pendingIds.has(artwork.id) ? "..." : "Reactivate"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
