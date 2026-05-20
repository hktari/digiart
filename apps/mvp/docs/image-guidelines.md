# Image Upload Guidelines

This document outlines the validation rules, requirements, and implementation patterns for image uploads in the application.

## Overview

We handle two types of image uploads:

| Upload Type | Purpose                    | Max Size | Formats         | Dimension Requirements            |
| ----------- | -------------------------- | -------- | --------------- | --------------------------------- |
| **Avatar**  | Creator profile picture    | 5 MB     | JPEG, PNG, WebP | None                              |
| **Artwork** | Printable magazine content | 50 MB    | JPEG, PNG only  | Min 1696×2528 px (2K @ 2:3 ratio) |

## Avatar Upload

### Validation Rules

**Client-side (`AvatarUpload` component):**

- Allowed formats: `image/jpeg`, `image/png`, `image/webp`
- Maximum file size: 5 MB
- User feedback: "JPEG, PNG or WebP · max 5 MB"

**Server-side (`/api/avatar/presign`):**

```ts
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
```

### Implementation Pattern

1. Client validates file before upload
2. Request presigned URL from `/api/avatar/presign`
3. Upload directly to S3 using presigned URL
4. Submit S3 key via server action to persist

### Code Reference

- Component: `components/avatar-upload.tsx`
- API Route: `app/api/avatar/presign/route.ts`
- Server Action: `lib/actions/creator.ts` (`saveAvatar`)

## Artwork Upload

### Validation Rules

**Client-side (`lib/artwork-upload.ts`):**

- Allowed formats: `image/jpeg`, `image/png` (WebP **not** accepted)
- Maximum file size: 50 MB

**Server-side - Presign (`/api/artworks/presign`):**

```ts
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png"];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
```

**Server-side - Deep Validation (`lib/image-validation.ts`):**

Uses [Sharp](https://sharp.pixelplumbing.com/) to analyze the actual image:

| Check       | Requirement                                             | Error Code       |
| ----------- | ------------------------------------------------------- | ---------------- |
| File size   | ≤ 50 MB                                                 | `FILE_TOO_LARGE` |
| Format      | JPEG or PNG only                                        | `INVALID_FORMAT` |
| Dimensions  | Min 1696×2528 px (portrait) or 2528×1696 px (landscape) | `LOW_RESOLUTION` |
| Color space | Non-RGB spaces trigger warning                          | —                |

### Resolution Requirements

```ts
const MIN_PRINT_WIDTH_PX = 1696; // 2K width @ 2:3 aspect ratio
const MIN_PRINT_HEIGHT_PX = 2528; // 2K height @ 2:3 aspect ratio
```

These minimums ensure print quality at 2K resolution with a 2:3 aspect ratio.

**Aspect Ratio Policy**: We accept **any aspect ratio** to keep uploads frictionless. Images only need to meet the minimum dimensions in at least one orientation (portrait or landscape). The PDF worker centers and scales images to fit the page while preserving aspect ratio.

### Color Space Handling

Non-RGB color spaces (CMYK, grayscale, etc.) trigger a warning but are accepted. They will be converted to RGB for print compatibility.

```ts
if (space && space !== "srgb" && space !== "rgb") {
  warnings.push(
    `Color space "${space}" will be converted to RGB for print compatibility.`,
  );
}
```

### Orientation Detection

Images are classified as:

- `PORTRAIT` — height > width
- `LANDSCAPE` — width > height
- `SQUARE` — width = height

Stored in `Artwork.orientation` for PDF layout logic.

### Upload Flow

```
User selects file
       ↓
Client validates (format, size)
       ↓
Request presign URL → /api/artworks/presign
       ↓
Upload to S3 (progress tracked)
       ↓
Register artwork → /api/artworks/register
       ↓
  • Download from S3
  • Sharp validation (dimensions, format)
  • Move to final location
  • Create database record
       ↓
Return artwork ID + warnings
```

### Code Reference

- Upload Logic: `lib/artwork-upload.ts`
- File Entry Helper: `lib/artwork-upload.ts` (`makeFileEntry`, `uploadOne`)
- Presign API: `app/api/artworks/presign/route.ts`
- Register API: `app/api/artworks/register/route.ts`
- Validation Library: `lib/image-validation.ts`

## Error Codes

| Code             | Meaning                   | User Message                                                                                                                 |
| ---------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `INVALID_FORMAT` | Unsupported file type     | "Only JPEG and PNG files are accepted."                                                                                      |
| `LOW_RESOLUTION` | Image too small for print | "Image is too small for print (W×H px). Minimum is 1696×2528 px (portrait) or 2528×1696 px (landscape) at 2:3 aspect ratio." |
| `FILE_TOO_LARGE` | Exceeds size limit        | "File must be under 50 MB." (or 5 MB for avatars)                                                                            |

## Future Enhancements

### Optional Crop Tool

Currently, we accept any aspect ratio to minimize upload friction. If users request more control over how their artwork appears in print, we can add an **optional frontend crop tool**:

- Preview with A5 frame overlay showing the print area
- Drag/resize crop region to control framing
- Preset options: "Fit" (letterbox), "Fill" (crop to edges), "Original" (centered)
- Skip option to use full image with automatic centering

This would be **opt-in** — users who don't care about precise framing can skip it entirely.

### Print Bleed & Safe Zones

For edge-to-edge printing:

- **Trim size**: 148×210mm (A5)
- **Safe zone**: 138×200mm (5mm margin — critical content should stay inside)
- **Bleed**: 156×218mm (4mm overprint area for edge-to-edge images)

We could warn users if important content is near edges, but not block upload.

## Adding New Upload Types

When implementing a new image upload feature:

1. **Define constraints:**
   - Maximum file size
   - Allowed MIME types
   - Dimension requirements (if any)

2. **Implement client validation:**

   ```ts
   const ALLOWED = ["image/jpeg", "image/png"];
   if (!ALLOWED.includes(file.type)) {
     setError("Invalid format");
     return;
   }
   if (file.size > MAX_SIZE) {
     setError("File too large");
     return;
   }
   ```

3. **Create presign endpoint:**
   - Validate content type and size
   - Generate presigned S3 URL
   - Return `{ uploadUrl, key }`

4. **Add server-side validation (if needed):**
   - Use `validateArtworkImage()` for print-quality images
   - Or implement custom validation with Sharp

5. **Handle post-upload:**
   - Validate the uploaded file (optional but recommended)
   - Move to final S3 location
   - Persist metadata to database

## Security Considerations

- Always validate on server side (client-side can be bypassed)
- Use presigned URLs with short expiry (120s for avatars, 300s for artworks)
- Validate file path prefixes (`uploads/pending/`) to prevent path traversal
- Delete temporary files after validation failure or successful processing
- Never trust client-provided metadata (size, type) for critical decisions
