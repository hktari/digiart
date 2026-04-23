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
const MIN_WIDTH_PX = 1240;
const MIN_HEIGHT_PX = 1748;

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

  if (width < MIN_WIDTH_PX || height < MIN_HEIGHT_PX) {
    return {
      valid: false,
      code: "LOW_RESOLUTION",
      message: `Image is too small (${width}×${height} px). Minimum required is ${MIN_WIDTH_PX}×${MIN_HEIGHT_PX} px for 300 DPI print quality.`,
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
