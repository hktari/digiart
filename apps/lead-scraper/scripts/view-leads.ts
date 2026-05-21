#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";

async function viewLeads() {
  const prisma = new PrismaClient();

  const leads = await prisma.lead.findMany({
    take: 10,
    orderBy: { scrapedAt: "desc" },
    include: { painPoints: true },
  });

  console.log(`\n📊 Recent Leads (${leads.length}):\n`);

  for (const lead of leads) {
    console.log(`Title: ${lead.title}`);
    console.log(`Subreddit: r/${lead.subreddit}`);
    console.log(`Score: ${lead.score || "N/A"}`);
    console.log(`Hot Lead: ${lead.isHotLead ? "🔥 YES" : "No"}`);
    console.log(`Pain Points: ${lead.painPoints.length}`);
    if (lead.reasoning) {
      console.log(`Reasoning: ${lead.reasoning.substring(0, 150)}...`);
    }
    console.log(`URL: ${lead.postUrl}`);
    console.log("");
  }

  await prisma.$disconnect();
}

viewLeads();
