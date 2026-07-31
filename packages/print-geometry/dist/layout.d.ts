import { type PageDimensions } from "./page";
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
export declare function orientationFromPixels(width: number, height: number): "PORTRAIT" | "LANDSCAPE";
/**
 * Where a plate lands on the page, and at what scale.
 *
 * This is the single source of that answer. The renderer uses it to place the
 * image and the resolution gate uses it to score the image, which is the only
 * way the two can be guaranteed to agree — they disagreed for a long time, and
 * the gate's imaginary full-bleed page cost 83% of collected artwork.
 */
export declare function layoutPlate(input: PlateInput): PlateLayout;
//# sourceMappingURL=layout.d.ts.map