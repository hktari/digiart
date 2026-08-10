import { ChatFireworks } from "@langchain/community/chat_models/fireworks";
import type { Lead, PrismaClient } from "@prisma/client";
import type { CardLead } from "../notifiers/lead-card.js";

export class LeadNotFoundError extends Error {
  constructor(leadId: string) {
    super(`Lead not found: ${leadId}`);
    this.name = "LeadNotFoundError";
  }
}

const CREATORS_URL = "https://printfeed.btechhub.top/creators";

interface PainPointRow {
  category: string;
  severity: string;
  description: string;
}

async function requireLead(prisma: PrismaClient, leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { painPoints: true },
  });
  if (!lead) throw new LeadNotFoundError(leadId);
  return lead;
}

export async function markContacted(
  prisma: PrismaClient,
  leadId: string,
  notes?: string,
): Promise<Lead> {
  await requireLead(prisma, leadId);
  return prisma.lead.update({
    where: { id: leadId },
    data: {
      reachedOut: true,
      reachedOutAt: new Date(),
      outreachNotes: notes ?? null,
    },
  });
}

export async function markIrrelevant(
  prisma: PrismaClient,
  leadId: string,
  reason?: string,
): Promise<Lead> {
  await requireLead(prisma, leadId);
  return prisma.lead.update({
    where: { id: leadId },
    data: {
      isIrrelevant: true,
      irrelevanceReason: reason ?? null,
      markedIrrelevantAt: new Date(),
      markedIrrelevantBy: "user",
    },
  });
}

export async function archiveLead(
  prisma: PrismaClient,
  leadId: string,
  reason?: string,
): Promise<Lead> {
  await requireLead(prisma, leadId);
  return prisma.lead.update({
    where: { id: leadId },
    data: {
      archived: true,
      archivedAt: new Date(),
      archiveReason: reason ?? null,
    },
  });
}

/** Prompt copied verbatim from the original server.ts route - the copy is tuned. */
function buildOutreachPrompt(
  lead: {
    title: string;
    author: string;
    subreddit: string;
    reasoning: string | null;
  },
  painPointsSummary: string,
): string {
  return `You are writing a short Reddit comment reply on behalf of DigiArt, a platform where digital artists offer subscription-based printed art booklets to their followers.

Context about the platform:
- Creators curate art releases; followers subscribe and receive printed booklets delivered home
- We handle all printing, shipping, and checkout
- 90/10 revenue split in the creator's favor
- Creators just need to: curate a release, share their creator page link with their audience
- Best for digital artists with an existing audience who want a new monetization channel
- Creator signup page: ${CREATORS_URL}

The Reddit post you are replying to:
- Title: ${lead.title}
- Author: u/${lead.author}
- Subreddit: r/${lead.subreddit}
- Identified pain points:
${painPointsSummary || "(none identified)"}
- Scoring reasoning: ${lead.reasoning || "(none)"}

Examples of our outreach style (short, casual, no fluff):

---
hey, give DigiArt a shot
we're currently onboarding early stage creators to:
- curate art releases
- promote their profile to their audience
- validate whether people are interested in the "your digital art feed as printed magazine" idea

features:
- 90/10% revenue split creator/platform
- transparent payouts
- POD handled for you
- a magazine / booklet personalization experience

b | k
---
hey, interested in exploring an additional monetization channel for your art?

we're building a platform that lets you turn digital art into printed A5 booklets delivered on a monthly cadence

let me know if you're interested in learning more
---
i'm building a small pilot for digital artists: fans subscribe to receive artist-curated printed booklet drops of your work.

no inventory, printing, shipping, or VAT handling on your side. you'd just curate a release and share one link.

would you be open to trying it with a small group of your audience?
---

Write a short, casual Reddit comment reply (3-6 sentences max) that:
1. Directly addresses the specific pain point or topic in this post — reference what they actually said
2. Naturally introduces DigiArt as relevant to their situation
3. Ends with the creator signup URL: ${CREATORS_URL}
4. Signs off with: b | t
5. Uses lowercase, relaxed tone — no corporate speak, no em-dashes overload
6. Does NOT say "saw your post in r/..." — this is a direct reply in the comments

Output only the message text, nothing else.`;
}

export async function draftOutreach(
  prisma: PrismaClient,
  leadId: string,
  apiKey: string,
): Promise<string> {
  const lead = await requireLead(prisma, leadId);

  const painPointsSummary = lead.painPoints
    .map(
      (pp: PainPointRow) =>
        `- ${pp.category} (${pp.severity}): ${pp.description}`,
    )
    .join("\n");

  const model = new ChatFireworks({
    model: "accounts/fireworks/models/minimax-m2p7",
    temperature: 0.7,
    apiKey,
  });

  const response = await model.invoke(
    buildOutreachPrompt(lead, painPointsSummary),
  );
  return typeof response.content === "string"
    ? response.content.trim()
    : String(response.content);
}

/**
 * Leads eligible for an actionable Telegram card: above the score threshold,
 * never carded before (notifiedAt), and not already dismissed.
 */
const cardWhere = (minScore: number) => ({
  score: { gte: minScore },
  notifiedAt: null,
  isIrrelevant: false,
  archived: false,
});

export async function selectLeadsForCards(
  prisma: PrismaClient,
  opts: { minScore: number; limit: number },
): Promise<CardLead[]> {
  const leads = await prisma.lead.findMany({
    where: cardWhere(opts.minScore),
    orderBy: { score: "desc" },
    take: opts.limit,
    include: { painPoints: true },
  });

  return leads.map((lead) => ({
    id: lead.id,
    score: lead.score ?? 0,
    subreddit: lead.subreddit,
    title: lead.title,
    author: lead.author,
    postUrl: lead.postUrl,
    painPoints: lead.painPoints.map((pp: PainPointRow) => ({
      category: pp.category,
      severity: pp.severity,
    })),
  }));
}

export async function countUncardedAboveScore(
  prisma: PrismaClient,
  minScore: number,
): Promise<number> {
  return prisma.lead.count({ where: cardWhere(minScore) });
}

/** Stamps notifiedAt so a retried or re-run scrape never re-cards a lead. */
export async function markCarded(
  prisma: PrismaClient,
  leadId: string,
): Promise<void> {
  await prisma.lead.update({
    where: { id: leadId },
    data: { notifiedAt: new Date() },
  });
}
