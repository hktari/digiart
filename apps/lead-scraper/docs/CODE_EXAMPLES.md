# Lead Scraper - Code Examples & Usage

## 1. Keyword Filter Examples

### Input & Output

```typescript
// src/filters/keyword-filter.ts

// Example 1: Post about monetization (PASSES)
const post1 = {
  title: "How do I monetize my AI art?",
  content: "I've been generating images with Midjourney and want to sell them...",
  // ... other fields
};

const filter = new KeywordFilter();
const result1 = filter.filterPost(post1);

// Output:
result1.filterResult = {
  passed: true,  // score 3 >= minimum
  matches: [
    { keyword: "monetize", weight: 3, category: "monetization" },
    { keyword: "sell", weight: 2, category: "monetization" },
  ],
  totalScore: 5  // 3 + 2
};
```

### Keyword Weight Calculation

```typescript
// Example: Multiple pain points
const post2 = {
  title: "Frustrated with Stable Diffusion",
  content: "The fees are too expensive and I can't make money. Plus the platform has too much spam and low quality content. My art keeps getting lost in the algorithm.",
  // ...
};

const result2 = filter.filterPost(post2);

// Matches found:
// - "expensive" (weight 2) → platform_fees
// - "make money" (weight 3) → monetization
// - "spam" (weight 3) → spam_bots
// - "low quality" (weight 3) → quality_curation
// - "algorithm" (weight 3) → discovery

result2.filterResult = {
  passed: true,
  matches: [
    { keyword: "make money", weight: 3, category: "monetization" },
    { keyword: "expensive", weight: 2, category: "platform_fees" },
    { keyword: "spam", weight: 3, category: "spam_bots" },
    { keyword: "low quality", weight: 3, category: "quality_curation" },
    { keyword: "algorithm", weight: 3, category: "discovery" },
  ],
  totalScore: 14  // 3 + 2 + 3 + 3 + 3
};
```

## 2. LLM Qualification Examples

### Stage 2: LLM Scoring

```typescript
// src/qualifiers/llm-qualifier.ts

// Only posts that passed keyword filter reach here
const qualifier = new LLMQualifier(fireworksApiKey);

const filteredPost = {
  id: "post123",
  subreddit: "midjourney",
  title: "Monetizing AI art - need advice",
  content: "I've been creating AI art for 3 months and want to make it my main income...",
  filterResult: {
    passed: true,
    matches: [
      { keyword: "monetize", weight: 3, category: "monetization" },
      { keyword: "income", weight: 2, category: "monetization" },
    ],
    totalScore: 5,
  },
};

const qualifiedPost = await qualifier.qualifyPost(filteredPost);

// Output (structured LLM response):
qualifiedPost.qualification = {
  score: 85,  // "HOT LEAD"
  reasoning: "Author has been creating AI art for 3 months and explicitly wants to make it their main income. Shows clear buying intent and pain point.",
  
  painPoints: [
    {
      category: "monetization",
      description: "Wants to make AI art generation their main source of income",
      severity: "high",
    },
  ],
  
  isHotLead: true,  // score >= 80
};
```

### Another Example: Warm Lead

```typescript
const coldPost = {
  title: "Are the Midjourney fees worth it?",
  content: "Just wondering if the monthly subscription is worth it or if there are better alternatives...",
  // ...
};

const result = await qualifier.qualifyPost(coldPost);

// Output:
result.qualification = {
  score: 58,  // "COLD LEAD"
  reasoning: "Author is considering options but hasn't expressed active buying intent yet. More exploratory than committed.",
  
  painPoints: [
    {
      category: "platform_fees",
      description: "Questioning whether platform fees are justified",
      severity: "low",
    },
  ],
  
  isHotLead: false,  // score < 80
};
```

## 3. Database Operations Examples

### Saving a Qualified Lead

```typescript
// src/database/database-service.ts
const dbService = new DatabaseService();

const runId = await dbService.startScrapingRun();

const qualifiedPost = {
  id: "post123",
  postId: "reddit_123",
  postUrl: "https://reddit.com/r/midjourney/...",
  subreddit: "midjourney",
  title: "How to monetize?",
  content: "...",
  author: "user123",
  publishedAt: new Date("2024-01-15"),
  
  filterResult: {
    passed: true,
    matches: [{ keyword: "monetize", weight: 3, category: "monetization" }],
    totalScore: 3,
  },
  
  qualification: {
    score: 82,
    reasoning: "Clear monetization pain point, active seeking behavior",
    painPoints: [
      {
        category: "monetization",
        description: "Wants to make money from AI art",
        severity: "high",
      },
    ],
    isHotLead: true,
  },
};

const leadId = await dbService.saveLead(runId, qualifiedPost);
// Returns: "clmx1y2z3..."

// In database, creates:
// Lead record with:
// - postId: "reddit_123"
// - score: 82
// - isHotLead: true
// - qualified: true
// - qualifiedAt: now()
// - passedFilter: true
// - matchedKeywords: ["monetize"]
//
// PainPoint records with:
// - category: "monetization"
// - description: "Wants to make money from AI art"
// - severity: "high"
// - leadId: (linked to lead)
```

