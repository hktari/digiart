"use client";

import { useCallback, useState, useTransition } from "react";
import { setReleaseArtworks } from "@/lib/actions/releases";

interface Artwork {
  id: string;
  title: string | null;
  thumbnailUrl: string;
}

interface ReleaseArtworkPickerProps {
  releaseId: string;
  allArtworks: Artwork[];
  selectedIds: string[];
  disabled?: boolean;
}

export function ReleaseArtworkPicker({
  releaseId,
  allArtworks,
  selectedIds: initialSelected,
  disabled = false,
}: ReleaseArtworkPickerProps) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const toggle = useCallback(
    (id: string) => {
      if (disabled) return;
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
      setSaved(false);
    },
    [disabled],
  );

  const handleSave = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result = await setReleaseArtworks(releaseId, selected);
      if (result.success) {
        setSaved(true);
      } else {
        setError(result.error ?? "Failed to save");
      }
    });
  }, [releaseId, selected]);

  const isDirty =
    JSON.stringify([...selected].sort()) !==
    JSON.stringify([...initialSelected].sort());

  if (allArtworks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-10 text-center">
        <p className="text-sm text-muted-foreground">No active artworks yet.</p>
        <a
          href="/creator/artworks/new"
          className="mt-2 inline-block text-sm font-medium text-fuchsia-600 hover:text-fuchsia-700"
        >
          Upload artworks →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {allArtworks.map((artwork) => {
          const isSelected = selected.includes(artwork.id);
          const order = isSelected ? selected.indexOf(artwork.id) + 1 : null;

          return (
            <button
              key={artwork.id}
              type="button"
              onClick={() => toggle(artwork.id)}
              disabled={disabled}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 ${
                isSelected
                  ? "border-fuchsia-500 ring-1 ring-fuchsia-500"
                  : "border-transparent hover:border-border"
              } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <img
                src={artwork.thumbnailUrl}
                alt={artwork.title || "Artwork"}
                className="h-full w-full object-cover"
              />
              {/* Overlay on selected */}
              {isSelected && (
                <div className="absolute inset-0 bg-fuchsia-600/20 flex items-start justify-end p-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fuchsia-600 text-white text-xs font-bold">
                    {order}
                  </span>
                </div>
              )}
              {/* Title tooltip on hover */}
              {artwork.title && (
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                  <p className="text-xs text-white truncate">{artwork.title}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          {selected.length === 0
            ? "No artworks selected"
            : `${selected.length} artwork${selected.length === 1 ? "" : "s"} selected`}
          {saved && !isDirty && (
            <span className="ml-2 text-jade-600 font-medium">✓ Saved</span>
          )}
          {error && <span className="ml-2 text-red-600">{error}</span>}
        </p>
        {!disabled && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || (!isDirty && saved)}
            className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Saving…" : "Save artworks"}
          </button>
        )}
      </div>
    </div>
  );
}
