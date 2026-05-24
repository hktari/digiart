- make a commit after you've finished a task
- run linter and formatter to verify your code
- when running tests make sure to run in non interactive mode (e.g. vitest --run)

## Lead Scraper Development

**CRITICAL: Use Development Database**

When working on `apps/lead-scraper`, **ALWAYS** use `.env.dev` to avoid resetting production data:

```bash
cd apps/lead-scraper

# Use :dev scripts (easiest way)
pnpm run scrape:dev        # Scrape with dev database
pnpm run browse:dev        # Browse with dev database
pnpm run db:studio:dev     # Prisma Studio (dev)
pnpm run db:push:dev       # Push schema to dev

# Or manually specify --env-file for any command
pnpm --env-file=.env.dev run scrape
pnpm --env-file=.env.dev run browse
pnpm --env-file=.env.dev run draft-outreach 1
pnpm --env-file=.env.dev prisma migrate dev
pnpm --env-file=.env.dev prisma studio
pnpm --env-file=.env.dev prisma db push
```

**Never run commands without `:dev` suffix or `--env-file=.env.dev`** - this will use `.env` (production) by default.

Files:

- `.env.dev` - Development database (safe to reset)
- `.env` - Production database (DO NOT TOUCH during development)
