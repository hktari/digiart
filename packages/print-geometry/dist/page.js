"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAPTION_BAND_PT = exports.MARGIN_PT = exports.PAGE_DIMENSIONS = exports.DEFAULT_PAGE_FORMAT = void 0;
exports.DEFAULT_PAGE_FORMAT = "A5_PORTRAIT";
const MM_TO_PT = 2.8346;
function mm(value) {
    return value * MM_TO_PT;
}
exports.PAGE_DIMENSIONS = {
    A5_PORTRAIT: { widthPt: mm(148), heightPt: mm(210) },
    A5_LANDSCAPE: { widthPt: mm(210), heightPt: mm(148) },
    A4_PORTRAIT: { widthPt: mm(210), heightPt: mm(297) },
    A4_LANDSCAPE: { widthPt: mm(297), heightPt: mm(210) },
    SQUARE_210: { widthPt: mm(210), heightPt: mm(210) },
    SQUARE_148: { widthPt: mm(148), heightPt: mm(148) },
    LETTER: { widthPt: mm(216), heightPt: mm(279) },
};
/** 10mm, per Peecho's file guidelines. */
exports.MARGIN_PT = 28.35;
/**
 * Strip of the print area reserved for the plate caption, along whichever edge
 * is the image's own bottom. Taken out of the space available to the image,
 * never out of the safe margin, so the credit still lands inside Peecho's
 * printable area.
 */
exports.CAPTION_BAND_PT = 16;
//# sourceMappingURL=page.js.map