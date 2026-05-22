#!/usr/bin/env tsx

/**
 * Interactive CLI for browsing and managing leads
 * Usage: npm run browse
 */

import { spawn } from "node:child_process";
import * as readline from "node:readline";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface LeadWithDetails {
  id: string;
  postId: string;
  title: string;
  url: string;
  subreddit: string;
  score: number;
  isHotLead: boolean;
  reasoning: string;
  scrapedAt: Date;
  reachedOut: boolean;
  reachedOutAt: Date | null;
  outreachNotes: string | null;
  painPoints: Array<{
    category: string;
    description: string;
    severity: string;
  }>;
}

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function openUrl(url: string): void {
  const platform = process.platform;
  let command: string;

  if (platform === "darwin") {
    command = "open";
  } else if (platform === "win32") {
    command = "start";
  } else {
    command = "xdg-open";
  }

  spawn(command, [url], { detached: true, stdio: "ignore" }).unref();
}

function formatLead(lead: LeadWithDetails, index: number): string {
  const hotLeadBadge = lead.isHotLead
    ? `${colors.red}${colors.bright}🔥 HOT${colors.reset}`
    : `${colors.dim}○${colors.reset}`;

  const reachedOutBadge = lead.reachedOut
    ? `${colors.green}✓ Contacted${colors.reset}`
    : `${colors.dim}○ Not contacted${colors.reset}`;

  const scoreColor =
    lead.score >= 80
      ? colors.red
      : lead.score >= 60
        ? colors.yellow
        : colors.dim;

  const painPointsList = lead.painPoints
    .map((pp) => {
      const severityEmoji =
        pp.severity === "high" ? "🔴" : pp.severity === "medium" ? "🟡" : "🟢";
      return `    ${severityEmoji} ${colors.cyan}${pp.category}${colors.reset}: ${pp.description}`;
    })
    .join("\n");

  const date = new Date(lead.scrapedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const outreachInfo =
    lead.reachedOut && lead.reachedOutAt
      ? `\n  ${colors.green}Reached out: ${new Date(
          lead.reachedOutAt,
        ).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}${colors.reset}${lead.outreachNotes ? `\n  ${colors.dim}Notes: ${lead.outreachNotes}${colors.reset}` : ""}`
      : "";

  return `
${colors.bright}[${index}]${colors.reset} ${hotLeadBadge} ${reachedOutBadge} ${colors.bright}${lead.title}${colors.reset}
  ${colors.dim}r/${lead.subreddit} • Score: ${scoreColor}${lead.score}${colors.reset}${colors.dim} • ${date}${colors.reset}
  ${colors.blue}${lead.url}${colors.reset}
  
  ${colors.yellow}Reasoning:${colors.reset} ${lead.reasoning}
  
  ${colors.yellow}Pain Points:${colors.reset}
${painPointsList}${outreachInfo}
`;
}

async function fetchLeads(
  filter: "all" | "hot" | "new" | "contacted" | "not-contacted",
  sortBy: "score" | "date" = "score",
  limit = 20,
): Promise<LeadWithDetails[]> {
  const where =
    filter === "hot"
      ? { isHotLead: true }
      : filter === "new"
        ? {
            scrapedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
            },
          }
        : filter === "contacted"
          ? { reachedOut: true }
          : filter === "not-contacted"
            ? { reachedOut: false }
            : {};

  const orderBy =
    sortBy === "score"
      ? [
          { isHotLead: "desc" as const },
          { score: "desc" as const },
          { scrapedAt: "desc" as const },
        ]
      : [{ scrapedAt: "desc" as const }, { score: "desc" as const }];

  const leads = await prisma.lead.findMany({
    where,
    orderBy,
    take: limit,
    include: {
      painPoints: true,
    },
  });

  return leads.map((lead) => ({
    ...lead,
    url: lead.postUrl,
    score: lead.score ?? 0,
    reasoning: lead.reasoning ?? "",
  }));
}