### Marking Lead as Irrelevant (User Feedback)

```typescript
// User reviews hot lead in web UI and realizes it's not a good fit

const leadId = "clmx1y2z3...";
const reason = "User is not an artist, just curious about AI art";

await dbService.markLeadIrrelevant(leadId, reason, "user");

// Database updates Lead record:
// {
//   isIrrelevant: true,
//   irrelevanceReason: "User is not an artist, just curious about AI art",
//   markedIrrelevantAt: 2024-01-15T10:30:00Z,
//   markedIrrelevantBy: "user"
// }
```

### Marking Lead as Contacted

```typescript
// User reaches out to lead, records the interaction

await prisma.lead.update({
  where: { id: leadId },
  data: {
    reachedOut: true,
    reachedOutAt: new Date(),
    outreachNotes: "Sent Reddit DM with creator signup link. Waiting for response.",
  },
});

// Database updates Lead record:
// {
//   reachedOut: true,
//   reachedOutAt: 2024-01-15T11:00:00Z,
//   outreachNotes: "Sent Reddit DM with creator signup link. Waiting for response."
// }
```

## 4. Web API Usage Examples

### List Leads by Score

```bash
# Get top hot leads (default sorting: by score desc)
curl "http://localhost:3100/api/leads?filter=hot&sort=score&limit=10"

# Response:
{
  "leads": [
    {
      "id": "lead1",
      "postId": "reddit_123",
      "title": "How to monetize AI art?",
      "subreddit": "midjourney",
      "score": 85,
      "isHotLead": true,
      "qualified": true,
      "reachedOut": false,
      "isIrrelevant": false,
      "painPoints": [
        {
          "category": "monetization",
          "description": "Wants to make money from AI art",
          "severity": "high"
        }
      ]
    },
    // ... more leads
  ],
  "total": 3,
  "limit": 10,
  "offset": 0
}
```

### Get Statistics Dashboard

```bash
curl "http://localhost:3100/api/stats"

# Response:
{
  "totalLeads": 150,
  "hotLeads": 12,        // score >= 80
  "last24h": 19,         // new leads in last 24h
  "contacted": 8,        // reachedOut: true
  "notContacted": 130,   // reachedOut: false
  "irrelevant": 2,       // isIrrelevant: true
  "archived": 3          // archived: true
}
```

### Mark Lead as Irrelevant (via API)

```bash
curl -X POST "http://localhost:3100/api/leads/lead123/irrelevant" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Not an artist, just curious"
  }'

# Response: Updated Lead object with isIrrelevant: true
```

### Filter by Status

```bash
# Get leads that have NOT been contacted (most common view)
curl "http://localhost:3100/api/leads?filter=not-contacted"

# Get irrelevant leads (for review/unrevert)
curl "http://localhost:3100/api/leads?filter=irrelevant"

# Get already contacted leads (for follow-up)
curl "http://localhost:3100/api/leads?filter=contacted"

# Get new leads from last 24 hours
curl "http://localhost:3100/api/leads?filter=new"
```

## 5. Full Pipeline Flow Example

```typescript
// src/graph/orchestrator.ts

const orchestrator = new LeadScraperOrchestrator(
  fireworksApiKey,
  telegramToken,
  telegramChatId
);

// Run the complete pipeline
const result = await orchestrator.run(
  ["midjourney", "StableDiffusion", "civitai", "aiArt", "DeviantArt"],
  testMode = false  // 50 posts per subreddit (production)
);

// Pipeline executes:
// 1. Scrape: Fetches 250 posts (50 per subreddit)
// 2. Deduplicate: Removes any known posts
// 3. Filter: ~75 posts pass keyword filter (30%)
// 4. Qualify: ~19 posts get LLM scores
// 5. Store: Saves to PostgreSQL
// 6. Notify: Sends Telegram alerts

// Result output:
result = {
  stats: {
    totalPosts: 250,      // 50 x 5 subreddits
    filteredPosts: 75,    // 30% pass keyword filter
    qualifiedLeads: 19,   // 25% of filtered
    hotLeads: 3,          // 15% of qualified (score >= 80)
  },
  errors: [],
  scrapingRunId: "clmx1y2z3..."
};

// Telegram notifications sent:
// 1. Daily summary with stats
// 2. Individual alerts for each of 3 hot leads
```

