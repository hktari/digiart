"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orientationFromPixels = orientationFromPixels;
exports.layoutPlate = layoutPlate;
const page_1 = require("./page");
function orientationFromPixels(width, height) {
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
function layoutPlate(input) {
    const { imageWidthPx, imageHeightPx, orientation, page, hasCaption } = input;
    const { widthPt: PAGE_WIDTH_PT, heightPt: PAGE_HEIGHT_PT } = page;
    const captionBandPt = hasCaption ? page_1.CAPTION_BAND_PT : 0;
    const isImageLandscape = orientation === "LANDSCAPE";
    const isPageLandscape = PAGE_WIDTH_PT > PAGE_HEIGHT_PT;
    // A square page fits both orientations equally well, so rotating buys nothing
    // and costs the reader turning the book. Without this, every landscape plate
    // in a square book comes out sideways.
    const isSquarePage = Math.abs(PAGE_WIDTH_PT - PAGE_HEIGHT_PT) < 1;
    const needsRotation = !isSquarePage && isImageLandscape !== isPageLandscape;
    const printW = PAGE_WIDTH_PT - page_1.MARGIN_PT * 2;
    const printH = PAGE_HEIGHT_PT - page_1.MARGIN_PT * 2;
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
            drawX: page_1.MARGIN_PT + (availW - drawH) / 2 + drawH,
            drawY: page_1.MARGIN_PT + (availH - drawW) / 2,
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
        drawX: page_1.MARGIN_PT + (availW - drawW) / 2,
        drawY: page_1.MARGIN_PT + bandH + (availH - drawH) / 2,
    };
}
//# sourceMappingURL=layout.js.map