import path from "node:path";
import { fileURLToPath } from "node:url";
import { ChatFireworks } from "@langchain/community/chat_models/fireworks";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3100;

app.use(cors());
app.use(express.json());

// Determine which directory to serve based on environment
const USE_REACT = process.env.USE_REACT === "true";
const staticDir = USE_REACT
  ? path.join(__dirname, "../../public-react")
  : path.join(__dirname, "../../public");

console.log(`Serving static files from: ${staticDir}`);
console.log(`React UI: ${USE_REACT ? "enabled" : "disabled"}`);

// Serve static files
app.use(express.static(staticDir));

// API Routes

// Get leads with filtering
app.get("/api/leads", async (req, res) => {
  try {
    const {
      filter = "all",
      sort = "score",
      limit = "50",
      offset = "0",
    } = req.query;

    // Build where clause
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic Prisma where clause
    let where: any = {};

    switch (filter) {
      case "hot":
        where = { isHotLead: true, isIrrelevant: false, archived: false };
        break;
      case "new":
        where = {
          scrapedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
          isIrrelevant: false,
          archived: false,
        };
        break;
      case "contacted":
        where = { reachedOut: true, archived: false };
        break;
      case "not-contacted":
        where = { reachedOut: false, isIrrelevant: false, archived: false };
        break;
      case "irrelevant":
        where = { isIrrelevant: true, archived: false };
        break;
      case "relevant":
        where = { isIrrelevant: false, archived: false };
        break;
      case "archived":
        where = { archived: true };
        break;
      case "active":
        where = { archived: false };
        break;
      case "all":
      default:
        where = {};
        break;
    }

    // Build orderBy clause
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic Prisma orderBy clause
    let orderBy: any;
    switch (sort) {
      case "date":
        orderBy = [
          { scrapedAt: "desc" as const },
          { score: { sort: "desc" as const, nulls: "last" as const } },
        ];
        break;
      case "score":
      default:
        orderBy = [
          { isHotLead: "desc" as const },
          { score: { sort: "desc" as const, nulls: "last" as const } },
          { scrapedAt: "desc" as const },
        ];
        break;
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy,
      take: Number.parseInt(limit as string, 10),
      skip: Number.parseInt(offset as string, 10),
      include: {
        painPoints: true,
      },
    });

    const total = await prisma.lead.count({ where });

    res.json({
      leads,
      total,
      limit: Number.parseInt(limit as string, 10),
      offset: Number.parseInt(offset as string, 10),
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

// Get single lead
app.get("/api/leads/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        painPoints: true,
      },
    });

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.json(lead);
  } catch (error) {
    console.error("Error fetching lead:", error);
    res.status(500).json({ error: "Failed to fetch lead" });
  }
});

// Get statistics
app.get("/api/stats", async (req, res) => {
  try {
    const [
      totalLeads,
      hotLeads,
      last24h,
      contacted,
      notContacted,
      irrelevant,
      archived,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({
        where: { isHotLead: true, isIrrelevant: false, archived: false },
      }),
      prisma.lead.count({
        where: {
          scrapedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
          isIrrelevant: false,
          archived: false,
        },
      }),
      prisma.lead.count({ where: { reachedOut: true, archived: false } }),
      prisma.lead.count({
        where: { reachedOut: false, isIrrelevant: false, archived: false },
      }),
      prisma.lead.count({ where: { isIrrelevant: true } }),
      prisma.lead.count({ where: { archived: true } }),
    ]);

    res.json({
      totalLeads,
      hotLeads,
      last24h,
      contacted,
      notContacted,
      irrelevant,
      archived,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Mark lead as contacted
app.post("/api/leads/:id/contact", async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        reachedOut: true,
        reachedOutAt: new Date(),
        outreachNotes: notes || null,
      },
    });

    res.json(lead);
  } catch (error) {
    console.error("Error marking lead as contacted:", error);
    res.status(500).json({ error: "Failed to mark lead as contacted" });
  }
});

// Mark lead as irrelevant
app.post("/api/leads/:id/irrelevant", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        isIrrelevant: true,
        irrelevanceReason: reason || null,
        markedIrrelevantAt: new Date(),
        markedIrrelevantBy: "user",
      },
    });

    res.json(lead);
  } catch (error) {
    console.error("Error marking lead as irrelevant:", error);
    res.status(500).json({ error: "Failed to mark lead as irrelevant" });
  }
});

// Unmark lead as irrelevant
app.delete("/api/leads/:id/irrelevant", async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        isIrrelevant: false,
        irrelevanceReason: null,
        markedIrrelevantAt: null,
        markedIrrelevantBy: null,
      },
    });

    res.json(lead);
  } catch (error) {
    console.error("Error unmarking lead as irrelevant:", error);
    res.status(500).json({ error: "Failed to unmark lead as irrelevant" });
  }
});

// Archive lead (soft delete)
app.post("/api/leads/:id/archive", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        archived: true,
        archivedAt: new Date(),
        archiveReason: reason || null,
      },
    });

    res.json(lead);
  } catch (error) {
    console.error("Error archiving lead:", error);
    res.status(500).json({ error: "Failed to archive lead" });
  }
});

// Unarchive lead
app.delete("/api/leads/:id/archive", async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        archived: false,
        archivedAt: null,
        archiveReason: null,
      },
    });

    res.json(lead);
  } catch (error) {
    console.error("Error unarchiving lead:", error);
    res.status(500).json({ error: "Failed to unarchive lead" });
  }
});

// Draft outreach message for a lead (LLM-generated)
app.post("/api/leads/:id/draft-outreach", async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { painPoints: true },
    });

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const apiKey = process.env.FIREWORKS_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "FIREWORKS_API_KEY not configured" });
    }

    const CREATORS_URL = "https://digiart.btechhub.top/creators";

    const painPointsSummary = lead.painPoints
      .map((pp) => `- ${pp.category} (${pp.severity}): ${pp.description}`)
      .join("\n");

    const prompt = `You are writing a short Reddit comment reply on behalf of DigiArt, a platform where digital artists offer subscription-based printed art booklets to their followers.

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

    const model = new ChatFireworks({
      model: "accounts/fireworks/models/minimax-m2p5",
      temperature: 0.7,
      apiKey,
    });

    const response = await model.invoke(prompt);
    const draft =
      typeof response.content === "string"
        ? response.content.trim()
        : String(response.content);

    res.json({ draft, leadId: id });
  } catch (error) {
    console.error("Error drafting outreach:", error);
    res.status(500).json({ error: "Failed to draft outreach message" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Serve index.html for all other routes (SPA fallback for React Router)
if (USE_REACT) {
  app.use((req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing server...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing server...");
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Lead browser server running at http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
});
