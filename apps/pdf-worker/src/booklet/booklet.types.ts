export interface BookletJobData {
  collectorProfileId: string;
  cycleId: string;
  issueLabel: string;
}

export interface BookletJobResult {
  pdfUrl: string;
  pageCount: number;
}

export interface ArtworkRecord {
  id: string;
  title: string;
  storageKey: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  orientation: string;
}
