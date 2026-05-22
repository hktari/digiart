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
  createdAt: Date;
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

  const date = new Date(lead.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
${colors.bright}[${index}]${colors.reset} ${hotLeadBadge} ${colors.bright}${lead.title}${colors.reset}
  ${colors.dim}r/${lead.subreddit} • Score: ${scoreColor}${lead.score}${colors.reset}${colors.dim} • ${date}${colors.reset}
  ${colors.blue}${lead.url}${colors.reset}
  
  ${colors.yellow}Reasoning:${colors.reset} ${lead.reasoning}
  
  ${colors.yellow}Pain Points:${colors.reset}
${painPointsList}
`;
}

async function fetchLeads(
  filter: "all" | "hot" | "new",
  limit = 20,
): Promise<LeadWithDetails[]> {
  const where =
    filter === "hot"
      ? { isHotLead: true }
      : filter === "new"
        ? {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
            },
          }
        : {};

  const leads = await prisma.lead.findMany({
    where,
    orderBy: [{ isHotLead: "desc" }, { score: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      painPoints: true,
    },
  });

  return leads;
}

async function showStats(): Promise<void> {
  const totalLeads = await prisma.lead.count();
  const hotLeads = await prisma.lead.count({ where: { isHotLead: true } });
  const last24h = await prisma.lead.count({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  console.log(`
${colors.bright}📊 Lead Statistics${colors.reset}
  Total Leads: ${colors.cyan}${totalLeads}${colors.reset}
  Hot Leads: ${colors.red}${hotLeads}${colors.reset}
  Last 24h: ${colors.green}${last24h}${colors.reset}
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
  let currentFilter: "all" | "hot" | "new" = "all";

  async function displayLeads(): Promise<void> {
    console.clear();
    await showStats();

    console.log(
      `${colors.bright}Filter: ${currentFilter.toUpperCase()}${colors.reset} (showing ${currentLeads.length} leads)\n`,
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
  ${colors.green}a${colors.reset} - Show all leads
  ${colors.green}h${colors.reset} - Show hot leads only
  ${colors.green}n${colors.reset} - Show new leads (last 24h)
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
        currentLeads = await fetchLeads("all");
        await displayLeads();
        prompt();
        return;
      }

      if (input === "h") {
        currentFilter = "hot";
        currentLeads = await fetchLeads("hot");
        await displayLeads();
        prompt();
        return;
      }

      if (input === "n") {
        currentFilter = "new";
        currentLeads = await fetchLeads("new");
        await displayLeads();
        prompt();
        return;
      }

      if (input === "r") {
        currentLeads = await fetchLeads(currentFilter);
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

  // Initial load
  currentLeads = await fetchLeads("all");
  await displayLeads();
  prompt();
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
