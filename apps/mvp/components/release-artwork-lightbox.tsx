"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { type ReleaseData, useBookletToggle } from "@/hooks/use-booklet-toggle";

type ArtworkImage = {
  id: string;
  title: string | null;
  orientation: string;
  imageUrl: string;
  thumbnailUrl: string;
};

type ReleaseArtworkLightboxProps = {
  artworks: ArtworkImage[];
  releaseId: string;
  releaseData: ReleaseData;
  cycleId: string | null;
  isAuthenticated: boolean;
  hasCollectorRole: boolean;
  initiallySelected: boolean;
  initialIndex?: number;
  onClose?: () => void;
};

export function ReleaseArtworkLightbox({
  artworks,
  releaseId,
  releaseData,
  cycleId,
  isAuthenticated,
  hasCollectorRole,
  initiallySelected,
  initialIndex,
  onClose,
}: ReleaseArtworkLightboxProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(
    initialIndex !== undefined ? initialIndex : null,
  );
  const activeArtwork =
    activeIndex === null ? null : (artworks[activeIndex] ?? null);
  const hasMultipleArtworks = artworks.length > 1;

  const { isSelected, isPending, isHydrated, toggle } = useBookletToggle(
    releaseId,
    releaseData,
    {
      isAuthenticated,
      hasCollectorRole,
      cycleId,
      initiallySelected,
    },
  );
  const effectiveSelected = isHydrated ? isSelected : initiallySelected;

  const close = useCallback(() => {
    setActiveIndex(null);
    onClose?.();
  }, [onClose]);
  const showPrevious = useCallback(() => {
    setActiveIndex((current) =>
      current === null
        ? current
        : (current - 1 + artworks.length) % artworks.length,
    );
  }, [artworks.length]);
  const showNext = useCallback(() => {
    setActiveIndex((current) =>
      current === null ? current : (current + 1) % artworks.length,
    );
  }, [artworks.length]);

  useEffect(() => {
    if (activeIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, close, showNext, showPrevious]);

  return (
    <>
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {artworks.map((artwork, index) => (
          <article
            key={artwork.id}
            className="overflow-hidden rounded-lg border border-border bg-background"
          >
            <button
              type="button"
              onClick={() => setActiveIndex(index)}
              className="group relative block aspect-square w-full bg-muted text-left"
              aria-label={
                artwork.title
                  ? `Open ${artwork.title} in full screen`
                  : `Open artwork ${index + 1} in full screen`
              }
            >
              <Image
                src={artwork.thumbnailUrl}
                alt={artwork.title || "Artwork"}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition duration-300 group-hover:scale-[1.03]"
              />
              {artwork.title && (
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-3 pb-3 pt-8">
                  <p className="truncate text-sm font-semibold text-white">
                    {artwork.title}
                  </p>
                </div>
              )}
            </button>
          </article>
        ))}
      </section>

      {activeArtwork ? (
        <div
          className="fixed inset-0 z-50 bg-black"
          role="dialog"
          aria-modal="true"
          aria-label={
            activeArtwork.title
              ? `${activeArtwork.title} image viewer`
              : "Artwork image viewer"
          }
        >
          <button
            type="button"
            onClick={close}
            className="fixed left-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 dark:bg-neutral-900/90 text-2xl leading-none text-neutral-950 dark:text-neutral-50 shadow-lg backdrop-blur"
            aria-label="Close image viewer"
          >
            ×
          </button>

          <div className="absolute inset-0 overflow-hidden">
            <div className="flex h-full w-full items-center justify-center p-4">
              <Image
                src={activeArtwork.imageUrl}
                alt={activeArtwork.title || "Artwork"}
                width={1800}
                height={1800}
                sizes="100vw"
                className="max-h-[85vh] max-w-full select-none object-contain"
                priority
              />
            </div>
          </div>

          {hasMultipleArtworks ? (
            <>
              <button
                type="button"
                onClick={showPrevious}
                className="-translate-y-1/2 fixed left-3 top-1/2 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/85 dark:bg-neutral-900/85 text-3xl text-neutral-950 dark:text-neutral-50 shadow-lg backdrop-blur"
                aria-label="Previous artwork"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={showNext}
                className="-translate-y-1/2 fixed right-3 top-1/2 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/85 dark:bg-neutral-900/85 text-3xl text-neutral-950 dark:text-neutral-50 shadow-lg backdrop-blur"
                aria-label="Next artwork"
              >
                ›
              </button>
            </>
          ) : null}

          <div className="fixed inset-x-3 bottom-3 z-20 rounded-2xl bg-white/90 dark:bg-neutral-900/90 p-3 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                {activeArtwork.title && (
                  <p className="truncate text-sm font-semibold text-foreground">
                    {activeArtwork.title}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {(activeIndex ?? 0) + 1} / {artworks.length}
                </p>
              </div>
              <button
                type="button"
                onClick={toggle}
                disabled={isPending || !isHydrated}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                  effectiveSelected
                    ? "border border-destructive-border bg-destructive-bg text-destructive-foreground"
                    : "bg-fuchsia-600 text-white"
                }`}
              >
                {isPending
                  ? "Saving..."
                  : effectiveSelected
                    ? "Remove"
                    : "Add to booklet"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
