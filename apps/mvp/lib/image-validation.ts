import sharp from "sharp";

export type ImageOrientation = "PORTRAIT" | "LANDSCAPE" | "SQUARE";

export type ValidationErrorCode =
  | "INVALID_FORMAT"
  | "LOW_RESOLUTION"
  | "FILE_TOO_LARGE";

export interface ValidationSuccess {
  valid: true;
  width: number;
  height: number;
  orientation: ImageOrientation;
  mimeType: "image/jpeg" | "image/png";
  warnings: string[];
}

export interface ValidationFailure {
  valid: false;
  code: ValidationErrorCode;
  message: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
// 2K @ 2:3 aspect ratio = 1696px × 2528px
// We accept both portrait and landscape orientations
const MIN_PRINT_WIDTH_PX = 1696;
const MIN_PRINT_HEIGHT_PX = 2528;

export async function validateArtworkImage(
  buffer: Buffer,
  fileSizeBytes: number,
): Promise<ValidationResult> {
  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      code: "FILE_TOO_LARGE",
      message: `File exceeds 50 MB limit (${(fileSizeBytes / 1024 / 1024).toFixed(1)} MB).`,
    };
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    return {
      valid: false,
      code: "INVALID_FORMAT",
      message: "File could not be read as an image.",
    };
  }

  const { format, width, height } = metadata;

  if (format !== "jpeg" && format !== "png") {
    return {
      valid: false,
      code: "INVALID_FORMAT",
      message: `Unsupported format "${format}". Only JPEG and PNG are accepted.`,
    };
  }

  if (!width || !height) {
    return {
      valid: false,
      code: "INVALID_FORMAT",
      message: "Could not determine image dimensions.",
    };
  }

  // Accept any aspect ratio — we only check that the image meets A5 minimums
  // in at least one orientation (portrait or landscape)
  const fitsPortrait =
    width >= MIN_PRINT_WIDTH_PX && height >= MIN_PRINT_HEIGHT_PX;
  const fitsLandscape =
    width >= MIN_PRINT_HEIGHT_PX && height >= MIN_PRINT_WIDTH_PX;

  if (!fitsPortrait && !fitsLandscape) {
    return {
      valid: false,
      code: "LOW_RESOLUTION",
      message: `Image is too small for print (${width}×${height} px). Minimum is ${MIN_PRINT_WIDTH_PX}×${MIN_PRINT_HEIGHT_PX} px (portrait) or ${MIN_PRINT_HEIGHT_PX}×${MIN_PRINT_WIDTH_PX} px (landscape) at 2:3 aspect ratio.`,
    };
  }

  const warnings: string[] = [];
  const { space } = metadata;
  if (space && space !== "srgb" && space !== "rgb") {
    warnings.push(
      `Color space "${space}" will be converted to RGB for print compatibility.`,
    );
  }

  let orientation: ImageOrientation;
  if (width > height) {
    orientation = "LANDSCAPE";
  } else if (height > width) {
    orientation = "PORTRAIT";
  } else {
    orientation = "SQUARE";
  }

  const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";

  return { valid: true, width, height, orientation, mimeType, warnings };
}
