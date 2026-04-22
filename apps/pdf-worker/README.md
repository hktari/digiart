# PDF Worker

NestJS worker service for generating print-ready booklet PDFs from collector artwork selections.

## Architecture

- **Queue**: BullMQ (Redis-backed)
- **PDF Generation**: pdf-lib
- **Storage**: S3 or local filesystem
- **Database**: Neon Postgres (shared with MVP app)

## Local Development

### Prerequisites

```bash
# Start infrastructure
cd /home/bostjan/source/projects/art-subscription-platform
docker compose up -d  # Starts Redis + MinIO
```

### Environment Setup

Create `apps/pdf-worker/.env`:

```bash
# Redis
REDIS_URL="redis://localhost:6379"

# Database (same as MVP)
DATABASE_URL="postgresql://..."

# Storage - Local (simplest)
STORAGE_DRIVER="local"
STORAGE_LOCAL_PATH="/tmp/booklets"

# Storage - MinIO (S3-compatible)
# STORAGE_DRIVER="s3"
# AWS_ENDPOINT_URL="http://localhost:9000"
# AWS_REGION="us-east-1"
# AWS_ACCESS_KEY_ID="minioadmin"
# AWS_SECRET_ACCESS_KEY="minioadmin"
# AWS_S3_BUCKET="booklets"

PORT=3001
```

### Run Worker

```bash
cd apps/pdf-worker
pnpm dev
```

Worker listens on port 3001 and processes jobs from the `booklet-generation` queue.

## Testing Locally

### Option 1: Standalone Script (No Infrastructure)

**Simplest way to test PDF generation without Redis, database, or MVP app.**

```bash
cd apps/pdf-worker

# Generate from local images
npx tsx scripts/generate-booklet-standalone.ts /path/to/images ./output.pdf

# Example with test artworks
npx tsx scripts/generate-booklet-standalone.ts test/artworks ./test-booklet.pdf

# With custom metadata
ISSUE_LABEL="April 2026" \
CREATOR_NAMES="Artist One,Artist Two" \
  npx tsx scripts/generate-booklet-standalone.ts test/artworks ./booklet.pdf
```

**What it does:**
- Scans directory for `.jpg`, `.jpeg`, `.png` files
- Auto-detects orientation (landscape vs portrait)
- Generates front cover, artwork pages, back cover
- Ensures even page count (adds blank if needed)
- No external dependencies required

### Option 2: From MinIO

**Test with images already uploaded to MinIO.**

```bash
cd apps/pdf-worker

# List your MinIO keys first
# Open http://localhost:9001 → booklets bucket

ARTWORK_KEYS="image1.jpg,image2.png,image3.jpg" \
  npx tsx scripts/generate-booklet-from-minio.ts ./output.pdf
```

### Option 3: Full E2E (MVP App + Worker)

**Complete flow: API → Queue → Worker → Storage**

1. Start infrastructure: `docker compose up -d`
2. Start worker: `cd apps/pdf-worker && pnpm dev`
3. Start MVP: `cd apps/mvp && pnpm dev`
4. Trigger via API:

```bash
curl -X POST http://localhost:3000/api/fulfillment/generate-booklet \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=YOUR_SESSION" \
  -d '{
    "collectorProfileId": "...",
    "cycleId": "..."
  }'
```

Or via browser console (when logged in as admin):

```javascript
fetch('/api/fulfillment/generate-booklet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    collectorProfileId: "YOUR_ID",
    cycleId: "YOUR_CYCLE_ID"
  })
}).then(r => r.json()).then(console.log)
```

## PDF Layout Specifications

### Page Dimensions
- **Format**: A6 (148mm × 105mm)
- **Width**: 419.53 pt
- **Height**: 595.28 pt
- **Margin**: 28.35 pt (10mm)

### Artwork Requirements
- **Minimum dimensions**: 1240px × 1748px
- **Orientation**: Must be set (PORTRAIT or LANDSCAPE)
- **Formats**: JPEG or PNG

### Page Structure
1. **Front Cover** (beige background)
   - Logo (centered, 40% page width)
   - Issue label (e.g., "April 2026")
   - Creator names or "Selected Works"

2. **Artwork Pages** (white background)
   - One artwork per page
   - Auto-scaled to fit within margins
   - Landscape images rotated 90° clockwise

3. **Back Cover** (fuchsia background)
   - Logo (centered, 28% page width, 90% opacity)

