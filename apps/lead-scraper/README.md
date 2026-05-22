# Lead Scraper

Automated lead generation system that monitors AI art subreddits, identifies pain points, and qualifies potential customers using LLM.

## Features

- 📡 **Reddit RSS Scraping**: Monitors 5 AI art subreddits daily
- 🔍 **Keyword Filtering**: Identifies posts with monetization/platform pain points
- 🤖 **LLM Qualification**: Uses Fireworks AI to score and qualify leads
- 💾 **Database Storage**: Separate Neon PostgreSQL database (isolated from MVP)
- 📲 **Telegram Notifications**: Daily summaries + real-time hot lead alerts
- 🎯 **LangGraph Orchestration**: Robust state machine with error handling

## Architecture

```
Reddit RSS Feeds
     ↓
[Scrape] → [Filter] → [Qualify] → [Store] → [Notify]
     ↓          ↓          ↓          ↓         ↓
  50 posts   keyword    LLM      database  Telegram
  per sub    matching   scoring   (Prisma)  messages
```

## Setup

### Prerequisites

- Node.js 20+
- pnpm
- Separate Neon database (NOT the MVP database)
- Fireworks AI API key
- Telegram bot

### Installation

```bash
cd apps/lead-scraper
pnpm install
```

### Environment Variables

Create `.env` file with:

```bash
# IMPORTANT: Use a SEPARATE Neon database, not the MVP one!
DATABASE_URL="postgresql://..."

FIREWORKS_API_KEY="your-key"
TELEGRAM_BOT_TOKEN="your-token"
TELEGRAM_CHAT_ID="your-chat-id"

DEBUG=false  # optional
```

### Database Setup

```bash
# Push schema to database
npx prisma db push

# View data in browser
npx prisma studio
```

## Usage

### Scraping Leads

**Test Mode (10 posts per subreddit):**
```bash
pnpm run scrape:test
```

**Daily Mode (50 posts per subreddit):**
```bash
pnpm run scrape
```

### Browsing Leads

**Interactive lead browser:**
```bash
pnpm run browse
```

Features:
- 📊 View statistics (total leads, hot leads, recent)
- 🔍 Filter by: all leads, hot leads, or new leads (last 24h)
- 🌐 Open lead URLs in browser with one keystroke
- 🎨 Color-coded display (hot leads, score, pain points)
- ⚡ Real-time navigation

Commands in browser:
- `[1-N]` - Open lead URL in browser
- `a` - Show all leads
- `h` - Show hot leads only
- `n` - Show new leads (last 24h)
- `r` - Refresh current view
- `s` - Show statistics
- `q` - Quit

### Drafting Outreach Messages

**Generate personalized outreach message:**
```bash
pnpm run draft-outreach <lead-id>
```

This generates a customized Reddit DM based on:
- Primary pain point identified
- Subreddit context
- Post title
- Suggested subject line and message body

**Workflow:**
1. Browse leads with `pnpm run browse`
2. Note the lead ID from the database
3. Run `pnpm run draft-outreach <lead-id>`
4. Customize the message
5. Send via Reddit DM

### Development

```bash
# Run tests
pnpm test

# Run e2e tests
pnpm test:e2e

# Type check
pnpm run typecheck

# Format code
pnpm run format
```

## Subreddits Monitored

- r/midjourney
- r/StableDiffusion
- r/DeviantArt
- r/civitai
- r/aiArt

## Pain Point Categories

1. **monetization**: earnings, selling art, making money
2. **platform_fees**: high commissions, expensive fees
3. **discovery**: low visibility, algorithm issues
4. **spam_bots**: fake accounts, stolen art
5. **payment_issues**: withdrawal problems, missing payments
6. **disclosure_requirements**: AI labeling requirements
7. **print_physical**: printing, physical art, posters, canvas, wall art
8. **quality_curation**: platform oversaturation, quality control issues

## Scheduling (Linux Cron)

### Recommended: Use Wrapper Script (with error notifications)

```bash
# Edit crontab
crontab -e

# Run every 2 hours (recommended)
0 */2 * * * /path/to/apps/lead-scraper/scripts/run-scraper.sh

# Or every hour
0 * * * * /path/to/apps/lead-scraper/scripts/run-scraper.sh

# Or daily at 9am
0 9 * * * /path/to/apps/lead-scraper/scripts/run-scraper.sh
```

The wrapper script:
- ✅ Logs all output with timestamps
- ✅ Sends Telegram alerts on fatal errors
- ✅ Cleans up old logs automatically (keeps 30 days)

### Alternative: Direct pnpm execution

```bash
0 */2 * * * cd /path/to/apps/lead-scraper && pnpm run scrape >> logs/scraper.log 2>&1
```

**Note:** Direct execution only sends error notifications for caught errors. Use wrapper script for complete coverage.

## Error Notifications

Errors are automatically sent to Telegram:

- 🚨 **Fatal errors**: Sent immediately (crashes, database failures, etc.)
- ⚠️ **Non-fatal errors**: Included in daily summary (RSS parsing failures, etc.)

All errors include:
- Error message
- Stack trace
- Context
- Timestamp

## Database Schema

- **ScrapingRun**: Tracks each scraping session
- **Lead**: Individual Reddit posts with qualification data
- **PainPoint**: Identified pain points per lead

## Expected Results

- 250 total posts/day (50 per subreddit)
- ~75 pass keyword filter (30%)
- ~19 qualified leads (25% of filtered)
- ~3 hot leads (15% of qualified, score ≥80)

## Troubleshooting

### Prisma Client Issues

```bash
npx prisma generate
```

### TypeScript Errors

```bash
pnpm run typecheck
```

### Test Telegram Connection

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"
```

## Separation from MVP

This project is **completely isolated** from the Next.js MVP:

- ✅ Separate database
- ✅ Separate dependencies
- ✅ Separate codebase (apps/lead-scraper)
- ✅ No shared code or imports
- ✅ Independent deployment

## License

Private - Internal Use Only
