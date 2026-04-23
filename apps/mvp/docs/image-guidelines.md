# Image Upload Guidelines

This document outlines the validation rules, requirements, and implementation patterns for image uploads in the application.

## Overview

We handle two types of image uploads:

| Upload Type | Purpose | Max Size | Formats | Dimension Requirements |
|-------------|---------|----------|---------|----------------------|
| **Avatar** | Creator profile picture | 5 MB | JPEG, PNG, WebP | None |
| **Artwork** | Printable magazine content | 50 MB | JPEG, PNG only | Min 1240×1748 px (300 DPI for A6) |

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

| Check | Requirement | Error Code |
|-------|-------------|------------|
| File size | ≤ 50 MB | `FILE_TOO_LARGE` |
| Format | JPEG or PNG only | `INVALID_FORMAT` |
| Dimensions | Min 1240×1748 px | `LOW_RESOLUTION` |
| Color space | Non-RGB spaces trigger warning | — |

### Resolution Requirements

```ts
const MIN_WIDTH_PX = 1240;   // A6 width @ 300 DPI
const MIN_HEIGHT_PX = 1748;  // A6 height @ 300 DPI
```

These minimums ensure print quality for the booklet format (A6: 105mm × 148mm).

### Color Space Handling

Non-RGB color spaces (CMYK, grayscale, etc.) trigger a warning but are accepted. They will be converted to RGB for print compatibility.

```ts
if (space && space !== "srgb" && space !== "rgb") {
  warnings.push(
    `Color space "${space}" will be converted to RGB for print compatibility.`
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

| Code | Meaning | User Message |
|------|---------|--------------|
| `INVALID_FORMAT` | Unsupported file type | "Only JPEG and PNG files are accepted." |
| `LOW_RESOLUTION` | Image too small for print | "Image is too small (W×H px). Minimum required is 1240×1748 px for 300 DPI print quality." |
| `FILE_TOO_LARGE` | Exceeds size limit | "File must be under 50 MB." (or 5 MB for avatars) |

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
