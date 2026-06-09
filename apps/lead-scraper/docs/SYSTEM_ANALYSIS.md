# Lead Scraper System - Comprehensive Analysis

## Executive Summary

The lead-scraper is an automated lead generation system that monitors AI art subreddits, identifies customer pain points, scores leads using an LLM, and stores them in a PostgreSQL database. The system uses a multi-stage pipeline with no machine learning feedback mechanisms (scoring is one-way).

---

## 1. LEAD SCORING SYSTEM

### 1.1 Two-Stage Scoring Architecture

The system uses a two-stage pipeline:

#### Stage 1: Keyword Filtering (Simple Rule-Based)
- **Purpose**: Pre-filter posts before expensive LLM calls
- **Logic**: Rule-based keyword matching with weights
- **Location**: `src/filters/keyword-filter.ts`

**Weights System:**
- High-weight keywords (weight: 3): "monetize", "make money", "fee", "commission rate", "visibility", "algorithm", "spam", "bot", "scam", "payment", "payout", "withdraw", "ai generated", "disclosure", "print", "physical", "poster", "canvas", "too much content", "oversaturated", "low quality", "spam content", "quality control"
- Medium-weight keywords (weight: 2): "earn", "income", "revenue", "sell", "profit", "commission", "percentage", "expensive", "hidden", "shadowban", "promote", "harassment", "stolen", "copycat", "stripe", "paypal", "transaction", "pending", "label", "watermark", "transparent", "declare", "framed", "shipping", "tangible", "merchandise", "wall art", "curated", "overwhelmed", "flooding", "diluted"
- Low-weight keywords (weight: 1): "cost"

**Minimum Threshold**: 3 (requires at least one strong match OR multiple weak matches)

**Total Score Calculation**: Sum of all matched keyword weights

**Result**: Boolean `passed` (true if totalScore >= 3) + list of matched keywords

#### Stage 2: LLM-Based Qualification (AI-Powered Scoring)
- **Purpose**: Intelligent lead scoring based on pain intensity, buying intent, fit, and urgency
- **Logic**: Fireworks AI model with structured output
- **Location**: `src/qualifiers/llm-qualifier.ts`

**LLM Model Used**: `accounts/fireworks/models/minimax-m2p5` (Fireworks API)
- Temperature: 0.1 (deterministic, focused responses)

**Scoring Guide:**
- 80-100: Hot lead (clear pain, actively seeking solutions, perfect fit)
- 60-79: Warm lead (real pain, might be interested if approached right)
- 40-59: Cold lead (mentions issues but not actively looking)
- 0-39: Not a lead (just discussing, no real pain, bad fit)

**LLM Evaluation Criteria:**
1. **Pain Intensity**: How much is the person struggling?
2. **Buying Intent**: Are they actively looking for solutions or just venting?
3. **Fit**: Would our platform solve their problem?
4. **Urgency**: Do they need a solution now or just discussing generally?

**LLM Output Schema (Structured):**
```json
{
  "score": 0-100,
  "reasoning": "1-2 sentence explanation",
  "painPoints": [
    {
      "category": "monetization|platform_fees|discovery|spam_bots|payment_issues|disclosure_requirements|print_physical|quality_curation",
      "description": "Brief description",
      "severity": "low|medium|high"
    }
  ],
  "isHotLead": true/false (true if score >= 80)
}
```

**Processing:**
- Batch processing: Max 5 concurrent LLM calls
- Temperature 0.1 ensures consistency

### 1.2 Pain Point Categories (8 Total)

All pain points are user-identified from posts, not automatically categorized:

1. **monetization**: Earnings, selling art, making money from AI art
2. **platform_fees**: High commissions, expensive fees on existing platforms
3. **discovery**: Low visibility, algorithm issues, being buried
4. **spam_bots**: Fake accounts, stolen art, account impersonation
5. **payment_issues**: Withdrawal problems, missing/delayed payments
6. **disclosure_requirements**: AI labeling requirements, regulatory compliance
7. **print_physical**: Printing services, physical art, posters, canvas
8. **quality_curation**: Platform oversaturation, quality control issues

