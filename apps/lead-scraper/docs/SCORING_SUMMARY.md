# Lead Scoring System - Quick Reference

## Two-Stage Scoring Pipeline

```
POST (from Reddit)
     |
     v
[STAGE 1: KEYWORD FILTER]
  Simple rule-based
  8 pain point categories
  Keyword weights: 1-3
  Min threshold: 3
  ~30% pass rate
     |
     v
Passed Filter → matchedKeywords, passedFilter, totalScore (keyword weights)
     |
     v
[STAGE 2: LLM QUALIFICATION]
  Fireworks AI (minimax-m2p5)
  Evaluates: pain intensity, buying intent, fit, urgency
  Batch size: 5 concurrent
     |
     v
Qualified → score (0-100), reasoning, painPoints[], isHotLead
```

## Scoring Thresholds

### Stage 1: Keyword Filter
- **Passed**: totalScore >= 3
- **Examples**:
  - "How do I monetize my AI art" → matches "monetize" (weight 3) → PASS
  - "Stable Diffusion pricing is expensive" → matches "expensive" (weight 2) + "pricing" (no match) → needs more...
  - Just comments about AI art with no pain points → FAIL

### Stage 2: LLM Score
- **80-100**: Hot lead (clear pain, actively seeking, perfect fit)
- **60-79**: Warm lead (real pain, might be interested)
- **40-59**: Cold lead (mentions issues but not seeking)
- **0-39**: Not a lead (just discussing, no fit)

### Hot Lead Flag
- **Criteria**: LLM score >= 80
- **Action**: Immediate Telegram alert + marks as `isHotLead: true`
- **Expected rate**: ~3 per day (15% of qualified leads)

## Pain Point Categories (8 Total)

Identified by LLM from Reddit posts:

| Category | Examples | Severity |
|----------|----------|----------|
| **monetization** | earnings, selling art, making money | varies |
| **platform_fees** | high commissions, expensive fees | varies |
| **discovery** | low visibility, algorithm issues | varies |
| **spam_bots** | fake accounts, stolen art | varies |
| **payment_issues** | withdrawal problems, missing payments | varies |
| **disclosure_requirements** | AI labeling, regulatory compliance | varies |
| **print_physical** | printing, physical art, posters, canvas | varies |
| **quality_curation** | oversaturation, quality control | varies |

Each pain point has: `category`, `description`, `severity` (low/medium/high)

## Lead Status Fields

### Qualification Status
- `qualified: boolean` - Has LLM score
- `score: int?` - 0-100 (null if not qualified)
- `reasoning: string?` - Why this score
- `isHotLead: boolean` - score >= 80

### Outreach Status
- `reachedOut: boolean` - Contacted user
- `reachedOutAt: DateTime?` - When contacted
- `outreachNotes: string?` - Notes about outreach

### Irrelevance Status (User Feedback)
- `isIrrelevant: boolean` - Marked as false positive
- `irrelevanceReason: string?` - Why marked irrelevant
- `markedIrrelevantAt: DateTime?` - When marked
- `markedIrrelevantBy: string?` - "user" or "system"

### Archive Status
- `archived: boolean` - Soft deleted
- `archivedAt: DateTime?` - When archived
- `archiveReason: string?` - Why archived

## Keyword Weights Reference

### High Weight (3)
monetize, make money, fee, commission rate, take a cut, visibility, algorithm, buried, no views, no one sees, spam, bot, scam, fake account, payment, payout, withdraw, didn't receive, ai generated, disclosure, print, physical, poster, canvas, wall art, too much content, oversaturated, low quality, spam content, quality control

### Medium Weight (2)
earn, income, revenue, sell, profit, commission, percentage, expensive, hidden, shadowban, promote, harassment, stolen, copycat, stripe, paypal, transaction, pending, label, watermark, transparent, declare, framed, shipping, tangible, merchandise, curated, overwhelmed, flooding, diluted

### Low Weight (1)
cost

## Daily Pipeline Flow

```
Reddit RSS Feeds (5 subreddits)
         |
         v
[Scrape] → 250 posts total
         |
         v
[Deduplicate] → Remove known posts
         |
         v
[Filter] → 75 posts pass (30%)
         |
         v
[Qualify] → 19 leads qualified (25%)
         |
         v
[Store] → Save to PostgreSQL
         |
         v
[Notify] → Telegram alerts
         |
         v
Hot Leads: ~3 (isHotLead: true)
Warm Leads: ~5 (score 60-79)
Cold Leads: ~11 (score 40-59)
```

## API Endpoints for Scoring/Status

### View/Query
- `GET /api/leads` - Filter by score, status, relevance
- `GET /api/leads?sort=score` - Sort by score (hot first)
- `GET /api/stats` - Dashboard (hot leads, etc.)

### Update Status
- `POST /api/leads/:id/contact` - Mark as contacted
- `POST /api/leads/:id/irrelevant` - Mark as irrelevant (user feedback)
- `DELETE /api/leads/:id/irrelevant` - Unmark irrelevant
- `POST /api/leads/:id/archive` - Archive/soft delete

## Key Limitations (No Adaptive Learning)

- ❌ Keyword weights are STATIC (hardcoded)
- ❌ LLM score NOT adjusted based on user "irrelevant" feedback
- ❌ No tracking of false positives/negatives
- ❌ Score threshold (80) is arbitrary, not optimized
- ❌ No conversion tracking
- ❌ No fine-tuning of LLM on historical leads

## Future Enhancements (Ready to Implement)

1. **Learn from Irrelevance**: Analyze which marked-irrelevant leads have patterns → adjust scoring
2. **Dynamic Keywords**: Extract new keywords from user irrelevance reasons
3. **Weight Optimization**: Use historical success data to optimize keyword weights
4. **Threshold Calibration**: Optimize score cutoffs based on conversion rates
5. **Conversion Tracking**: Add field to track customer conversion
6. **Performance Monitoring**: Track false positive rate, precision, recall
7. **A/B Testing**: Test different scoring approaches
8. **LLM Fine-tuning**: Supervised fine-tune on successful leads

---

## Database Indexes (for performance)

```prisma
// Lead model indexes
@@index([subreddit, scrapedAt])   // Browse by subreddit
@@index([score])                   // Sort by score
@@index([isHotLead])              // Quick hot lead queries
@@index([reachedOut])             // Contacted status
@@index([isIrrelevant])           // Irrelevant filtering
@@index([archived])               // Archive filtering

// PainPoint model indexes
@@index([category])               // Pain point analysis
@@index([severity])               // Severity filtering
```

---

## Configuration

**Environment Variables:**
- `FIREWORKS_API_KEY` - LLM API (Fireworks)
- `DATABASE_URL` - PostgreSQL connection
- `TELEGRAM_BOT_TOKEN` - Telegram notifications
- `TELEGRAM_CHAT_ID` - Chat for alerts

**Monitored Subreddits:**
- r/midjourney
- r/StableDiffusion
- r/DeviantArt
- r/civitai
- r/aiArt

---

## Files to Know

| File | Purpose |
|------|---------|
| `src/filters/keyword-filter.ts` | Stage 1: Keyword matching logic & weights |
| `src/qualifiers/llm-qualifier.ts` | Stage 2: LLM scoring & pain point extraction |
| `src/web/server.ts` | API endpoints for status management |
| `src/database/database-service.ts` | Database operations (save, mark irrelevant, etc.) |
| `prisma/schema.prisma` | Database schema (Lead, PainPoint, ScrapingRun) |
| `src/graph/orchestrator.ts` | Full pipeline orchestration |

