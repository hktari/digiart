export type FileStatus =
  | { status: "queued" }
  | { status: "uploading"; progress: number }
  | { status: "validating" }
  | { status: "done"; artworkId: string; warnings: string[] }
  | { status: "error"; message: string };

export interface FileEntry {
  id: string;
  file: File;
  preview: string;
  state: FileStatus;
}

export const ALLOWED_ARTWORK_TYPES = ["image/jpeg", "image/png"];

export function makeFileEntry(file: File): FileEntry {
  return {
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
    file,
    preview: URL.createObjectURL(file),
    state: { status: "queued" },
  };
}

export async function uploadOne(
  entry: FileEntry,
  onProgress: (pct: number) => void,
): Promise<{ artworkId: string; warnings: string[] }> {
  const presignRes = await fetch("/api/artworks/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType: entry.file.type,
      fileSize: entry.file.size,
    }),
  });

  if (!presignRes.ok) {
    const err = await presignRes.json();
    throw new Error(err.message ?? err.error ?? "Presign failed");
  }

  const { uploadUrl, pendingKey } = await presignRes.json();

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", entry.file.type);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () =>
      xhr.status < 300 ? resolve() : reject(new Error(`S3 error ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(entry.file);
  });

  const registerRes = await fetch("/api/artworks/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pendingKey }),
  });

  const data = await registerRes.json();
  if (!registerRes.ok) throw new Error(data.message ?? data.error ?? "Register failed");

  return { artworkId: data.artwork.id, warnings: data.warnings ?? [] };
}