### 1.3 Hot Lead Classification

- **Criteria**: LLM score >= 80
- **Field**: `isHotLead` (boolean)
- **Purpose**: Automatic priority flagging for immediate outreach
- **Real-time Alert**: Telegram notifications sent immediately for hot leads

---

## 2. LEAD STATUS TRACKING & CLASSIFICATION

### 2.1 Database Schema (Lead Model)

Located in: `prisma/schema.prisma`

```prisma
model Lead {
  id              String       @id @default(cuid())
  
  // Post metadata
  postId          String       @unique
  postUrl         String
  subreddit       String
  title           String
  content         String       @db.Text
  author          String
  publishedAt     DateTime
  scrapedAt       DateTime     @default(now())
  
  // Filtering (Stage 1)
  passedFilter    Boolean      @default(false)
  matchedKeywords String[]     @default([])
  
  // Qualification (Stage 2)
  qualified       Boolean      @default(false)
  qualifiedAt     DateTime?
  score           Int?         // 0-100
  reasoning       String?      @db.Text
  isHotLead       Boolean      @default(false)
  
  // Notifications
  notifiedAt      DateTime?
  
  // Outreach tracking
  reachedOut      Boolean      @default(false)
  reachedOutAt    DateTime?
  outreachNotes   String?      @db.Text
  
  // Irrelevance tracking (USER FEEDBACK - for future improvements)
  isIrrelevant         Boolean   @default(false)
  irrelevanceReason    String?   @db.Text
  markedIrrelevantAt   DateTime?
  markedIrrelevantBy   String?   // "user" or "system"
  
  // Archive / soft delete
  archived             Boolean   @default(false)
  archivedAt           DateTime?
  archiveReason        String?   @db.Text
  
  // Relations
  scrapingRunId   String
  scrapingRun     ScrapingRun  @relation(fields: [scrapingRunId], references: [id])
  painPoints      PainPoint[]
  
  // Indexes for common queries
  @@index([subreddit, scrapedAt])
  @@index([score])
  @@index([isHotLead])
  @@index([reachedOut])
  @@index([isIrrelevant])
  @@index([archived])
}
```

### 2.2 Lead Status Fields & Operations

#### Marking as "Irrelevant"
- **Field**: `isIrrelevant` (boolean)
- **Associated Fields**: 
  - `irrelevanceReason` (optional reason)
  - `markedIrrelevantAt` (timestamp)
  - `markedIrrelevantBy` (e.g., "user")
- **API Endpoint**: POST `/api/leads/:id/irrelevant` + DELETE to unmark
- **Database Method**: `markLeadIrrelevant()`, `unmarkLeadIrrelevant()`
- **Location**: `src/database/database-service.ts`

```typescript
async markLeadIrrelevant(
  leadId: string,
  reason?: string,
  markedBy: string = "user",
): Promise<void> {
  await this.prisma.lead.update({
    where: { id: leadId },
    data: {
      isIrrelevant: true,
      irrelevanceReason: reason || null,
      markedIrrelevantAt: new Date(),
      markedIrrelevantBy: markedBy,
    },
  });
}
```

#### Marking as "Contacted" (Reached Out)
- **Field**: `reachedOut` (boolean)
- **Associated Fields**:
  - `reachedOutAt` (timestamp when contacted)
  - `outreachNotes` (optional notes about outreach)
- **API Endpoint**: POST `/api/leads/:id/contact`
- **Database Method**: Direct Prisma update
- **Location**: `src/web/server.ts`

```typescript
const lead = await prisma.lead.update({
  where: { id },
  data: {
    reachedOut: true,
    reachedOutAt: new Date(),
    outreachNotes: notes || null,
  },
});
```

#### Archiving Leads (Soft Delete)
- **Field**: `archived` (boolean)
- **Associated Fields**:
  - `archivedAt` (timestamp)
  - `archiveReason` (optional reason)
- **Purpose**: Hide leads without deleting them
- **API Endpoint**: POST `/api/leads/:id/archive` + DELETE to unarchive

### 2.3 Lead Filtering in Web UI

