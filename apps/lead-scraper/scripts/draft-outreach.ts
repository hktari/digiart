#!/usr/bin/env tsx
/**
 * Helper script to draft Reddit outreach messages
 * Usage: npm run draft-outreach <lead-id>
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface OutreachTemplate {
  subject: string;
  body: string;
}

function generateOutreachMessage(lead: {
  title: string;
  subreddit: string;
  url: string;
  painPoints: Array<{ category: string; description: string }>;
}): OutreachTemplate {
  const username = lead.url.match(/\/u\/([^/]+)/)?.[1] || "there";

  // Identify primary pain point
  const primaryPainPoint = lead.painPoints[0];

  let subject = "";
  let body = "";

  switch (primaryPainPoint?.category) {
    case "monetization":
      subject = "Saw your post about monetizing AI art";
      body = `Hey ${username},

I saw your post in r/${lead.subreddit} about monetization challenges. I'm building a platform specifically for AI artists to sell their work with fair revenue sharing (85% to artists).

We're in early beta and looking for artists who are actively trying to monetize. Would you be interested in learning more or getting early access?

No pressure—just thought this might be relevant based on your post.`;
      break;

    case "platform_fees":
      subject = "Alternative to high platform fees";
      body = `Hey ${username},

Saw your post in r/${lead.subreddit} about platform fees. I completely understand the frustration with 30-50% commissions.

I'm building a marketplace specifically for AI art with much fairer revenue sharing (85% to artists, 15% platform fee). We're in early beta and would love feedback from artists who care about keeping more of what they earn.

Interested in checking it out?`;
      break;

    case "print_physical":
      subject = "Re: printing AI art";
      body = `Hey ${username},

I noticed your post in r/${lead.subreddit} about printing/physical art. I'm building a platform that handles digital-to-physical fulfillment for AI artists—you upload digital files, we handle printing, framing, and shipping.

We're in early beta and looking for artists interested in offering physical prints without the logistics hassle. Would this be useful for you?`;
      break;

    case "quality_curation":
      subject = "Platform with quality curation";
      body = `Hey ${username},

Saw your comment in r/${lead.subreddit} about platform oversaturation and quality issues. I'm building a curated marketplace for AI art with monthly upload limits to ensure quality over quantity.

The idea is to create a premium marketplace where serious artists can stand out, rather than getting buried in spam. We're in early beta—would you be interested in learning more?`;
      break;

    case "discovery":
      subject = "Helping AI artists get discovered";
      body = `Hey ${username},

Noticed your post in r/${lead.subreddit} about discovery challenges. I'm working on a curated marketplace specifically for AI art where quality work actually gets seen.

We're focusing on curation and discovery rather than being yet another marketplace where everything gets buried. Early beta right now—would you be interested?`;
      break;

    case "payment_issues":
      subject = "Re: payment processing for AI art";
      body = `Hey ${username},

Saw your post in r/${lead.subreddit} about payment issues. I'm building a marketplace for AI art with reliable payment processing built in from day one.

We're in early beta and making sure the payment experience is smooth for both artists and buyers. Would you be interested in checking it out?`;
      break;

    default:
      subject = "AI art marketplace for serious artists";
      body = `Hey ${username},

I came across your post in r/${lead.subreddit} and thought you might be interested in a new marketplace I'm building specifically for AI artists.

Key features:
- 85% revenue share (you keep most of what you earn)
- Curated marketplace with quality control
- Digital + physical print fulfillment
- Built by artists, for artists

We're in early beta. Would you be interested in learning more?`;
  }

  body += `

Best,
[Your name]

---
Context: ${lead.title}
URL: ${lead.url}`;

  return { subject, body };
}

async function main(): Promise<void> {
  const input = process.argv[2];

  if (!input) {
    console.error("Usage: npm run draft-outreach <lead-number-or-id>");
    console.error("\nExamples:");
    console.error(
      "  npm run draft-outreach 1          # Use lead #1 from browser",
    );
    console.error("  npm run draft-outreach clt123...  # Use database ID");
    console.error("\nTip: Run 'npm run browse' to see lead numbers");
    process.exit(1);
  }

  let lead;

  // Check if input is a number (lead position from browser)
  const leadNumber = Number.parseInt(input, 10);
  if (!Number.isNaN(leadNumber) && leadNumber > 0) {
    // Fetch leads sorted by score (same as browser default)
    const leads = await prisma.lead.findMany({
      orderBy: [
        { isHotLead: "desc" },
        { score: "desc" },
        { scrapedAt: "desc" },
      ],
      take: leadNumber,
      include: { painPoints: true },
    });

    if (leadNumber > leads.length) {
      console.error(
        `Lead #${leadNumber} not found. Only ${leads.length} leads available.`,
      );
      process.exit(1);
    }

    lead = leads[leadNumber - 1];
  } else {
    // Assume it's a database ID
    lead = await prisma.lead.findUnique({
      where: { id: input },
      include: { painPoints: true },
    });

    if (!lead) {
      console.error(`Lead not found: ${input}`);
      console.error(
        "\nTip: Use lead number (1, 2, 3...) from 'npm run browse' instead",
      );
      process.exit(1);
    }
  }

  const message = generateOutreachMessage({
    title: lead.title,
    subreddit: lead.subreddit,
    url: lead.postUrl,
    painPoints: lead.painPoints.map((pp) => ({
      category: pp.category,
      description: pp.description,
    })),
  });

  console.log("\n=== OUTREACH MESSAGE DRAFT ===\n");
  console.log(`Subject: ${message.subject}\n`);
  console.log(message.body);
  console.log("\n=== END DRAFT ===\n");
  console.log("💡 Tip: Customize this message before sending!");
  console.log(`🔗 Open lead: ${lead.postUrl}\n`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
