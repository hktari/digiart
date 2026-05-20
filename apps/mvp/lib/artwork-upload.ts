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

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
// 2K @ 2:3 aspect ratio — must satisfy portrait (1696×2528) or landscape (2528×1696)
const MIN_PRINT_WIDTH_PX = 1696;
const MIN_PRINT_HEIGHT_PX = 2528;

function getImageDimensions(
  url: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not read image dimensions"));
    img.src = url;
  });
}

export async function validateArtworkFile(
  file: File,
  previewUrl: string,
): Promise<{ valid: true } | { valid: false; message: string }> {
  if (!ALLOWED_ARTWORK_TYPES.includes(file.type)) {
    return {
      valid: false,
      message: `Unsupported format. Only JPEG and PNG are accepted.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      message: `File exceeds 50 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`,
    };
  }

  let width: number;
  let height: number;
  try {
    ({ width, height } = await getImageDimensions(previewUrl));
  } catch {
    return { valid: false, message: "Could not read image dimensions." };
  }

  const fitsPortrait =
    width >= MIN_PRINT_WIDTH_PX && height >= MIN_PRINT_HEIGHT_PX;
  const fitsLandscape =
    width >= MIN_PRINT_HEIGHT_PX && height >= MIN_PRINT_WIDTH_PX;

  if (!fitsPortrait && !fitsLandscape) {
    return {
      valid: false,
      message: `Image is too small for print (${width}\u00d7${height} px). Minimum is ${MIN_PRINT_WIDTH_PX}\u00d7${MIN_PRINT_HEIGHT_PX} px (portrait) or ${MIN_PRINT_HEIGHT_PX}\u00d7${MIN_PRINT_WIDTH_PX} px (landscape) at 2:3 aspect ratio.`,
    };
  }

  return { valid: true };
}

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
  const validation = await validateArtworkFile(entry.file, entry.preview);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

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
      if (ev.lengthComputable)
        onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () =>
      xhr.status < 300
        ? resolve()
        : reject(new Error(`S3 error ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(entry.file);
  });

  const registerRes = await fetch("/api/artworks/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pendingKey }),
  });

  const data = await registerRes.json();
  if (!registerRes.ok)
    throw new Error(data.message ?? data.error ?? "Register failed");

  return { artworkId: data.artwork.id, warnings: data.warnings ?? [] };
}