Available filters (with database queries):

1. **hot**: `isHotLead: true, isIrrelevant: false, archived: false`
2. **new**: Scraped in last 24h, `isIrrelevant: false, archived: false`
3. **contacted**: `reachedOut: true, archived: false`
4. **not-contacted**: `reachedOut: false, isIrrelevant: false, archived: false` (default)
5. **irrelevant**: `isIrrelevant: true, archived: false`
6. **relevant**: `isIrrelevant: false, archived: false`
7. **archived**: `archived: true`
8. **active**: `archived: false`
9. **all**: No filter

### 2.4 Sorting Options

1. **By Score** (default):
   - Hot leads first: `isHotLead DESC`
   - Then by score: `score DESC NULLS LAST`
   - Then by date: `scrapedAt DESC`

2. **By Date**:
   - Most recent first: `scrapedAt DESC`
   - Then by score: `score DESC NULLS LAST`

---

## 3. DATA STORAGE & DATABASE SCHEMA

### 3.1 Database Setup

- **Provider**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Connection**: Via `DATABASE_URL` environment variable
- **Type**: Separate from MVP database (complete isolation)

### 3.2 Models

#### ScrapingRun Model
Tracks each scraping session:

```prisma
model ScrapingRun {
  id            String    @id @default(cuid())
  startedAt     DateTime  @default(now())
  completedAt   DateTime?
  status        String    // "running" | "completed" | "failed"
  totalPosts    Int       @default(0)
  filteredPosts Int       @default(0)
  qualifiedLeads Int      @default(0)
  hotLeads      Int       @default(0)
  errors        Json?     // Array of error messages
  leads         Lead[]
  
  @@index([startedAt])
}
```

#### Lead Model
Individual Reddit posts with qualification data (see section 2.1)

#### PainPoint Model
Identified pain points per lead:

```prisma
model PainPoint {
  id          String   @id @default(cuid())
  category    String   // One of 8 categories
  description String   @db.Text
  severity    String   // "low" | "medium" | "high"
  
  leadId      String
  lead        Lead     @relation(fields: [leadId], references: [id])
  
  @@index([category])
  @@index([severity])
}
```

### 3.3 Key Indexes (for performance)

- Lead: `(subreddit, scrapedAt)` - for browsing by subreddit
- Lead: `(score)` - for sorting by quality
- Lead: `(isHotLead)` - for hot lead queries
- Lead: `(reachedOut)` - for contacted status
- Lead: `(isIrrelevant)` - for filtering irrelevant leads
- Lead: `(archived)` - for soft delete queries
- PainPoint: `(category)` - for pain point analysis
- PainPoint: `(severity)` - for severity filtering

### 3.4 Relationships

- `Lead` → `ScrapingRun` (many-to-one)
- `Lead` → `PainPoint[]` (one-to-many)
- Cascade delete: Deleting a ScrapingRun or Lead deletes related PainPoints

---

## 4. FEEDBACK MECHANISMS & LEARNING SYSTEMS

### 4.1 Current Feedback Infrastructure

**Status**: Minimal feedback system exists, but NO machine learning yet.

#### Implemented Feedback Points

1. **Irrelevance Marking**
   - Users can mark leads as "irrelevant" with optional reason
   - Tracked: `isIrrelevant`, `irrelevanceReason`, `markedIrrelevantAt`, `markedIrrelevantBy`
   - **Purpose**: Identified but NOT used for scoring adjustment

2. **Contacted Tracking**
   - Users mark leads as "reachedOut: true"
   - Tracks: `reachedOutAt`, `outreachNotes`
   - **Purpose**: Prevent duplicate outreach

3. **Archive Feature**
   - Soft-delete with reason tracking
   - Tracks: `archived`, `archivedAt`, `archiveReason`
   - **Purpose**: Manual curation without data loss

### 4.2 Data Collected (but Not Used)

The system collects but does NOT use for learning:

- **User irrelevance ratings**: Which leads users marked as irrelevant
- **Irrelevance reasons**: Why users rejected leads
- **Contacted status**: Whether leads were reached out to
- **Outreach notes**: User notes about outreach attempts
- **Archive reasons**: Why leads were archived

