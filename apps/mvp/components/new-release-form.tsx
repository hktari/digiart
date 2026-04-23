"use client";

import { useRouter } from "next/navigation";
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

export function NewReleaseForm() {
  const router = useRouter();

  // --- Step state ---
  const [step, setStep] = useState<Step>("details");

  // --- Details ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);

  // --- Artworks ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // --- Submit ---
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // --- File helpers ---
  const updateEntry = useCallback((id: string, state: FileStatus) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, state } : e)));
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const valid = Array.from(files).filter((f) =>
      ALLOWED_ARTWORK_TYPES.includes(f.type),
    );
    if (!valid.length) return;
    setEntries((prev) => [...prev, ...valid.map(makeFileEntry)]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  const retryEntry = useCallback((id: string) => {
    setEntries((prev) =>
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
    const queued = entries.filter((e) => e.state.status === "queued");
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

      // Collect all successfully uploaded artwork IDs
      const allDoneEntries = entries.filter((e) => e.state.status === "done");
      const allArtworkIds = [
        ...allDoneEntries
          .filter((e) => e.state.status === "done")
          .map(
            (e) => (e.state as { status: "done"; artworkId: string }).artworkId,
          ),
        ...newIds,
      ];
      // Deduplicate
      const artworkIds = [...new Set(allArtworkIds)];

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
      if (artworkIds.length > 0) {
        await setReleaseArtworks(result.releaseId, artworkIds);
      }

      router.push(`/creator/releases/${result.releaseId}`);
    });
  };

  const MIN_ARTWORKS = 5;
  const hasErrors = entries.some((e) => e.state.status === "error");
  const isSubmitting = step === "submitting" || isPending || isUploading;
  const doneCount = entries.filter((e) => e.state.status === "done").length;
  const queuedCount = entries.filter((e) => e.state.status === "queued").length;
  const totalCount = doneCount + queuedCount;
  const meetsMinimum = totalCount >= MIN_ARTWORKS;

  return (
    <div className="space-y-8">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <span
          className={
            step === "details"
              ? "text-fuchsia-600 font-semibold"
              : "text-neutral-400"
          }
        >
          1. Details
        </span>
        <span>›</span>
        <span
          className={
            step === "artworks" || step === "submitting"
              ? "text-fuchsia-600 font-semibold"
              : "text-neutral-400"
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
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Issue #3 — Summer Landscapes"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent"
            />
            {titleError && (
              <p className="mt-1 text-xs text-red-600">{titleError}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Description
              <span className="ml-1 text-neutral-400 font-normal">
                (optional)
              </span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What's this release about? Notes for subscribers, theme, etc."
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
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
          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => !isSubmitting && fileInputRef.current?.click()}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              !isSubmitting &&
              fileInputRef.current?.click()
            }
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-beige-300 bg-beige-50 hover:border-fuchsia-400 hover:bg-fuchsia-50/30 transition-colors cursor-pointer py-8 px-4 text-center"
          >
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-beige-100">
              <svg
                className="h-5 w-5 text-beige-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-neutral-700">
              Drag & drop or <span className="text-fuchsia-600">browse</span>
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">
              JPEG or PNG · max 50 MB · multiple files
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>

          {/* File list */}
          {entries.length > 0 && (
            <div className="space-y-2">
              {entries.map((entry) => {
                const { state } = entry;
                const isDone = state.status === "done";
                const isError = state.status === "error";
                const isActive =
                  state.status === "uploading" || state.status === "validating";

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                      isDone
                        ? "border-jade-200 bg-jade-50"
                        : isError
                          ? "border-red-200 bg-red-50"
                          : "border-neutral-200 bg-white"
                    }`}
                  >
                    <img
                      src={entry.preview}
                      alt=""
                      className="h-10 w-10 rounded-md object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-sm font-medium text-neutral-800">
                        {entry.file.name}
                      </p>
                      {state.status === "queued" && (
                        <p className="text-xs text-neutral-400">
                          {(entry.file.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      )}
                      {state.status === "uploading" && (
                        <div className="space-y-1">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                            <div
                              className="h-full rounded-full bg-fuchsia-500 transition-all duration-150"
                              style={{ width: `${state.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-neutral-400">
                            {state.progress}%
                          </p>
                        </div>
                      )}
                      {state.status === "validating" && (
                        <p className="text-xs text-neutral-400 animate-pulse">
                          Validating…
                        </p>
                      )}
                      {isDone && (
                        <p className="text-xs text-jade-600 font-medium">
                          ✓ Uploaded
                        </p>
                      )}
                      {isError && (
                        <p className="text-xs text-red-600">{state.message}</p>
                      )}
                    </div>
                    {!isActive && !isDone && (
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
                          className="text-neutral-300 hover:text-neutral-500 transition-colors"
                          aria-label="Remove"
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <div className="flex items-center justify-between gap-4 pt-1">
            <button
              type="button"
              onClick={() => setStep("details")}
              disabled={isSubmitting}
              className="text-sm text-neutral-500 hover:text-neutral-700 disabled:opacity-40 transition-colors"
            >
              ← Back
            </button>
            <div className="flex gap-3">
              {entries.length > 0 && !isSubmitting && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Add more
                </button>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || hasErrors || !meetsMinimum}
                className="rounded-lg bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting
                  ? `${queuedCount > 0 ? `Uploading ${queuedCount}…` : "Creating release…"}`
                  : `Create release with ${totalCount} artwork${totalCount === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>

          {!meetsMinimum && !isSubmitting && (
            <p className="text-center text-xs text-neutral-400">
              {totalCount === 0
                ? `Add at least ${MIN_ARTWORKS} artworks to create a release.`
                : `${MIN_ARTWORKS - totalCount} more artwork${MIN_ARTWORKS - totalCount === 1 ? "" : "s"} needed (min ${MIN_ARTWORKS}).`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
