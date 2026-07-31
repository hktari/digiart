import type { PageFormat } from "@printfeed/print-geometry";

// Page geometry and the resolution floor live in the shared package, because
// the renderer and the gate must agree on what a page looks like. Re-exported
// here so existing importers inside the worker keep their import path.
export {
  DEFAULT_PAGE_FORMAT,
  PAGE_DIMENSIONS,
  type PageDimensions,
  type PageFormat,
} from "@printfeed/print-geometry";

/**
 * Self-contained: the caller resolves the artwork and hands over a plate list
 * plus the row to update. The worker used to run the CollectorReleaseSelection
 * query itself, which was the only reason a Collection could not use this same
 * pipeline. Now cycles and collections are just two callers.
 */
export interface BookletJobData {
  printFileId: string;
  issueLabel: string;
  pageFormat?: PageFormat;
  plates: ArtworkRecord[];
}

/**
 * A plate that never made it into the booklet. Collections are assembled from
 * strangers' phone uploads, so some fraction is always unprintable — but a
 * silent drop reads as "everything was usable" when most of it was not.
 */
export interface SkippedPlate {
  id: string;
  title: string | null;
  dpi: number;
  reason: "below-floor" | "unmeasurable";
}

export interface BookletJobResult {
  pdfUrl: string;
  pageCount: number;
  /** Dropped before building. Never silently discarded. */
  skipped: SkippedPlate[];
  /** Ids of plates that printed but will look soft. */
  marginal: string[];
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
