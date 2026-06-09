# Lead Scraper - Documentation Index

This folder contains comprehensive documentation about the lead scoring system, database schema, and implementation details.

## Quick Start - New to the System?

1. Start here: **[SCORING_SUMMARY.md](./SCORING_SUMMARY.md)** (5 min read)
   - Two-stage scoring pipeline overview
   - Scoring thresholds and categories
   - Quick reference for common operations

2. Then: **[CODE_EXAMPLES.md](./CODE_EXAMPLES.md)** (15 min read)
   - Real-world usage examples
   - API calls and responses
   - Database operations
   - Troubleshooting guide

3. For deep dive: **[SYSTEM_ANALYSIS.md](./SYSTEM_ANALYSIS.md)** (30 min read)
   - Complete system architecture
   - Detailed database schema
   - All fields and their purposes
   - Current limitations and future opportunities

## Documentation Files

### SCORING_SUMMARY.md
Quick reference guide for the lead scoring system.

**Covers:**
- Two-stage pipeline (keyword filter + LLM scoring)
- Scoring thresholds (0-100 scale)
- Pain point categories (8 types)
- Lead status fields (qualification, outreach, irrelevance, archive)
- Daily pipeline flow
- API endpoints
- Database indexes

**Best for:** Quick lookups, understanding the basics, finding specific API endpoints

---

### CODE_EXAMPLES.md
Practical code examples and usage patterns.

**Covers:**
- Keyword filter examples (input/output)
- LLM qualification examples (hot, warm, cold leads)
- Database operations (save, mark irrelevant, contact)
- Web API usage (list, filter, statistics)
- Full pipeline flow
- Outreach message generation
- Data model relationships
- Test mode commands
- SQL query patterns
- Troubleshooting scenarios

**Best for:** Learning by example, implementing features, troubleshooting issues

---

### SYSTEM_ANALYSIS.md
Comprehensive technical documentation.