4. **Blank Page** (if needed)
   - Added automatically for even page count

## Landscape Orientation Logic

### How It Works

The landscape handling is in `artwork-page.service.ts`:

```typescript
const isLandscape = orientation === "LANDSCAPE";
// OR auto-detect: const isLandscape = image.width > image.height;

if (isLandscape) {
  // Rotate image 90° clockwise
  const scale = Math.min(printH / image.width, printW / image.height);
  drawW = image.height * scale;  // Swapped!
  drawH = image.width * scale;   // Swapped!
  drawX = MARGIN_PT + (printW - drawW) / 2 + drawW;  // Offset for rotation
  drawY = MARGIN_PT + (printH - drawH) / 2;
  rotate = degrees(90);
} else {
  // Portrait - no rotation
  const scale = Math.min(printW / image.width, printH / image.height);
  drawW = image.width * scale;
  drawH = image.height * scale;
  drawX = MARGIN_PT + (printW - drawW) / 2;
  drawY = MARGIN_PT + (printH - drawH) / 2;
}
```

### Key Points

1. **Rotation**: Landscape images are rotated 90° clockwise using `pdf-lib`'s `degrees(90)`

2. **Dimension Swap**: When rotating, width and height are swapped:
   - `drawW = image.height * scale` (rotated width is original height)
   - `drawH = image.width * scale` (rotated height is original width)

3. **Position Offset**: X-coordinate needs adjustment for rotation:
   - `drawX = MARGIN_PT + (printW - drawW) / 2 + drawW`
   - The `+ drawW` accounts for pdf-lib's rotation anchor point

4. **Scaling**: Uses `Math.min()` to ensure image fits within printable area:
   - `printW = PAGE_WIDTH_PT - MARGIN_PT * 2` (362.83 pt)
   - `printH = PAGE_HEIGHT_PT - MARGIN_PT * 2` (538.58 pt)

5. **Centering**: Both portrait and landscape are centered within margins

### Visual Explanation

```
Portrait (no rotation):
┌─────────────────┐
│  ┌───────────┐  │
│  │           │  │
│  │  ARTWORK  │  │
│  │           │  │
│  │           │  │
│  └───────────┘  │
└─────────────────┘

Landscape (90° clockwise):
┌─────────────────┐
│                 │
│  ┌───────────┐  │
│  │ A │ R │ K │  │
│  │ R │ T │ W │  │
│  │ T │ W │ O │  │
│  └───────────┘  │
│                 │
└─────────────────┘
```

### Testing Landscape

To test landscape functionality:

1. **Add landscape test images** to `test/artworks/`
2. **Run standalone script**:
   ```bash
   npx tsx scripts/generate-booklet-standalone.ts test/artworks ./test.pdf
   ```
3. **Check output**: Landscape images should be rotated 90° and centered

### Current Issues / TODOs

- [ ] Verify rotation anchor point is correct for all image sizes
- [ ] Test with extreme aspect ratios (very wide/tall images)
- [ ] Confirm scaling maintains aspect ratio
- [ ] Add visual regression tests for layout

## Troubleshooting

### Worker not processing jobs
- Check Redis is running: `docker ps | grep redis`
- Check worker logs: `tail -f /tmp/pdf-worker.log`
- Verify `REDIS_URL` in `.env`

### Images not downloading
- For S3/MinIO: Check `AWS_*` env vars
- Verify images exist at storage URLs
- Check MinIO console: http://localhost:9001

### PDF generation fails
- Check artwork dimensions meet minimums
- Verify image formats (JPEG/PNG only)
- Check orientation is set (not UNKNOWN)

## Project Structure

```
apps/pdf-worker/
├── src/
│   ├── booklet/
│   │   ├── pdf/
│   │   │   ├── artwork-page.service.ts   # Artwork page layout + landscape logic
│   │   │   ├── cover-page.service.ts     # Front/back covers
│   │   │   └── pdf-builder.service.ts    # PDF orchestration
│   │   ├── storage/
│   │   │   └── storage.service.ts        # S3/local storage
│   │   ├── booklet.processor.ts          # BullMQ job processor
│   │   └── booklet.types.ts              # TypeScript types
│   ├── health/
│   ├── app.module.ts
│   └── main.ts
├── scripts/
│   ├── generate-booklet-standalone.ts    # Standalone test script
│   └── generate-booklet-from-minio.ts    # MinIO test script
├── test/
│   └── artworks/                         # Test images
└── README.md
```
