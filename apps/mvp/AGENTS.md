- I prefer that you commit your work after completing a small to medium sized task. If you are working on a sprint, then prefer to wait.
- use vitest + playwright for testing
- MVP is deployed on Railway
- when implementing React pages you need to use semantic colors that support dark/light mode (e.g. text-foreground instead of text-ink)
  bad examples: bg-white, border-neutral, text-neutral-200, border-beige, bg-paper, text-beige, etc.
  good examples: text-foreground, text-muted-foreground, border-border, bg-muted, bg-background

# Database

- use the `db:migrate` script inside package.json to run migrations during development
- when using pnpm prisma you always need to prefix the command with `dotenv -- `
- never manually generate migration files. Always use `prisma migrate dev`

- **Always create new migrations for schema changes** — If you need to change the database:

  ```bash
  cd apps/mvp && pnpm prisma migrate dev --name describe_your_change
  ```

# E2E testing

**Commands:**

- `pnpm test:e2e:server` — start Next.js on port 3003 with test env
- `pnpm test:e2e` — run all Playwright tests (auto-resets DB if needed)

**Conditional DB Reset Design:**

- `.env.test` — fixed user IDs (committed)
- `.env.test.local` — rotating session tokens (auto-generated)
- Reset triggers when `TEST_SESSION_TOKEN` missing → `scripts/reset-test-db.ts` runs
- Reset truncates all tables, reseeds with fixed UUIDs, writes fresh tokens
- Tests do NOT clean up; use Playwright project dependencies instead
- Delete `.env.test.local` to force reset when: schema changes, seed changes, data pollution suspected

<!-- stripe-projects-cli managed:agents-md:start -->

## Stripe Projects CLI

This repository is initialized for the Stripe project "digiart-mvp".

## Tools used

- [Stripe CLI](https://docs.stripe.com/stripe-cli) with the `projects` plugin to manage third-party services, credentials, and deployments for this project. Use the stripe-projects-cli to manage deploying and access to third party services.
<!-- stripe-projects-cli managed:agents-md:end -->
