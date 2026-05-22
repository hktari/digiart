# Browsing and Managing Leads

This guide shows you how to browse scraped leads, view their details, and draft personalized outreach messages.

## Quick Start

```bash
# 1. Browse leads interactively (DEVELOPMENT)
pnpm run browse:dev

# 2. Draft outreach message for a specific lead
pnpm --env-file=.env.dev run draft-outreach 1
```

**⚠️ Development vs Production:**
- Use `:dev` scripts during development (`browse:dev`, `db:studio:dev`)
- This uses `.env.dev` database (safe to reset)
- Production commands use `.env` (never touch during development)

## Lead Browser

### Starting the Browser

```bash
cd apps/lead-scraper

# Development (recommended)
pnpm run browse:dev

# Production (view-only, be careful)
pnpm run browse
```

### Features

The interactive browser provides:

- **Statistics Dashboard**: Total leads, hot leads, and recent leads (last 24h)
- **Filtered Views**: All leads, hot leads only, or new leads
- **Lead Details**: 
  - Title, subreddit, score, and timestamp
  - Hot lead indicator (🔥)
  - Color-coded scores (red = 80+, yellow = 60-79, dim = <60)
  - Qualification reasoning
  - Pain points with severity indicators (🔴 high, 🟡 medium, 🟢 low)
- **URL Opening**: Open Reddit posts in your browser with one keystroke

### Navigation Commands

| Command | Action |
|---------|--------|
| `[1-N]` | Open lead #N URL in browser |
| `m [1-N]` | Mark lead as contacted (prompts for optional notes) |
| `d [1-N]` | Show command to draft outreach message |
| `a` | Show all leads |
| `h` | Show hot leads only (score ≥ 80) |
| `n` | Show new leads (last 24 hours) |
| `c` | Show contacted leads |
| `nc` | Show not contacted leads |
| `ss` | Sort by score (high to low) |
| `sd` | Sort by date (newest first) |
| `r` | Refresh current view |
| `s` | Show statistics |
| `q` | Quit |

### Outreach Tracking

Mark leads as contacted to track your outreach efforts:

```
> m 1
Add notes (optional, press Enter to skip): Sent DM about monetization platform
✓ Marked as contacted: Looking for platform to sell my AI art
```

The browser displays:
- **✓ Contacted** badge for reached-out leads
- **○ Not contacted** badge for new leads
- Reached out date and notes in lead details
- Statistics showing contacted vs. not contacted counts

Filter by outreach status:
- `c` - Show only contacted leads
- `nc` - Show only leads you haven't reached out to yet

### Example Session

```
📊 Lead Statistics
  Total Leads: 142
  Hot Leads: 18
  Last 24h: 23

Filter: ALL (showing 20 leads)

[1] 🔥 HOT ○ Looking for platform to sell my AI art
  r/midjourney • Score: 85 • Dec 15, 9:30 AM
  https://reddit.com/r/midjourney/comments/abc123/...
  
  Reasoning: Strong buying intent, actively seeking monetization solution
  
  Pain Points:
    🔴 monetization: Wants to earn money from AI art but doesn't know where to start
    🟡 discovery: Concerned about getting buried in oversaturated marketplaces

────────────────────────────────────────────────────────────────────────────────

Commands:
  [1-20] - Open lead URL in browser
  a - Show all leads
  h - Show hot leads only
  n - Show new leads (last 24h)
  r - Refresh current view
  s - Show statistics
  q - Quit

> 1
```

When you type `1`, the browser automatically opens the Reddit post in your default web browser.

## Drafting Outreach Messages

### Usage

```bash
# Use lead number from browser (easiest!)
npm run draft-outreach 1

# Or use database ID
npm run draft-outreach clt123abc...
```

**Quick tip from browser:**
```
> d 1
To draft outreach message for lead #1, run:
npm run draft-outreach 1
```

### Output

The script generates a personalized message template based on:

1. **Primary pain point** - Determines the core message angle
2. **Subreddit context** - References where the post was found
3. **Post title** - Provides context
4. **Platform solutions** - Highlights relevant features

Example output:

