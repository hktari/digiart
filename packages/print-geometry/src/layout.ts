import { CAPTION_BAND_PT, MARGIN_PT, type PageDimensions } from "./page";

export interface PlateInput {
  imageWidthPx: number;
  imageHeightPx: number;
  /** "PORTRAIT" | "LANDSCAPE"; anything else is treated as portrait. */
  orientation: string;
  page: PageDimensions;
  hasCaption: boolean;
}

export interface PlateLayout {
  needsRotation: boolean;
  /** Points drawn per source pixel. Effective dpi is 72 / scale. */
  scale: number;
  drawW: number;
  drawH: number;
  drawX: number;
  drawY: number;
}

export function orientationFromPixels(
  width: number,
  height: number,
): "PORTRAIT" | "LANDSCAPE" {
  return width > height ? "LANDSCAPE" : "PORTRAIT";
}

/**
 * Where a plate lands on the page, and at what scale.
 *
 * This is the single source of that answer. The renderer uses it to place the
 * image and the resolution gate uses it to score the image, which is the only
 * way the two can be guaranteed to agree — they disagreed for a long time, and
 * the gate's imaginary full-bleed page cost 83% of collected artwork.
 */
export function layoutPlate(input: PlateInput): PlateLayout {
  const { imageWidthPx, imageHeightPx, orientation, page, hasCaption } = input;
  const { widthPt: PAGE_WIDTH_PT, heightPt: PAGE_HEIGHT_PT } = page;

  const captionBandPt = hasCaption ? CAPTION_BAND_PT : 0;

  const isImageLandscape = orientation === "LANDSCAPE";
  const isPageLandscape = PAGE_WIDTH_PT > PAGE_HEIGHT_PT;
  // A square page fits both orientations equally well, so rotating buys nothing
  // and costs the reader turning the book. Without this, every landscape plate
  // in a square book comes out sideways.
  const isSquarePage = Math.abs(PAGE_WIDTH_PT - PAGE_HEIGHT_PT) < 1;
  const needsRotation = !isSquarePage && isImageLandscape !== isPageLandscape;

  const printW = PAGE_WIDTH_PT - MARGIN_PT * 2;
  const printH = PAGE_HEIGHT_PT - MARGIN_PT * 2;

  // The caption always runs along the plate's own bottom edge. On a rotated
  // plate that edge is vertical, which is why the band comes out of the width
  // instead of the height.
  const bandW = needsRotation ? captionBandPt : 0;
  const bandH = needsRotation ? 0 : captionBandPt;
  const availW = printW - bandW;
  const availH = printH - bandH;

  if (needsRotation) {
    // pdf-lib rotates 90° CCW around the bottom-left anchor, so the visible
    // extents swap and scaling is against the post-rotation dimensions.
    const scale = Math.min(availW / imageHeightPx, availH / imageWidthPx);
    const drawW = imageWidthPx * scale;
    const drawH = imageHeightPx * scale;
    return {
      needsRotation,
      scale,
      drawW,
      drawH,
      drawX: MARGIN_PT + (availW - drawH) / 2 + drawH,
      drawY: MARGIN_PT + (availH - drawW) / 2,
    };
  }

  const scale = Math.min(availW / imageWidthPx, availH / imageHeightPx);
  const drawW = imageWidthPx * scale;
  const drawH = imageHeightPx * scale;
  return {
    needsRotation,
    scale,
    drawW,
    drawH,
    drawX: MARGIN_PT + (availW - drawW) / 2,
    drawY: MARGIN_PT + bandH + (availH - drawH) / 2,
  };
}
