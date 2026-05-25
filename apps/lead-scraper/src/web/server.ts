import path from "node:path";
import { fileURLToPath } from "node:url";
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
        where = { isHotLead: true, isIrrelevant: false };
        break;
      case "new":
        where = {
          scrapedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
          isIrrelevant: false,
        };
        break;
      case "contacted":
        where = { reachedOut: true };
        break;
      case "not-contacted":
        where = { reachedOut: false, isIrrelevant: false };
        break;
      case "irrelevant":
        where = { isIrrelevant: true };
        break;
      case "relevant":
        where = { isIrrelevant: false };
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
        orderBy = [{ scrapedAt: "desc" as const }, { score: "desc" as const }];
        break;
      case "score":
      default:
        orderBy = [
          { isHotLead: "desc" as const },
          { score: "desc" as const },
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
    const [totalLeads, hotLeads, last24h, contacted, notContacted, irrelevant] =
      await Promise.all([
        prisma.lead.count(),
        prisma.lead.count({ where: { isHotLead: true, isIrrelevant: false } }),
        prisma.lead.count({
          where: {
            scrapedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
            isIrrelevant: false,
          },
        }),
        prisma.lead.count({ where: { reachedOut: true } }),
        prisma.lead.count({
          where: { reachedOut: false, isIrrelevant: false },
        }),
        prisma.lead.count({ where: { isIrrelevant: true } }),
      ]);

    res.json({
      totalLeads,
      hotLeads,
      last24h,
      contacted,
      notContacted,
      irrelevant,
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