```
=== OUTREACH MESSAGE DRAFT ===

Subject: Saw your post about monetizing AI art

Hey username123,

I saw your post in r/midjourney about monetization challenges. I'm building 
a platform specifically for AI artists to sell their work with fair revenue 
sharing (85% to artists).

We're in early beta and looking for artists who are actively trying to 
monetize. Would you be interested in learning more or getting early access?

No pressure—just thought this might be relevant based on your post.

Best,
[Your name]

---
Context: Looking for platform to sell my AI art
URL: https://reddit.com/r/midjourney/comments/abc123/...

=== END DRAFT ===

💡 Tip: Customize this message before sending!
🔗 Open lead: https://reddit.com/r/midjourney/comments/abc123/...
```

### Message Templates by Pain Point

The script automatically selects the appropriate template:

| Pain Point | Message Focus |
|-----------|---------------|
| `monetization` | Fair revenue sharing (85% to artists) |
| `platform_fees` | Low commission rates vs. competitors |
| `print_physical` | Digital-to-physical fulfillment |
| `quality_curation` | Curated marketplace with quality control |
| `discovery` | Better visibility and discovery |
| `payment_issues` | Reliable payment processing |
| `spam_bots` | Quality control and verification |
| `disclosure_requirements` | Transparent AI art labeling |

## Complete Workflow

### 1. Run the Scraper

```bash
# Development mode (10 posts, dev database)
pnpm run scrape:dev

# Or production mode (50 posts, production database)
pnpm run scrape
```

### 2. Browse Leads

```bash
# Development
pnpm run browse:dev
```

- Review hot leads first (`h` command)
- Open interesting leads in browser (type the number)
- Note which leads you want to reach out to

### 3. Draft Outreach Messages

**New simplified workflow:**

```bash
# In browser, note the lead number (e.g., #7)
# Then draft message using that number:
pnpm --env-file=.env.dev run draft-outreach 7
```

**Or use the quick helper in browser:**
```
> d 7
To draft outreach message for lead #7, run:
pnpm --env-file=.env.dev run draft-outreach 7
```

### 4. Mark as Contacted

```bash
# In browser after sending message:
> m 7
Add notes: Sent intro about platform features
```

### 5. Send Reddit DM

1. Open the Reddit URL (provided in the draft output)
2. Click on the user's profile
3. Click "Send Message" or "Start Chat"
4. Paste and customize your message
5. Send!

## Tips for Effective Outreach

### Personalization

Always customize the generated templates:
- Reference specific details from their post
- Add genuine context ("I noticed you mentioned X...")
- Keep it conversational, not salesy

### Timing

- Reach out to hot leads within 24-48 hours
- Don't overwhelm users - one message per user
- Respect if they don't respond

### Response Tracking

Consider creating a spreadsheet to track:
- Lead ID
- Username
- Date reached out
- Response status
- Follow-up notes

### Reddit Etiquette

- Be respectful and genuine
- Don't spam or mass message
- Provide value, don't just pitch
- Respect subreddit rules about self-promotion

## Troubleshooting

### Browser Won't Open URLs

**Linux users:** Make sure you have `xdg-utils` installed:
```bash
sudo apt install xdg-utils
```

**Mac users:** Uses `open` command (built-in)

**Windows users:** Uses `start` command (built-in)

### Can't Find Lead ID

Use Prisma Studio:
```bash
npm run db:studio
```

Or query directly:
```sql
SELECT id, title, url FROM "Lead" WHERE "isHotLead" = true ORDER BY score DESC;
```

### Database Connection Issues

Check your `.env` file has the correct `DATABASE_URL`.

## Advanced: Bulk Operations

### Export Hot Leads to CSV

```bash
# Using Prisma Studio
npm run db:studio
# Then use the export button in the UI
```

### Query Leads Programmatically

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const hotLeads = await prisma.lead.findMany({
  where: { isHotLead: true },
  include: { painPoints: true },
  orderBy: { score: 'desc' },
});

console.log(hotLeads);
```

## Questions?

See the main [README.md](../README.md) for more information about the lead scraper architecture and setup.
