- I prefer that you commit your work after completing a small to medium sized task. If you are working on a sprint, then prefer to wait.
- use vitest + playwright for testing
- MVP is deployed on Railway

# Database

## Development Workflow

- use the `db:migrate` script inside package.json to run migrations during development
- when using pnpm prisma you always need to prefix the command with `dotenv -- `
- never manually generate migration files. Always use `prisma migrate dev`

## Production Safety (CRITICAL)

**Migration files are IMMUTABLE once committed.** Pre-commit hooks enforce this.

### The Golden Rules:

1. **Never modify existing migration files** — Once a migration is in `main`, treat it as locked. Pre-commit hooks will block any attempt to edit them.

2. **Always create new migrations for schema changes** — If you need to change the database:

   ```bash
   cd apps/mvp && pnpm prisma migrate dev --name describe_your_change
   ```

3. **Production deployments use `migrate deploy`** — This applies pending migrations sequentially:
   ```bash
   pnpm prisma migrate deploy
   ```

### Why This Matters:

| Environment | Migration State        | Action                        |
| ----------- | ---------------------- | ----------------------------- |
| Production  | Has migrations A, B, C | `migrate deploy` applies D, E |
| Your PR     | Modifies migration B   | Production can't apply safely |

If you modify an existing migration that's already been applied to production, the `migrate deploy` will fail or cause data corruption.

### What Happens If You Try to Modify Migrations:

The pre-commit hook will block your commit and show:

```
🚫 MIGRATION MODIFICATION BLOCKED

Existing migration files cannot be modified.

To make schema changes, create a NEW migration:
  cd apps/mvp && pnpm prisma migrate dev --name your_change
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