This data exists in the database but has NO adaptive effect on:
- Future scoring
- Keyword weights
- LLM prompts
- Lead ranking

### 4.3 What's Missing (Not Implemented)

**No adaptive learning:**
- ❌ LLM scoring NOT adjusted based on user irrelevance feedback
- ❌ Keyword weights are STATIC (hardcoded in `keyword-filter.ts`)
- ❌ No A/B testing of scoring approaches
- ❌ No feedback loop from outreach success/failure

**No performance metrics:**
- ❌ No tracking of conversion rate (which hot leads converted to customers)
- ❌ No tracking of false positive rate (irrelevant leads marked as relevant)
- ❌ No calibration of score thresholds (80 for hot lead is arbitrary)

**No active learning:**
- ❌ No supervised fine-tuning of LLM on past leads
- ❌ No keyword extraction from user irrelevance reasons
- ❌ No automatic weight adjustment

---

## 5. PIPELINE & ORCHESTRATION

### 5.1 Full Processing Pipeline

Located in: `src/graph/orchestrator.ts`

Using LangGraph state machine with nodes:

1. **Scrape Node**
   - Fetches latest Reddit posts from monitored subreddits
   - Default: 50 posts per subreddit (test mode: 10)
   - RSS feed based (real-time updates)

2. **Deduplicate Node**
   - Checks if postId already exists in database
   - Skips duplicate posts to avoid re-processing

3. **Filter Node**
   - Applies keyword filter (stage 1)
   - Passes ~30% of posts (~75 out of 250 daily)
   - Tracks: `passedFilter`, `matchedKeywords`, keyword weights

4. **Qualify Node**
   - Calls LLM for each filtered post
   - Max 5 concurrent LLM calls (rate limiting)
   - Extracts: score (0-100), reasoning, pain points, isHotLead flag
   - Success rate: ~25% of filtered posts qualify (score > 0)

5. **Store Node**
   - Saves leads to PostgreSQL database
   - Creates/updates PainPoint records
   - Generates ScrapingRun summary

6. **Notify Node**
   - Sends daily summary to Telegram
   - Sends individual hot lead alerts
   - Includes: stats, top leads, errors

### 5.2 Data Flow

```
Reddit RSS
   ↓
[Scrape] → allPosts (250 daily)
   ↓
[Deduplicate] → newPosts (deduplicated)
   ↓
[Filter] → filteredPosts (~75, score >= 3)
   ↓
[Qualify] → qualifiedPosts (~19 with scores)
   ↓
[Store] → Database Lead + PainPoint records
   ↓
[Notify] → Telegram messages
```

### 5.3 Expected Daily Results

Based on historical patterns:

- **Total Posts**: 250 (50 per 5 subreddits)
- **Pass Keyword Filter**: ~75 (30%)
- **Qualified Leads**: ~19 (25% of filtered)
- **Hot Leads**: ~3 (15% of qualified, score ≥ 80)

---

## 6. DATABASE SERVICE OPERATIONS

Located in: `src/database/database-service.ts`

### Key Methods

#### Saving Leads
```typescript
async saveLead(runId: string, post: QualifiedPost): Promise<string>
```
- Creates or updates lead record
- Saves pain points as separate records
- Handles duplicate posts (updates if exists)

#### Marking Lead Status
```typescript
async markLeadIrrelevant(leadId, reason, markedBy)
async unmarkLeadIrrelevant(leadId)
async markLeadNotified(leadId)
```

#### Deduplication
```typescript
async getExistingPostIds(postIds): Promise<Set<string>>
```
- Prevents re-processing of known posts

#### Run Management
```typescript
async startScrapingRun(): Promise<string>
async completeScrapingRun(runId, stats)
async failScrapingRun(runId, errors)
```

---

## 7. WEB UI & API

### 7.1 Backend API (Express.js)

Located in: `src/web/server.ts`

