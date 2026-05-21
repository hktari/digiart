"use client";

import { ArrowLeft, ImageIcon, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useCallback, useRef, useState, useTransition } from "react";
import { createRelease, setReleaseArtworks } from "@/lib/actions/releases";
import {
  ALLOWED_ARTWORK_TYPES,
  type FileEntry,
  type FileStatus,
  makeFileEntry,
  uploadOne,
} from "@/lib/artwork-upload";

type Step = "details" | "artworks" | "submitting";
type ArtworkTab = "existing" | "upload";

interface ExistingArtwork {
  id: string;
  title: string | null;
  thumbnailUrl: string;
}

interface EnhancedReleaseFormProps {
  existingArtworks: ExistingArtwork[];
  maxArtworksPerRelease: number;
  lockDate: Date;
}

export function EnhancedReleaseForm({
  existingArtworks,
  maxArtworksPerRelease,
  lockDate,
}: EnhancedReleaseFormProps) {
  const router = useRouter();

  // --- Step state ---
  const [step, setStep] = useState<Step>("details");

  // --- Details ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);

  // --- Artworks ---
  const [activeTab, setActiveTab] = useState<ArtworkTab>(
    existingArtworks.length > 0 ? "existing" : "upload",
  );
  const [selectedExistingIds, setSelectedExistingIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadEntries, setUploadEntries] = useState<FileEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // --- Submit ---
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const MIN_ARTWORKS = 5;
  const totalSelectedCount = selectedExistingIds.length + uploadEntries.length;
  const doneUploadCount = uploadEntries.filter(
    (e) => e.state.status === "done",
  ).length;
  const queuedUploadCount = uploadEntries.filter(
    (e) => e.state.status === "queued",
  ).length;
  const errorUploadCount = uploadEntries.filter(
    (e) => e.state.status === "error",
  ).length;
  const hasErrors = uploadEntries.some((e) => e.state.status === "error");
  const isSubmitting = step === "submitting" || isPending || isUploading;
  const meetsMinimum = totalSelectedCount >= MIN_ARTWORKS;
  const atMaximum = totalSelectedCount >= maxArtworksPerRelease;

  // --- File helpers ---
  const updateEntry = useCallback((id: string, state: FileStatus) => {
    setUploadEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, state } : e)),
    );
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const remainingSlots = maxArtworksPerRelease - totalSelectedCount;
      if (remainingSlots <= 0) return;

      const valid = Array.from(files)
        .filter((f) => ALLOWED_ARTWORK_TYPES.includes(f.type))
        .slice(0, remainingSlots);

      if (!valid.length) return;
      setUploadEntries((prev) => [...prev, ...valid.map(makeFileEntry)]);
    },
    [maxArtworksPerRelease, totalSelectedCount],
  );

  const removeEntry = useCallback((id: string) => {
    setUploadEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  const retryEntry = useCallback((id: string) => {
    setUploadEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, state: { status: "queued" } } : e,
      ),
    );
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(e.target.files);
      e.target.value = "";
    },
    [addFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  // --- Existing artwork selection ---
  const toggleExisting = useCallback(
    (id: string) => {
      setSelectedExistingIds((prev) => {
        if (prev.includes(id)) {
          return prev.filter((x) => x !== id);
        }
        if (prev.length + uploadEntries.length >= maxArtworksPerRelease) {
          return prev;
        }
        return [...prev, id];
      });
    },
    [maxArtworksPerRelease, uploadEntries.length],
  );

  // --- Step 1: validate details ---
  const handleDetailsNext = () => {
    if (!title.trim()) {
      setTitleError("Title is required");
      return;
    }
    setTitleError(null);
    setStep("artworks");
  };

  // --- Step 2: upload queued files ---
  const handleUploadQueued = async (): Promise<string[]> => {
    const queued = uploadEntries.filter((e) => e.state.status === "queued");
    if (!queued.length) return [];

    setIsUploading(true);
    const artworkIds: string[] = [];

    await Promise.all(
      queued.map(async (entry) => {
        updateEntry(entry.id, { status: "uploading", progress: 0 });
        try {
          const { artworkId, warnings } = await uploadOne(entry, (pct) => {
            updateEntry(entry.id, { status: "uploading", progress: pct });
          });
          updateEntry(entry.id, { status: "done", artworkId, warnings });
          artworkIds.push(artworkId);
        } catch (err) {
          updateEntry(entry.id, {
            status: "error",
            message: err instanceof Error ? err.message : "Upload failed",
          });
        }
      }),
    );

    setIsUploading(false);
    return artworkIds;
  };

  // --- Final submit ---
  const handleSubmit = () => {
    startTransition(async () => {
      setSubmitError(null);
      setStep("submitting");

      // Upload any queued files first
      const newIds = await handleUploadQueued();

      if (errorUploadCount > 0) {
        setSubmitError("Some uploads failed. Please retry or remove them.");
        setStep("artworks");
        return;
      }

      // Collect all artwork IDs
      const uploadedIds = uploadEntries
        .filter((e) => e.state.status === "done")
        .map(
          (e) => (e.state as { status: "done"; artworkId: string }).artworkId,
        );

      const artworkIds = [...selectedExistingIds, ...uploadedIds, ...newIds];
      const uniqueArtworkIds = [...new Set(artworkIds)];

      // Create the release
      const fd = new FormData();
      fd.append("title", title.trim());
      if (description.trim()) fd.append("description", description.trim());
      const result = await createRelease(null, fd);

      if (!result.success) {
        setSubmitError(
          Object.values(result.errors)[0] ?? "Failed to create release",
        );
        setStep("artworks");
        return;
      }

      // Attach artworks if any
      if (uniqueArtworkIds.length > 0) {
        await setReleaseArtworks(result.releaseId, uniqueArtworkIds);
      }

      posthog.capture("release_created", {
        release_id: result.releaseId,
        artwork_count: uniqueArtworkIds.length,
      });

      router.push(`/creator/releases/${result.releaseId}`);
    });
  };

  return (
    <div className="space-y-8">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={
            step === "details"
              ? "text-fuchsia-600 font-semibold"
              : "text-muted-foreground"
          }
        >
          1. Details
        </span>
        <span>›</span>
        <span
          className={
            step === "artworks" || step === "submitting"
              ? "text-fuchsia-600 font-semibold"
              : "text-muted-foreground"
          }
        >
          2. Artworks
        </span>
      </div>

      {/* Step 1 — Details */}
      {step === "details" && (
        <div className="space-y-5">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-foreground/80 mb-1"
            >
              Release Title <span className="text-destructive">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Issue #3 — Summer Landscapes"
              className="w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent"
            />
            {titleError && (
              <p className="mt-1 text-xs text-red-600">{titleError}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-foreground/80 mb-1"
            >
              Description
              <span className="ml-1 text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What's this release about? Theme, inspiration, notes for collectors..."
              className="w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Success guidance */}
          <div className="bg-info-bg border border-info-border rounded-lg p-4">
            <h4 className="text-sm font-medium text-foreground mb-2">
              Tips for a successful release
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>
                • Use a descriptive title that reflects the theme or style
              </li>
              <li>
                • Aim for {maxArtworksPerRelease} artworks for maximum collector
                choice
              </li>
              <li>
                • Publish before{" "}
                {new Date(lockDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                })}
              </li>
            </ul>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDetailsNext}
              className="rounded-lg bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
            >
              Next: Add artworks →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Artworks */}
      {(step === "artworks" || step === "submitting") && (
        <div className="space-y-5">
          {/* Artwork Counter */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Selected {totalSelectedCount} of {maxArtworksPerRelease}{" "}
                artworks
              </p>
              <p className="text-xs text-muted-foreground">
                Minimum {MIN_ARTWORKS} required to publish
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedExistingIds.length > 0 && (
                <span className="text-xs bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300 px-2 py-1 rounded-full">
                  {selectedExistingIds.length} from collection
                </span>
              )}
              {doneUploadCount > 0 && (
                <span className="text-xs bg-jade-100 dark:bg-jade-900/30 text-jade-700 dark:text-jade-300 px-2 py-1 rounded-full">
                  {doneUploadCount} uploaded
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                meetsMinimum ? "bg-jade-500" : "bg-fuchsia-500"
              }`}
              style={{
                width: `${Math.min((totalSelectedCount / MIN_ARTWORKS) * 100, 100)}%`,
              }}
            />
          </div>

          {/* Tabs */}
          <div className="border-b border-border">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setActiveTab("existing")}
                disabled={existingArtworks.length === 0}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === "existing"
                    ? "text-fuchsia-600"
                    : "text-muted-foreground hover:text-foreground"
                } ${existingArtworks.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  From Collection ({existingArtworks.length})
                </span>
                {activeTab === "existing" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-fuchsia-600" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === "upload"
                    ? "text-fuchsia-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload New
                </span>
                {activeTab === "upload" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-fuchsia-600" />
                )}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[300px]">
            {activeTab === "existing" && (
              <div className="space-y-4">
                {existingArtworks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border py-12 text-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No artworks in your collection yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("upload")}
                      className="mt-2 text-sm font-medium text-fuchsia-600 hover:text-fuchsia-700"
                    >
                      Upload new artworks →
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {existingArtworks.map((artwork) => {
                        const isSelected = selectedExistingIds.includes(
                          artwork.id,
                        );
                        const order = isSelected
                          ? selectedExistingIds.indexOf(artwork.id) + 1
                          : null;
                        const canSelect =
                          !isSelected &&
                          selectedExistingIds.length + uploadEntries.length >=
                            maxArtworksPerRelease;

                        return (
                          <button
                            key={artwork.id}
                            type="button"
                            onClick={() => toggleExisting(artwork.id)}
                            disabled={canSelect}
                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 ${
                              isSelected
                                ? "border-fuchsia-500 ring-1 ring-fuchsia-500"
                                : "border-transparent hover:border-border"
                            } ${canSelect ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            <img
                              src={artwork.thumbnailUrl}
                              alt={artwork.title || "Artwork"}
                              className="h-full w-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-fuchsia-600/20 flex items-start justify-end p-1.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fuchsia-600 text-white text-xs font-bold">
                                  {order}
                                </span>
                              </div>
                            )}
                            {artwork.title && (
                              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                                <p className="text-xs text-white truncate">
                                  {artwork.title}
                                </p>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click artworks to select them. Selected artworks will
                      appear in your release in the order you click them.
                    </p>
                  </>
                )}
              </div>
            )}

            {activeTab === "upload" && (
              <div className="space-y-4">
                {/* Drop zone */}
                <div
                  role="button"
                  tabIndex={0}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() =>
                    !isSubmitting && !atMaximum && fileInputRef.current?.click()
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    !isSubmitting &&
                    !atMaximum &&
                    fileInputRef.current?.click()
                  }
                  className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors py-8 px-4 text-center ${
                    atMaximum
                      ? "border-muted bg-muted/50 cursor-not-allowed"
                      : "border-beige-300 bg-beige-50 hover:border-fuchsia-400 hover:bg-fuchsia-50/30 cursor-pointer"
                  }`}
                >
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-beige-100">
                    <Upload className="h-5 w-5 text-beige-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {atMaximum ? (
                      "Maximum artworks reached"
                    ) : (
                      <>
                        Drag & drop or{" "}
                        <span className="text-fuchsia-600">browse</span>
                      </>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    JPEG or PNG · max 50 MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={isSubmitting || atMaximum}
                  />
                </div>

                {/* Upload list */}
                {uploadEntries.length > 0 && (
                  <div className="space-y-2">
                    {uploadEntries.map((entry) => {
                      const { state } = entry;
                      const isDone = state.status === "done";
                      const isError = state.status === "error";
                      const isActive =
                        state.status === "uploading" ||
                        state.status === "validating";

                      return (
                        <div
                          key={entry.id}
                          className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                            isDone
                              ? "border-jade-200 bg-jade-50 dark:border-jade-800 dark:bg-jade-950/30"
                              : isError
                                ? "border-destructive/30 bg-destructive/5"
                                : "border bg-background"
                          }`}
                        >
                          <img
                            src={entry.preview}
                            alt=""
                            className="h-10 w-10 rounded-md object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="truncate text-sm font-medium text-foreground">
                              {entry.file.name}
                            </p>
                            {state.status === "queued" && (
                              <p className="text-xs text-muted-foreground">
                                {(entry.file.size / 1024 / 1024).toFixed(1)} MB
                              </p>
                            )}
                            {state.status === "uploading" && (
                              <div className="space-y-1">
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-fuchsia-500 transition-all duration-150"
                                    style={{ width: `${state.progress}%` }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {state.progress}%
                                </p>
                              </div>
                            )}
                            {state.status === "validating" && (
                              <p className="text-xs text-muted-foreground animate-pulse">
                                Validating…
                              </p>
                            )}
                            {isDone && (
                              <p className="text-xs text-jade-600 font-medium">
                                ✓ Ready
                              </p>
                            )}
                            {isError && (
                              <p className="text-xs text-destructive">
                                {state.message}
                              </p>
                            )}
                          </div>
                          {!isActive && (
                            <div className="flex items-center gap-2 shrink-0">
                              {isError && (
                                <button
                                  type="button"
                                  onClick={() => retryEntry(entry.id)}
                                  className="text-xs font-medium text-fuchsia-600 hover:text-fuchsia-700"
                                >
                                  Retry
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeEntry(entry.id)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Remove"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {submitError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => setStep("details")}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to details
            </button>
            <div className="flex gap-3">
              {!meetsMinimum && !isSubmitting && (
                <p className="text-sm text-muted-foreground self-center">
                  {MIN_ARTWORKS - totalSelectedCount} more needed
                </p>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || hasErrors || !meetsMinimum}
                className="rounded-lg bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting
                  ? queuedUploadCount > 0
                    ? `Uploading ${queuedUploadCount}…`
                    : "Creating release…"
                  : `Create release with ${totalSelectedCount} artwork${totalSelectedCount === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {totalSelectedCount} of {maxArtworksPerRelease} maximum artworks ·
            Once published, releases cannot be edited
          </p>
        </div>
      )}
    </div>
  );
}
