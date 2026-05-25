# Lead Browser Web UI

A modern web interface for browsing, filtering, and managing scraped leads.

## Features

- **Real-time Statistics Dashboard** - View total leads, hot leads, new leads (24h), contacted, and irrelevant counts
- **Powerful Filtering** - Filter by:
  - All leads
  - Not contacted (default view)
  - Hot leads
  - New (last 24 hours)
  - Contacted
  - Irrelevant
  - Relevant
- **Flexible Sorting** - Sort by score (high to low) or date (newest first)
- **Lead Management**:
  - Mark leads as contacted with optional notes
  - Mark leads as irrelevant with optional reason
  - Unmark leads as irrelevant
  - Open Reddit posts directly in browser
- **Modern UI** - Clean, dark-themed interface with color-coded badges and status indicators
- **Pain Point Visualization** - View extracted pain points with severity indicators

## Getting Started

### Development Mode (with dev database)

```bash
# Start the web server with development database
pnpm run web:dev

# Open your browser to http://localhost:3100
```

### Production Mode

```bash
# Start the web server with production database
pnpm run web

# Open your browser to http://localhost:3100
```

## API Endpoints

The web server exposes a REST API at `/api`:

### Get Leads
```
GET /api/leads?filter={filter}&sort={sort}&limit={limit}&offset={offset}
```

Filters:
- `all` - All leads
- `hot` - Hot leads only
- `new` - Leads from last 24 hours
- `contacted` - Contacted leads
- `not-contacted` - Not contacted leads
- `irrelevant` - Irrelevant leads
- `relevant` - Relevant leads

Sort:
- `score` - Sort by score (high to low)
- `date` - Sort by date (newest first)

### Get Single Lead
```
GET /api/leads/:id
```

### Get Statistics
```
GET /api/stats
```

Returns:
```json
{
  "totalLeads": 100,
  "hotLeads": 15,
  "last24h": 20,
  "contacted": 10,
  "notContacted": 85,
  "irrelevant": 5
}
```

### Mark as Contacted
```
POST /api/leads/:id/contact
Content-Type: application/json

{
  "notes": "Optional notes about the outreach"
}
```

### Mark as Irrelevant
```
POST /api/leads/:id/irrelevant
Content-Type: application/json

{
  "reason": "Optional reason why this lead is irrelevant"
}
```

### Unmark as Irrelevant
```
DELETE /api/leads/:id/irrelevant
```

## How to Use

### Reviewing Leads

1. The default view shows "Not Contacted" leads sorted by score
2. Use the filter buttons to switch between different views
3. Hot leads are marked with a 🔥 badge
4. Each lead shows:
   - Title and metadata (subreddit, author, date)
   - Score badge
   - Status badges (contacted, irrelevant)
   - AI-generated reasoning
   - Pain points with severity indicators

### Managing Leads

#### Mark as Contacted
1. Click "Mark Contacted" on a lead
2. Optionally add notes about the outreach
3. Click "Mark Contacted" in the modal
4. The lead will be updated and refresh automatically

#### Mark as Irrelevant
1. Click "Mark Irrelevant" on a lead
2. Optionally add a reason (this helps refine the LLM judge)
3. Click "Mark Irrelevant" in the modal
4. The lead will be marked irrelevant and refresh automatically

#### Unmark as Irrelevant
1. Switch to "Irrelevant" filter to view irrelevant leads
2. Click "Unmark Irrelevant" on a lead
3. The lead will be unmarked and refresh automatically

### Refining the LLM Judge

When you mark leads as irrelevant with reasons, this data can be used to:
1. Export irrelevant leads with reasons: Query the database for `isIrrelevant = true` leads
2. Analyze common patterns in irrelevant leads
3. Update the LLM qualification prompt to better filter out similar leads
4. Improve the keyword matching rules

## Architecture

- **Backend**: Express.js server with Prisma ORM
- **Frontend**: Vanilla JavaScript with modern CSS
- **Database**: PostgreSQL (via Prisma)
- **API**: RESTful JSON API

## Configuration

Set the port via environment variable:
```bash
PORT=3100 pnpm run web:dev
```

Default port is `3100`.

## Tips

- Use the "Not Contacted" filter to focus on new opportunities
- Sort by score to prioritize the highest-quality leads
- Use the "Irrelevant" filter to review and refine your marking
- The statistics refresh automatically every 30 seconds
- Click directly on a lead number to open the Reddit post in a new tab
