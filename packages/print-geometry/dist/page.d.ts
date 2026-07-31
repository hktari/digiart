export type PageFormat = "A5_PORTRAIT" | "A5_LANDSCAPE" | "A4_PORTRAIT" | "A4_LANDSCAPE" | "SQUARE_210" | "SQUARE_148" | "LETTER";
export declare const DEFAULT_PAGE_FORMAT: PageFormat;
export interface PageDimensions {
    widthPt: number;
    heightPt: number;
}
export declare const PAGE_DIMENSIONS: Record<PageFormat, PageDimensions>;
/** 10mm, per Peecho's file guidelines. */
export declare const MARGIN_PT = 28.35;
/**
 * Strip of the print area reserved for the plate caption, along whichever edge
 * is the image's own bottom. Taken out of the space available to the image,
 * never out of the safe margin, so the credit still lands inside Peecho's
 * printable area.
 */
export declare const CAPTION_BAND_PT = 16;
//# sourceMappingURL=page.d.ts.map