## 6. Outreach Message Generation Example

```typescript
// src/web/server.ts - POST /api/leads/:id/draft-outreach

const lead = {
  title: "How to monetize AI art on a new platform?",
  author: "artist123",
  subreddit: "midjourney",
  reasoning: "Clear monetization pain point, actively seeking solutions",
  painPoints: [
    {
      category: "monetization",
      description: "Looking for new monetization channels for AI art",
      severity: "high",
    },
  ],
};

// LLM generates contextual outreach message:
const draft = `
hey, we're building a platform specifically for AI artists to monetize their work
with a 90/10 revenue split. sounds like exactly what you're looking for

check out the creator signup page: https://digiart.btechhub.top/creators

b | t
`;

// This is copy-paste ready to paste as Reddit comment
```

## 7. Data Model Relationships

```typescript
// Database relationships

// One ScrapingRun contains many Leads
const run = await prisma.scrapingRun.findUnique({
  where: { id: "run123" },
  include: { leads: true },
});

// One Lead has many PainPoints
const lead = await prisma.lead.findUnique({
  where: { id: "lead123" },
  include: { painPoints: true },
});

// Example output:
lead = {
  id: "lead123",
  postId: "reddit_123",
  title: "Need better monetization",
  score: 82,
  isHotLead: true,
  
  painPoints: [
    {
      id: "pp1",
      category: "monetization",
      description: "Looking for 90/10 revenue split",
      severity: "high",
      leadId: "lead123",
    },
    {
      id: "pp2",
      category: "platform_fees",
      description: "Current platform takes 50% commission",
      severity: "high",
      leadId: "lead123",
    },
  ],
};
```

## 8. Test Mode Examples

```bash
# Test mode: Scrape only 10 posts per subreddit (low cost)
pnpm run scrape:dev

# Production: Scrape 50 posts per subreddit
pnpm run scrape:dev  # Still dev database!

# View leads in browser
pnpm run web:dev     # localhost:3100

# Generate draft outreach for a specific lead
pnpm --env-file=.env.dev run draft-outreach lead123

# View leads in CLI
pnpm --env-file=.env.dev run view-leads
```

## 9. Key Indexes & Query Patterns

```sql
-- Common query patterns (with indexes for performance)

-- Find hot leads not yet contacted
SELECT * FROM "Lead"
WHERE "isHotLead" = true
  AND "reachedOut" = false
  AND "isIrrelevant" = false
ORDER BY "score" DESC;
-- Uses: isHotLead, reachedOut, isIrrelevant indexes

-- Find high-scoring leads
SELECT * FROM "Lead"
WHERE "score" >= 60
  AND "archived" = false
ORDER BY "score" DESC;
-- Uses: score index

-- Find leads by subreddit
SELECT * FROM "Lead"
WHERE "subreddit" = 'midjourney'
  AND "scrapedAt" > now() - interval '24 hours'
ORDER BY "score" DESC;
-- Uses: (subreddit, scrapedAt) composite index
```

## 10. Troubleshooting Examples

### Why is a lead not passing filter?

```typescript
// Post doesn't mention any pain points with enough weight
const post = {
  title: "AI art is cool",
  content: "I like making images with Midjourney, it's fun"
};

// Matches:
// - No matches for monetization keywords
// - No matches for platform_fees keywords
// - No matches for any pain point keywords
// totalScore: 0 < minimum (3) → FAILS FILTER

// Fix: Post needs to mention pain points
```

### Why is a qualified lead not hot?

```typescript
// LLM score is < 80
const post = {
  title: "Thinking about AI art",
  content: "Maybe I'll try to make some money from AI art someday"
};

// LLM evaluation:
// - Pain Intensity: Low (just thinking about it)
// - Buying Intent: Low (maybe someday)
// - Fit: Medium (could be a customer)
// - Urgency: Low (no immediate need)
// Score: 45 < 80 → NOT a hot lead

// Instead: Warm lead (might follow up later)
```

---

## Quick Reference: Decision Tree

```
Post from Reddit
     |
     +-- Contains pain point keywords? (min score 3)
     |    NO → REJECTED (not relevant)
     |    YES → Pass to LLM
     |
     +-- LLM evaluates (pain, intent, fit, urgency)
     |    Score 0-39: NOT A LEAD
     |    Score 40-59: COLD LEAD
     |    Score 60-79: WARM LEAD
     |    Score 80-100: HOT LEAD ← Immediate Telegram alert
     |
     +-- Store in database
     |    Track: score, reasoning, pain points
     |
     +-- User can:
         - Mark as contacted (reachedOut)
         - Mark as irrelevant (isIrrelevant) ← User feedback
         - Archive (archived) ← Soft delete
         - Generate outreach message
```

