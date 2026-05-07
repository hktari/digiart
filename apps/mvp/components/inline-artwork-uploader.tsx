"use client";

import { useCallback, useRef, useState } from "react";
import {
  ALLOWED_ARTWORK_TYPES,
  type FileEntry,
  type FileStatus,
  makeFileEntry,
  uploadOne,
} from "@/lib/artwork-upload";

interface InlineArtworkUploaderProps {
  onUploadComplete?: (artworkIds: string[]) => void;
  initialCount?: number;
}

export function InlineArtworkUploader({
  onUploadComplete,
  initialCount = 0,
}: InlineArtworkUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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
  }, []);

  const handleUpload = useCallback(async () => {
    const queued = entries.filter((e) => e.state.status === "queued");
    if (!queued.length) return;
    setIsUploading(true);

    const results = await Promise.all(
      queued.map(async (entry) => {
        updateEntry(entry.id, { status: "uploading", progress: 0 });
        try {
          const { artworkId, warnings } = await uploadOne(entry, (pct) => {
            updateEntry(entry.id, { status: "uploading", progress: pct });
          });
          updateEntry(entry.id, { status: "done", artworkId, warnings });
          return artworkId;
        } catch (err) {
          updateEntry(entry.id, {
            status: "error",
            message: err instanceof Error ? err.message : "Upload failed",
          });
          return null;
        }
      }),
    );

    setIsUploading(false);
    const uploadedIds = results.filter((id): id is string => id !== null);
    if (uploadedIds.length > 0 && onUploadComplete) {
      onUploadComplete(uploadedIds);
    }
  }, [entries, updateEntry, onUploadComplete]);

  const doneCount = entries.filter((e) => e.state.status === "done").length;
  const _errorCount = entries.filter((e) => e.state.status === "error").length;
  const queuedCount = entries.filter((e) => e.state.status === "queued").length;
  const hasQueued = queuedCount > 0;
  const totalUploaded = initialCount + doneCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-700">
          Uploaded Artworks
        </h3>
        <span className="text-sm text-neutral-500">
          {totalUploaded} uploaded
          {totalUploaded < 5 && (
            <span className="text-beige-600"> (5 recommended)</span>
          )}
        </span>
      </div>

      <div
        role="button"
        tabIndex={0}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-fuchsia-300 bg-fuchsia-50/30 hover:border-fuchsia-400 hover:bg-fuchsia-50 transition-colors cursor-pointer py-6 px-4 text-center"
      >
        <div className="text-fuchsia-600 font-medium text-sm">
          + Upload Artwork
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Drag & drop or click · JPEG or PNG · min 1748 × 1240 px
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
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
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
                  className="h-10 w-10 rounded object-cover shrink-0"
                />

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-xs font-medium text-neutral-800">
                    {entry.file.name}
                  </p>

                  {state.status === "queued" && (
                    <p className="text-xs text-neutral-400">Ready to upload</p>
                  )}

                  {state.status === "uploading" && (
                    <div className="space-y-1">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200">
                        <div
                          className="h-full rounded-full bg-fuchsia-500 transition-all duration-150"
                          style={{ width: `${state.progress}%` }}
                        />
                      </div>
                    </div>
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
                        className="text-xs font-medium text-fuchsia-600 hover:text-fuchsia-700 transition-colors"
                        aria-label="Retry"
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

      {hasQueued && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading
            ? `Uploading ${queuedCount}…`
            : `Upload ${queuedCount} ${queuedCount === 1 ? "file" : "files"}`}
        </button>
      )}

      {totalUploaded < 5 && (
        <div className="rounded-lg border border-ocean-200 bg-ocean-50 p-3 text-sm text-ocean-800">
          💡 <strong>Tip:</strong> Collectors are more likely to subscribe to
          creators with a diverse portfolio. We recommend uploading at least 5
          artworks before sharing your profile.
        </div>
      )}
    </div>
  );
}