**Covers:**
- Complete lead scoring system architecture
- Two-stage pipeline with detailed algorithms
- Pain point categories and definitions
- Lead status tracking and classification
- Database schema (all models and fields)
- Feedback mechanisms (what exists, what's missing)
- Full pipeline orchestration (LangGraph)
- Database service operations
- Web UI and API documentation
- Current limitations and improvement opportunities
- File structure reference
- Keywords for future searching

**Best for:** Understanding the system deeply, making architectural decisions, planning improvements

---

### WEB_UI.md
Guide to using the web interface.

**Covers:**
- How to access the web UI
- Dashboard overview
- Filtering and sorting leads
- Marking leads (contacted, irrelevant, archived)
- Drafting outreach messages
- Statistics dashboard

**Best for:** Day-to-day usage of the lead browser

---

## Key Concepts

### Lead Scoring (Two Stages)

**Stage 1: Keyword Filter**
- Simple rule-based matching
- Keywords with weights (1-3)
- Minimum threshold: 3
- Pass rate: ~30% of posts

**Stage 2: LLM Qualification**
- AI-powered scoring (0-100)
- Evaluates: pain intensity, buying intent, fit, urgency
- Threshold for "hot lead": score >= 80
- Pass rate: ~25% of filtered posts

### Lead Statuses

- **qualified**: Has LLM score (0-100)
- **isHotLead**: Score >= 80 (immediate priority)
- **reachedOut**: User has been contacted
- **isIrrelevant**: Marked as false positive (user feedback)
- **archived**: Soft-deleted for curation

### Pain Point Categories

8 categories identified by LLM from Reddit posts:
1. Monetization
2. Platform fees
3. Discovery
4. Spam/bots
5. Payment issues
6. Disclosure requirements
7. Print/physical
8. Quality curation

---

## Quick Lookup Table

| I want to... | See this file | Section |
|---|---|---|
| Understand the scoring system | SCORING_SUMMARY.md | "Two-Stage Scoring Pipeline" |
| See code examples | CODE_EXAMPLES.md | "1. Keyword Filter Examples" |
| Check database schema | SYSTEM_ANALYSIS.md | "3. DATA STORAGE & DATABASE SCHEMA" |
| Find API endpoints | SCORING_SUMMARY.md | "API Endpoints for Scoring/Status" |
| Mark a lead as irrelevant | CODE_EXAMPLES.md | "3. Database Operations Examples" |
| Generate outreach message | CODE_EXAMPLES.md | "6. Outreach Message Generation" |
| Understand limitations | SYSTEM_ANALYSIS.md | "4. FEEDBACK MECHANISMS" |
| Find files in project | SYSTEM_ANALYSIS.md | "9. FILE STRUCTURE REFERENCE" |
| Use the web UI | WEB_UI.md | Full guide |
| See query patterns | CODE_EXAMPLES.md | "9. Key Indexes & Query Patterns" |

---

## System Architecture Overview

```
Reddit RSS Feeds (5 subreddits)
         |
         v
[Scrape] → 250 posts/day
         |
         v
[Filter] → Keyword matching (30% pass)
         |
         v
[Qualify] → LLM scoring (25% pass)
         |
         v
[Store] → PostgreSQL database
         |
         v
[Notify] → Telegram alerts
         |
         v
Web UI (localhost:3100)
```

**Pipeline stages:**
1. RSS fetching from 5 AI art subreddits
2. Keyword filter (pain point detection)
3. LLM qualification (buying intent scoring)
4. Database storage (Prisma + PostgreSQL)
5. Telegram notifications
6. Web browser interface

---

## Important Limitations (No Adaptive Learning)

The current system:
- ✅ Collects user feedback (irrelevance marks)
- ✅ Stores all data in database
- ❌ Does NOT use feedback to improve scoring
- ❌ Has STATIC keyword weights (hardcoded)
- ❌ Has NO fine-tuning of LLM
- ❌ Has NO performance metrics tracking

**See:** SYSTEM_ANALYSIS.md section 4 for details and future enhancement opportunities

---

## Development Commands

```bash
# View data
pnpm run web:dev              # Web UI (localhost:3100)
pnpm run db:studio:dev        # Prisma Studio

# Run scraper
pnpm run scrape:dev           # Test mode (10 posts/subreddit)
pnpm run scrape:test:dev      # Alias for test mode

# Database
pnpm run db:push:dev          # Push schema
pnpm run db:generate          # Generate Prisma client

# Testing
pnpm test                     # Run all tests
pnpm test:e2e                 # Run e2e tests

# Code quality
pnpm run format               # Format code
pnpm run typecheck            # TypeScript checking
```

---

## File Reference

### Source Code
- `src/filters/keyword-filter.ts` - Stage 1 scoring
- `src/qualifiers/llm-qualifier.ts` - Stage 2 scoring
- `src/database/database-service.ts` - Database operations
- `src/web/server.ts` - Express API server
- `src/graph/orchestrator.ts` - Pipeline orchestration
- `prisma/schema.prisma` - Database schema

### Documentation
- `SCORING_SUMMARY.md` - Quick reference
- `CODE_EXAMPLES.md` - Practical examples
- `SYSTEM_ANALYSIS.md` - Deep dive
- `WEB_UI.md` - Web interface guide

---

## Troubleshooting

### Can't find something?
- Check the "Quick Lookup Table" above
- Search for keywords in SYSTEM_ANALYSIS.md section 10
- Look for example code in CODE_EXAMPLES.md

### Want to understand a specific concept?
- Pain points: See SCORING_SUMMARY.md "Pain Point Categories"
- Scoring: See CODE_EXAMPLES.md "Decision Tree"
- Database: See SYSTEM_ANALYSIS.md "3. DATA STORAGE"

### Making changes?
- Keyword weights: `src/filters/keyword-filter.ts`
- LLM prompt: `src/qualifiers/llm-qualifier.ts` (buildPrompt method)
- Score thresholds: `src/graph/orchestrator.ts` and `src/web/server.ts`
- Database schema: `prisma/schema.prisma`

---

## Next Steps

1. **Read:** Start with SCORING_SUMMARY.md
2. **Explore:** Check CODE_EXAMPLES.md for practical usage
3. **Understand:** Deep dive into SYSTEM_ANALYSIS.md if needed
4. **Run:** Try `pnpm run scrape:dev` to see it in action
5. **Browse:** Open `pnpm run web:dev` to view leads in UI

---

## Recent Updates

- Added comprehensive system analysis (SYSTEM_ANALYSIS.md)
- Created quick reference guide (SCORING_SUMMARY.md)
- Added practical code examples (CODE_EXAMPLES.md)
- Documented all limitations and opportunities for improvement

---

Last updated: May 31, 2026
