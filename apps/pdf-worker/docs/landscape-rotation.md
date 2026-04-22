# Landscape Rotation Logic

## Problem

Booklet pages are **portrait A6** (148mm × 105mm), but some artworks are **landscape** oriented. We need to rotate landscape images 90° clockwise to fit them properly on the page.

## Solution Overview

The rotation happens in `artwork-page.service.ts` using pdf-lib's rotation feature:

```typescript
page.drawImage(image, {
  x: drawX,
  y: drawY,
  width: drawW,
  height: drawH,
  rotate: degrees(90), // Rotate 90° clockwise for landscape
});
```

## The Math

### Portrait (No Rotation)

```
Page dimensions: 419.53pt × 595.28pt
Printable area:  362.83pt × 538.58pt (after 28.35pt margins)

Image: 2000px × 3000px (portrait)
Aspect ratio: 2:3

Scale = min(362.83/2000, 538.58/3000) = min(0.181, 0.179) = 0.179

drawW = 2000 × 0.179 = 358pt
drawH = 3000 × 0.179 = 537pt

Center horizontally: drawX = 28.35 + (362.83 - 358) / 2 = 30.76pt
Center vertically:   drawY = 28.35 + (538.58 - 537) / 2 = 29.14pt
```

### Landscape (90° Rotation)

````
Page dimensions: 419.53pt × 595.28pt (still portrait!)
Printable area:  362.83pt × 538.58pt

Image: 3000px × 2000px (landscape)
Aspect ratio: 3:2

When rotated 90°, the image's effective dimensions swap:
- Effective width = original height (2000px)
- Effective height = original width (3000px)

Scale = min(538.58/3000, 362.83/2000) = min(0.179, 0.181) = 0.179

drawW = 2000 × 0.179 = 358pt  (image.heig ht × scale)
drawH = 3000 × 0.179 = 537pt  (image.width × scale)

## CRITICAL: pdf-lib Rotation Anchor Point

**pdf-lib rotates around the BOTTOM-LEFT CORNER of the image** (the point at x, y).

