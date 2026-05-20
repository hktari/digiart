"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import {
  ALLOWED_ARTWORK_TYPES,
  type FileEntry,
  type FileStatus,
  makeFileEntry,
  uploadOne,
} from "@/lib/artwork-upload";

export default function CreatorArtworkNewPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const updateEntry = useCallback((id: string, state: FileStatus) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, state } : e)));
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const valid = Array.from(files).filter((f) =>
      ALLOWED_ARTWORK_TYPES.includes(f.type),
    );
    if (!valid.length) return;
    const newEntries: FileEntry[] = valid.map(makeFileEntry);
    setEntries((prev) => [...prev, ...newEntries]);
    setAllDone(false);
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
    setAllDone(false);
  }, []);

  const handleUpload = useCallback(async () => {
    const queued = entries.filter((e) => e.state.status === "queued");
    if (!queued.length) return;
    setIsUploading(true);

    await Promise.all(
      queued.map(async (entry) => {
        updateEntry(entry.id, { status: "uploading", progress: 0 });
        try {
          const { warnings } = await uploadOne(entry, (pct) => {
            updateEntry(entry.id, { status: "uploading", progress: pct });
          });
          updateEntry(entry.id, { status: "done", artworkId: "", warnings });
        } catch (err) {
          updateEntry(entry.id, {
            status: "error",
            message: err instanceof Error ? err.message : "Upload failed",
          });
        }
      }),
    );

    setIsUploading(false);
    setAllDone(true);
  }, [entries, updateEntry]);

  const doneCount = entries.filter((e) => e.state.status === "done").length;
  const errorCount = entries.filter((e) => e.state.status === "error").length;
  const queuedCount = entries.filter((e) => e.state.status === "queued").length;
  const hasQueued = queuedCount > 0;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Upload artworks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            JPEG or PNG · min 1696 × 2528 px (portrait) · max 50 MB · multiple
            files supported
          </p>
        </div>
        {allDone && doneCount > 0 && (
          <button
            type="button"
            onClick={() => router.push("/creator/artworks")}
            className="shrink-0 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
          >
            View artworks
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50 hover:border-fuchsia-400 dark:hover:border-fuchsia-500 hover:bg-fuchsia-500/10 transition-colors cursor-pointer py-10 px-4 text-center"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
          <svg
            className="h-6 w-6 text-muted-foreground"
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
        <p className="text-sm font-medium text-foreground">
          Drag & drop or{" "}
          <span className="text-fuchsia-600 dark:text-fuchsia-400">browse</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Select multiple files at once
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

      {/* A5 print info */}
      <div className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <strong>🖨 Print format:</strong> Your artwork will be printed at A5 (148
        × 210 mm). Any aspect ratio is accepted — images are scaled to fit the
        page with white margins on the shorter sides. For edge-to-edge coverage,
        use a portrait image close to <strong>2:3 ratio</strong> (e.g. 1696 ×
        2528 px).
      </div>

      {/* File list */}
      {entries.length > 0 && (
        <div className="mt-6 space-y-3">
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
                    ? "border-jade-200 dark:border-jade-800 bg-jade-50 dark:bg-jade-950/30"
                    : isError
                      ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30"
                      : "border bg-background"
                }`}
              >
                {/* Thumbnail */}
                <img
                  src={entry.preview}
                  alt=""
                  className="h-12 w-12 rounded-md object-cover shrink-0"
                />

                {/* Info + progress */}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {entry.file.name}
                  </p>

                  {state.status === "queued" && (
                    <p className="text-xs text-muted-foreground">
                      {(entry.file.size / 1024 / 1024).toFixed(1)} MB · ready to
                      upload
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
                    <p className="text-xs text-jade-600 dark:text-jade-400 font-medium">
                      ✓ Uploaded
                      {state.warnings.length > 0 && (
                        <span className="ml-2 text-amber-600 dark:text-amber-400 font-normal">
                          ⚠ {state.warnings.join(", ")}
                        </span>
                      )}
                    </p>
                  )}

                  {isError && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {state.message}
                    </p>
                  )}
                </div>

                {/* Actions (only when not uploading) */}
                {!isActive && !isDone && (
                  <div className="flex items-center gap-2 shrink-0">
                    {isError && (
                      <button
                        type="button"
                        onClick={() => retryEntry(entry.id)}
                        className="text-xs font-medium text-fuchsia-600 hover:text-fuchsia-700 transition-colors"
                        aria-label="Retry"
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

      {/* Actions */}
      {entries.length > 0 && (
        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {doneCount > 0 && (
              <span className="text-jade-600 dark:text-jade-400 font-medium">
                {doneCount} uploaded
              </span>
            )}
            {doneCount > 0 && errorCount > 0 && " · "}
            {errorCount > 0 && (
              <span className="text-red-600 dark:text-red-400 font-medium">
                {errorCount} failed
              </span>
            )}
            {(doneCount > 0 || errorCount > 0) && queuedCount > 0 && " · "}
            {queuedCount > 0 && `${queuedCount} queued`}
          </p>
          <div className="flex gap-3">
            {!isUploading && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Add more
              </button>
            )}
            {hasQueued && (
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="rounded-lg bg-fuchsia-600 px-5 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading
                  ? `Uploading ${queuedCount}…`
                  : `Upload ${queuedCount} ${queuedCount === 1 ? "file" : "files"}`}
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
