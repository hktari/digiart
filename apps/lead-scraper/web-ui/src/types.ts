export interface Lead {
  id: string;
  postId: string;
  postUrl: string;
  title: string;
  author: string;
  subreddit: string;
  score: number;
  isHotLead: boolean;
  reachedOut: boolean;
  isIrrelevant: boolean;
  reasoning: string | null;
  scrapedAt: string;
  painPoints: PainPoint[];
  irrelevanceReason?: string;
  outreachNotes?: string;
}

export interface PainPoint {
  category: string;
  description: string;
  severity: "high" | "medium" | "low";
}

export interface Stats {
  totalLeads: number;
  hotLeads: number;
  last24h: number;
  contacted: number;
  notContacted: number;
  irrelevant: number;
}

export type FilterType =
  | "all"
  | "hot"
  | "new"
  | "contacted"
  | "not-contacted"
  | "irrelevant"
  | "relevant";
export type SortType = "score" | "date";