Source: [GitHub Issue #520](https://github.com/Hopding/pdf-lib/issues/520)

### How 90° Clockwise Rotation Works

When you call `page.drawImage(image, { x: 100, y: 200, rotate: degrees(90) })`:
- The rotation happens around the point (100, 200) - the bottom-left corner
- The image rotates 90° clockwise around that fixed point
- After rotation, the image extends **upward** from (100, 200) instead of to the right

### Why We Need `+ drawW` Offset

```typescript
drawX = MARGIN_PT + (printW - drawW) / 2 + drawW;
````

The `+ drawW` compensates for the rotation anchor point. Without it, the image would rotate around its center position and end up off the page to the left. By adding the image width, we shift the rotation point to the right, so after the 90° rotation, the image lands centered on the page.

Center: drawX = 28.35 + (362.83 - 358) / 2 + 358 = 388.76pt
drawY = 28.35 + (538.58 - 537) / 2 = 29.14pt

```

### Portrait Image (No Rotation)

```

┌─────────────────────────────────┐
│ Margin (28.35pt) │
│ ┌──────────────────────────┐ │
│ │ │ │
│ │ │ │
│ │ ARTWORK │ │
│ │ (Portrait) │ │
│ │ │ │
│ │ │ │
│ │ │ │
│ │ │ │
│ └──────────────────────────┘ │
│ │
└─────────────────────────────────┘
drawX = centered
drawY = centered
rotate = 0°

```

### Landscape Image (90° Clockwise Rotation)

```

Before rotation (in memory):
┌──────────────────────────────┐
│ LANDSCAPE │
│ ARTWORK │
└──────────────────────────────┘
3000px × 2000px

After rotation (on page):
┌─────────────────────────────────┐
│ Margin │
│ │
│ ┌──────────────────────────┐ │
│ │ L │ A │ N │ D │ S │ C │ A│ │
│ │ A │ R │ T │ W │ O │ R │ K│ │
│ └──────────────────────────┘ │
│ │
│ │
└─────────────────────────────────┘
drawX = centered + drawW (offset for rotation)
drawY = centered
rotate = 90°

````

## Code Walkthrough

```typescript
async addPageAsync(
  pdfDoc: PDFDocument,
  imageBytes: Uint8Array,
  mimeType: string,
  orientation: string,
): Promise<PDFPage> {
  // 1. Create page (always portrait A6)
  const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

  // 2. White background
  page.drawRectangle({
    x: 0, y: 0,
    width: PAGE_WIDTH_PT,
    height: PAGE_HEIGHT_PT,
    color: rgb(1, 1, 1),
  });

  // 3. Embed image
  const image = mimeType === "image/png"
    ? await pdfDoc.embedPng(imageBytes)
    : await pdfDoc.embedJpg(imageBytes);

  // 4. Check orientation
  const isLandscape = orientation === "LANDSCAPE";

  // 5. Calculate printable area (page minus margins)
  const printW = PAGE_WIDTH_PT - MARGIN_PT * 2;  // 362.83pt
  const printH = PAGE_HEIGHT_PT - MARGIN_PT * 2; // 538.58pt

  let drawW: number;
  let drawH: number;
  let drawX: number;
  let drawY: number;
  let rotate = degrees(0);

  if (isLandscape) {
    // 6a. LANDSCAPE: Scale based on swapped dimensions
    const scale = Math.min(
      printH / image.width,   // Height constraint
      printW / image.height   // Width constraint
    );

    // Swap width/height because we're rotating
    drawW = image.height * scale;
    drawH = image.width * scale;

    // Position with rotation offset
    drawX = MARGIN_PT + (printW - drawW) / 2 + drawW;
    drawY = MARGIN_PT + (printH - drawH) / 2;
    rotate = degrees(90);

  } else {
    // 6b. PORTRAIT: Normal scaling
    const scale = Math.min(
      printW / image.width,
      printH / image.height
    );

    drawW = image.width * scale;
    drawH = image.height * scale;

    // Center normally
    drawX = MARGIN_PT + (printW - drawW) / 2;
    drawY = MARGIN_PT + (printH - drawH) / 2;
  }

  // 7. Draw the image
  page.drawImage(image, {
    x: drawX,
    y: drawY,
    width: drawW,
    height: drawH,
    rotate,
  });

  return page;
}
````

## Testing

### Create Test Images

```bash
# Portrait test image (2000×3000)
convert -size 2000x3000 xc:blue -pointsize 200 -fill white \
  -annotate +500+1500 'PORTRAIT' test/artworks/portrait-test.jpg

# Landscape test image (3000×2000)
convert -size 3000x2000 xc:red -pointsize 200 -fill white \
  -annotate +1000+1000 'LANDSCAPE' test/artworks/landscape-test.jpg
```

### Generate Test Booklet

```bash
cd apps/pdf-worker
npx tsx scripts/generate-booklet-standalone.ts test/artworks ./test-rotation.pdf
```

### Verify Output

Open `test-rotation.pdf` and check:

- [ ] Portrait images are upright and centered
- [ ] Landscape images are rotated 90° clockwise
- [ ] Both orientations are properly centered within margins
- [ ] No clipping or overflow
- [ ] Aspect ratios are maintained

## Common Issues

### Issue 1: Image appears upside down

**Cause**: Using `degrees(-90)` instead of `degrees(90)`
**Fix**: Ensure rotation is positive 90°

### Issue 2: Image is clipped/off-page

**Cause**: X-offset calculation wrong
**Fix**: Verify `drawX = MARGIN_PT + (printW - drawW) / 2 + drawW`

### Issue 3: Image is stretched/squashed

**Cause**: Not swapping width/height for landscape
**Fix**: Ensure `drawW = image.height * scale` for landscape

### Issue 4: Image too small

**Cause**: Scale calculation using wrong dimensions
**Fix**: For landscape, scale should be `min(printH/image.width, printW/image.height)`

## Future Improvements

- [ ] Support 180° and 270° rotations
- [ ] Add configurable rotation direction (CW vs CCW)
- [ ] Handle EXIF orientation metadata
- [ ] Add visual regression tests
- [ ] Support custom margins per orientation
