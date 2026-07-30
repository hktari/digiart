export type PageFormat =
  | "A5_PORTRAIT"
  | "A5_LANDSCAPE"
  | "A4_PORTRAIT"
  | "A4_LANDSCAPE"
  | "SQUARE_210"
  | "SQUARE_148"
  | "LETTER";

export const DEFAULT_PAGE_FORMAT: PageFormat = "A5_PORTRAIT";

export interface PageDimensions {
  widthPt: number;
  heightPt: number;
}

const MM_TO_PT = 2.8346;

function mm(value: number): number {
  return value * MM_TO_PT;
}

export const PAGE_DIMENSIONS: Record<PageFormat, PageDimensions> = {
  A5_PORTRAIT: { widthPt: mm(148), heightPt: mm(210) },
  A5_LANDSCAPE: { widthPt: mm(210), heightPt: mm(148) },
  A4_PORTRAIT: { widthPt: mm(210), heightPt: mm(297) },
  A4_LANDSCAPE: { widthPt: mm(297), heightPt: mm(210) },
  SQUARE_210: { widthPt: mm(210), heightPt: mm(210) },
  SQUARE_148: { widthPt: mm(148), heightPt: mm(148) },
  LETTER: { widthPt: mm(216), heightPt: mm(279) },
};

/**
 * Print floor for a full-bleed A5 plate at 300dpi. Anything smaller visibly
 * softens on paper, so the processor rejects the whole job rather than print
 * it. Exported so tooling can apply the same rule before enqueueing.
 */
export const MIN_WIDTH_PX = 1696;
export const MIN_HEIGHT_PX = 2528;

export interface BookletJobData {
  collectorProfileId: string;
  cycleId: string;
  issueLabel: string;
  pageFormat?: PageFormat;
}

export interface BookletJobResult {
  pdfUrl: string;
  pageCount: number;
}

export interface ArtworkRecord {
  id: string;
  title: string | null;
  storageKey: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  orientation: string;
  /**
   * Display name of the creator this piece belongs to, carried per-artwork so
   * multi-creator booklets can credit each plate. The cover byline can only
   * name one artist; this is what makes the rest of them visible in print.
   */
  creatorName?: string | null;
}