**Endpoints:**
- `GET /api/leads` - List leads with filtering/sorting/pagination
- `GET /api/leads/:id` - Get single lead details
- `POST /api/leads/:id/contact` - Mark as contacted
- `POST /api/leads/:id/irrelevant` - Mark as irrelevant
- `DELETE /api/leads/:id/irrelevant` - Unmark irrelevant
- `POST /api/leads/:id/archive` - Archive lead
- `DELETE /api/leads/:id/archive` - Unarchive lead
- `POST /api/leads/:id/draft-outreach` - Generate outreach message (LLM)
- `GET /api/stats` - Dashboard statistics

### 7.2 Statistics Dashboard

Shows:
- Total leads
- Hot leads
- Last 24h new leads
- Contacted leads
- Not contacted leads
- Irrelevant leads
- Archived leads

### 7.3 Outreach Message Generation

Uses Fireworks LLM to draft Reddit comments:
- Analyzes lead pain points
- References specific post content
- Natural tone, no corporate speak
- Includes creator signup link

---

## 8. CURRENT LIMITATIONS & OPPORTUNITIES

### 8.1 Limitations of Current System

**Scoring:**
- LLM scoring is one-way (no feedback adjustment)
- Keyword weights are manually tuned, static
- Score thresholds (80 for hot lead) are arbitrary
- No validation of scoring accuracy

**Feedback:**
- Data collected but not used for learning
- No feedback loop to improve model
- No tracking of false positives/negatives

**Learning:**
- No supervised learning from historical leads
- No keyword extraction from user feedback
- No performance metrics or monitoring

### 8.2 Future Enhancement Opportunities

1. **Feedback Loop**: Track which marked-irrelevant leads have patterns → adjust scoring
2. **Keyword Learning**: Automatically extract new keywords from user irrelevance reasons
3. **Weight Optimization**: Use conversion data to optimize keyword weights
4. **Fine-tuning**: Fine-tune LLM on successful leads
5. **Threshold Calibration**: Use historical data to optimize score thresholds
6. **Conversion Tracking**: Add field to track if lead converted to customer
7. **A/B Testing**: Test different scoring approaches
8. **Feedback Prompts**: Gather structured feedback on outreach results

---

## 9. FILE STRUCTURE REFERENCE

```
apps/lead-scraper/
├── src/
│   ├── index.ts                          # Entry point
│   ├── graph/
│   │   ├── orchestrator.ts              # LangGraph pipeline
│   │   └── state.ts                     # Pipeline state schema
│   ├── filters/
│   │   └── keyword-filter.ts            # Stage 1: Keyword filtering
│   ├── qualifiers/
│   │   └── llm-qualifier.ts             # Stage 2: LLM scoring
│   ├── database/
│   │   └── database-service.ts          # Prisma operations
│   ├── notifiers/
│   │   └── telegram-notifier.ts         # Telegram alerts
│   ├── scrapers/
│   │   └── rss-fetcher.ts              # Reddit RSS scraping
│   ├── web/
│   │   └── server.ts                    # Express API server
│   └── utils/
│       └── config.ts                    # Configuration
├── prisma/
│   └── schema.prisma                    # Database schema
├── web-ui/                              # React frontend
└── scripts/
    ├── draft-outreach.ts                # CLI outreach generation
    └── view-leads.ts                    # CLI lead viewing
```

---

## 10. KEYWORDS & SEARCH TERMS FOR FUTURE REFERENCE

- **Scoring**: LLM score (0-100), pain intensity, buying intent, fit, urgency
- **Weights**: Keyword weights (1-3), minimum threshold (3), pain point categories
- **Status**: isIrrelevant, reachedOut, archived, isHotLead
- **Feedback**: markedIrrelevantAt, markedIrrelevantBy, irrelevanceReason, outreachNotes
- **Pipeline**: Scrape → Deduplicate → Filter → Qualify → Store → Notify
- **Database**: Prisma, PostgreSQL, Lead, PainPoint, ScrapingRun models
- **API**: /api/leads, /api/stats, /api/leads/:id/contact, /api/leads/:id/irrelevant
- **Subreddits**: r/midjourney, r/StableDiffusion, r/DeviantArt, r/civitai, r/aiArt