async function showStats(): Promise<void> {
  const totalLeads = await prisma.lead.count();
  const hotLeads = await prisma.lead.count({ where: { isHotLead: true } });
  const last24h = await prisma.lead.count({
    where: {
      scrapedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });
  const contacted = await prisma.lead.count({ where: { reachedOut: true } });
  const notContacted = await prisma.lead.count({
    where: { reachedOut: false },
  });

  console.log(`
${colors.bright}📊 Lead Statistics${colors.reset}
  Total Leads: ${colors.cyan}${totalLeads}${colors.reset}
  Hot Leads: ${colors.red}${hotLeads}${colors.reset}
  Last 24h: ${colors.green}${last24h}${colors.reset}
  
  Contacted: ${colors.green}${contacted}${colors.reset}
  Not Contacted: ${colors.yellow}${notContacted}${colors.reset}
`);
}

async function main(): Promise<void> {
  console.clear();
  console.log(`
${colors.bright}${colors.cyan}╔═══════════════════════════════════════╗
║         Lead Browser v1.0             ║
╚═══════════════════════════════════════╝${colors.reset}
`);

  await showStats();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let currentLeads: LeadWithDetails[] = [];
  let currentFilter: "all" | "hot" | "new" | "contacted" | "not-contacted" =
    "not-contacted"; // Default to not-contacted to focus on fresh leads
  let currentSort: "score" | "date" = "score";

  async function displayLeads(): Promise<void> {
    console.clear();
    await showStats();

    const sortLabel =
      currentSort === "score" ? "Score (High→Low)" : "Date (New→Old)";
    console.log(
      `${colors.bright}Filter: ${currentFilter.toUpperCase()} | Sort: ${sortLabel}${colors.reset} (showing ${currentLeads.length} leads)\n`,
    );

    for (let i = 0; i < currentLeads.length; i++) {
      console.log(formatLead(currentLeads[i], i + 1));
      console.log(`${colors.dim}${"─".repeat(80)}${colors.reset}`);
    }

    showMenu();
  }

  function showMenu(): void {
    console.log(`
${colors.bright}Commands:${colors.reset}
  ${colors.green}[1-${currentLeads.length}]${colors.reset} - Open lead URL in browser
  ${colors.green}m [1-${currentLeads.length}]${colors.reset} - Mark lead as contacted (e.g., "m 1")
  ${colors.green}d [1-${currentLeads.length}]${colors.reset} - Draft outreach message (e.g., "d 1")
  ${colors.green}a${colors.reset} - Show all leads
  ${colors.green}h${colors.reset} - Show hot leads only
  ${colors.green}n${colors.reset} - Show new leads (last 24h)
  ${colors.green}c${colors.reset} - Show contacted leads
  ${colors.green}nc${colors.reset} - Show not contacted leads ${colors.dim}(default)${colors.reset}
  ${colors.green}ss${colors.reset} - Sort by score
  ${colors.green}sd${colors.reset} - Sort by date
  ${colors.green}r${colors.reset} - Refresh current view
  ${colors.green}s${colors.reset} - Show statistics
  ${colors.green}q${colors.reset} - Quit

${colors.cyan}>${colors.reset} `);
  }

  function prompt(): void {
    rl.question("", async (answer) => {
      const input = answer.trim().toLowerCase();

      if (input === "q" || input === "quit" || input === "exit") {
        console.log(
          `\n${colors.green}Thanks for using Lead Browser!${colors.reset}\n`,
        );
        rl.close();
        await prisma.$disconnect();
        process.exit(0);
        return;
      }

      if (input === "a") {
        currentFilter = "all";
        currentLeads = await fetchLeads("all", currentSort);
        await displayLeads();
        prompt();
        return;
      }

      if (input === "h") {
        currentFilter = "hot";
        currentLeads = await fetchLeads("hot", currentSort);
        await displayLeads();
        prompt();
        return;
      }

      if (input === "n") {
        currentFilter = "new";
        currentLeads = await fetchLeads("new", currentSort);
        await displayLeads();
        prompt();
        return;
      }

      if (input === "c") {
        currentFilter = "contacted";
        currentLeads = await fetchLeads("contacted", currentSort);
        await displayLeads();
        prompt();
        return;
      }

      if (input === "nc") {
        currentFilter = "not-contacted";
        currentLeads = await fetchLeads("not-contacted", currentSort);
        await displayLeads();
        prompt();
        return;
      }

      // Check for "m N" command (mark as contacted)
      if (input.startsWith("m ")) {
        const leadIndex = Number.parseInt(input.substring(2), 10);
        if (
          !Number.isNaN(leadIndex) &&
          leadIndex >= 1 &&
          leadIndex <= currentLeads.length
        ) {
          const lead = currentLeads[leadIndex - 1];

          // Prompt for optional notes
          rl.question(
            `${colors.yellow}Add notes (optional, press Enter to skip):${colors.reset} `,
            async (notes) => {
              const trimmedNotes = notes.trim();

              await prisma.lead.update({
                where: { id: lead.id },
                data: {
                  reachedOut: true,
                  reachedOutAt: new Date(),
                  outreachNotes: trimmedNotes || null,
                },
              });

              console.log(
                `\n${colors.green}✓ Marked as contacted:${colors.reset} ${lead.title}\n`,
              );

              // Refresh the current view
              currentLeads = await fetchLeads(currentFilter, currentSort);
              await displayLeads();
              prompt();
            },
          );
          return;
        }
        console.log(
          `${colors.red}Invalid lead number. Please try again.${colors.reset}\n`,
        );
        showMenu();
        prompt();
        return;
      }

      // Check for "d N" command (draft outreach)
      if (input.startsWith("d ")) {
        const leadIndex = Number.parseInt(input.substring(2), 10);
        if (
          !Number.isNaN(leadIndex) &&
          leadIndex >= 1 &&
          leadIndex <= currentLeads.length
        ) {
          console.log(
            `\n${colors.cyan}To draft outreach message for lead #${leadIndex}, run:${colors.reset}`,
          );
          console.log(
            `${colors.green}npm run draft-outreach ${leadIndex}${colors.reset}\n`,
          );

          showMenu();
          prompt();
          return;
        }
        console.log(
          `${colors.red}Invalid lead number. Please try again.${colors.reset}\n`,
        );
        showMenu();
        prompt();
        return;
      }

      if (input === "ss") {
        currentSort = "score";
        currentLeads = await fetchLeads(currentFilter, "score");
        await displayLeads();
        prompt();
        return;
      }

      if (input === "sd") {
        currentSort = "date";
        currentLeads = await fetchLeads(currentFilter, "date");
        await displayLeads();
        prompt();
        return;
      }

      if (input === "r") {
        currentLeads = await fetchLeads(currentFilter, currentSort);
        await displayLeads();
        prompt();
        return;
      }

      if (input === "s") {
        console.clear();
        await showStats();
        showMenu();
        prompt();
        return;
      }

      // Check if it's a number (opening a lead URL)
      const leadIndex = Number.parseInt(input, 10);
      if (
        !Number.isNaN(leadIndex) &&
        leadIndex >= 1 &&
        leadIndex <= currentLeads.length
      ) {
        const lead = currentLeads[leadIndex - 1];
        console.log(`\n${colors.green}Opening:${colors.reset} ${lead.url}\n`);
        openUrl(lead.url);
        showMenu();
        prompt();
        return;
      }

      console.log(
        `${colors.red}Invalid command. Please try again.${colors.reset}\n`,
      );
      showMenu();
      prompt();
    });
  }

  // Initial load - use default filter (not-contacted)
  currentLeads = await fetchLeads(currentFilter, currentSort);
  await displayLeads();
  prompt();
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
