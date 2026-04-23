"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import { saveAvatar } from "@/lib/actions/creator";

interface AvatarUploadProps {
  currentAvatar?: string | null;
  displayName: string;
}

type UploadPhase = "idle" | "uploading" | "saving" | "done" | "error";

export function AvatarUpload({
  currentAvatar,
  displayName,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [, formAction, isSaving] = useActionState(saveAvatar, null);

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleFile = useCallback(async (file: File) => {
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      setErrorMsg("Only JPEG, PNG or WebP files are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("File must be under 5 MB.");
      return;
    }

    setErrorMsg(null);
    setPreview(URL.createObjectURL(file));
    setPhase("uploading");

    try {
      const presignRes = await fetch("/api/avatar/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, fileSize: file.size }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error ?? "Presign failed");
      }

      const { uploadUrl, key } = await presignRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.onload = () =>
          xhr.status < 300
            ? resolve()
            : reject(new Error(`S3 error ${xhr.status}`));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(file);
      });

      // Write the key directly into the DOM before submitting
      if (keyInputRef.current) keyInputRef.current.value = key;
      setPhase("done");
      formRef.current?.requestSubmit();
    } catch (err) {
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const avatarSrc = preview ?? currentAvatar;
  const isLoading = phase === "uploading" || isSaving;

  return (
    <div className="flex items-center gap-5">
      {/* Avatar display */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload avatar"
        onClick={() => !isLoading && fileInputRef.current?.click()}
        onKeyDown={(e) =>
          e.key === "Enter" && !isLoading && fileInputRef.current?.click()
        }
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative h-20 w-20 shrink-0 cursor-pointer rounded-full overflow-hidden group"
      >
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-fuchsia-100 text-fuchsia-600 text-xl font-bold select-none">
            {initials}
          </div>
        )}

        {/* Hover overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center rounded-full transition-opacity ${
            isLoading
              ? "bg-black/40"
              : "bg-black/0 group-hover:bg-black/40 opacity-0 group-hover:opacity-100"
          }`}
        >
          {isLoading ? (
            <svg
              className="h-5 w-5 text-white animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Label + status */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => !isLoading && fileInputRef.current?.click()}
          disabled={isLoading}
          className="text-sm font-medium text-fuchsia-600 hover:text-fuchsia-700 disabled:opacity-50 transition-colors"
        >
          {isLoading
            ? "Uploading…"
            : avatarSrc
              ? "Change avatar"
              : "Upload avatar"}
        </button>
        <p className="text-xs text-neutral-400">JPEG, PNG or WebP · max 5 MB</p>
        {phase === "done" && !isSaving && !errorMsg && (
          <p className="text-xs text-jade-600 font-medium">✓ Saved</p>
        )}
        {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleChange}
      />

      {/* Hidden form — submitted automatically after S3 upload */}
      <form ref={formRef} action={formAction} className="hidden">
        <input ref={keyInputRef} type="hidden" name="key" defaultValue="" />
      </form>
    </div>
  );
}
