# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Note: `CLAUDE.md` is a symlink to this `AGENTS.md`, so this single file is the shared guidance for all agents.

## Repository layout

pnpm monorepo (`apps/*`) plus one standalone Python app. Node ≥ 20, pnpm ≥ 9; Python ≥ 3.10 + `uv`.

| App | Path | Stack | Dev port |
| --- | --- | --- | --- |
| `mvp` | `apps/mvp` | Next.js 16 (App Router), Prisma, NextAuth v5, Stripe/PayPal | 3003 |
| `pdf-worker` | `apps/pdf-worker` | NestJS, BullMQ, Prisma, Sharp | 3001 |
| `landing` | `apps/landing` | Next.js 14, Tailwind, Resend | 3002 |
| `lead-scraper` | `apps/lead-scraper` | Node, Prisma, Hono web UI, LangGraph | 3100 |
| `social-media-generator` | `apps/social-media-generator` | Python, LangGraph, Fireworks AI, Telegram | — |

`mvp` is the core product; `pdf-worker` is its async companion. The two share concepts but have **separate Prisma schemas / databases**. The other three apps are largely independent (growth/ops tooling).

## Commands

Run from repo root unless noted. `dotenv --` (used by many `mvp`/`lead-scraper` scripts) loads the app's `.env` before the command.

```bash
pnpm install                      # all workspace deps
pnpm dev                          # mvp on :3003
pnpm dev:worker                   # pdf-worker on :3001
pnpm -r build                     # build everything
pnpm --filter <app> <script>      # run any app script
docker compose -f apps/docker-compose.yml up -d   # Redis + MinIO (S3) for local infra
```

### mvp (`pnpm --filter mvp ...`)
```bash
db:migrate          # prisma migrate dev (create + apply migration)
db:push             # push schema without a migration (dev scratch only)
db:studio
typecheck           # tsc --noEmit
lint:format         # biome check --write --unsafe
test                # vitest run (unit)
test path/to.test.ts                       # single test file
test -t "name"                             # single test by name
test:backend        # lib/__tests__ + app/api/__tests__
test:integration    # vitest, uses .env.test
test:e2e            # playwright, uses .env.test
test:smoke          # playwright against MVP_DEPLOYMENT_URL (post-deploy)
```

### pdf-worker — tests use **Jest**, not Vitest
```bash
pnpm --filter pdf-worker test
pnpm --filter pdf-worker test -- path/to.spec.ts
pnpm --filter pdf-worker test:integration   # queue-integration, 60s timeout
```

### lead-scraper — **always use the dev DB**
This app's plain scripts hit the **production** database. When developing, always use the `:dev` script variants or `--env-file=.env.dev`, never the bare command:
```bash
pnpm --filter lead-scraper scrape:dev
pnpm --filter lead-scraper web:dev        # http://localhost:3100
pnpm --filter lead-scraper db:studio:dev
```
Files: `.env.dev` = development DB (safe to reset); `.env` = production DB (do not touch during dev).

### social-media-generator (Python, run inside `apps/social-media-generator`)
```bash
uv sync
uv run agent generate       # draft posts, pauses at human review
uv run agent review         # approve / edit / regenerate pending drafts
uv run telegram-bot         # optional Telegram HITL
make test                   # pytest (tests/unit_tests)
```

## Conventions (enforced)

- **Tooling**: `pnpm` for Node, `uv` for Python. Format/lint with **Biome** (2-space indent). Run `lint:format` + `typecheck` before considering a change done.
- **Pre-commit** (`.husky/pre-commit`): runs lint-staged + `mvp` typecheck. Migration `.sql` files are validated and **immutable** — `scripts/prevent-migration-modification.js` blocks edits to committed migrations. To change schema, create a NEW migration (`pnpm --filter mvp db:migrate --name ...`), never edit an existing one. Production deploys with `prisma migrate deploy`.
- **Tests must be non-interactive** (e.g. `vitest --run`, already the default in `test` scripts).
- **Tailwind palette**: beige, fuchsia, ocean, jade.
- Don't run builds for trivial/style-only changes.
- Make a commit after finishing a task; concise imperative messages.
- When debugging UI, use the agent-browser CLI to verify fixes.

## mvp architecture

Next.js App Router. Routes are segmented by audience: `app/creator/*`, `app/collector/*`, `app/admin/*`, `app/creators/[slug]` (public), with server logic in `app/api/*` (route handlers) and `app/actions/*` (server actions).

Business logic lives in `lib/`, not in components/routes:
- `lib/billing/` — the money layer: `checkout-service`, `commit-checkout-service`, `charge-service`, Stripe (`stripe-client`) and PayPal (`paypal-service`, `paypal-reconciliation-service`), `payout-service`, `fulfillment-service`, `pdf-trigger-service`, `freeze-service`, reconciliation.
- `lib/peecho/` — print-on-demand (POD) provider integration: `client`, `quote-service`, `offering-sync`.
- `lib/pricing/`, `lib/booklet/` (page-count, ordering), `lib/notifications/`, `lib/analytics/`, `lib/queue/`.
- `lib/db.ts` Prisma client, `lib/auth.ts` NextAuth v5, `lib/roles.ts` RBAC.

**Domain model** (`prisma/schema.prisma`): Creators publish `Artwork` grouped into `Release`s. Collectors subscribe to creators (`CollectorCreatorSubscription`) and make per-cycle selections (`CollectorReleaseSelection`). Billing runs on `SubscriptionCycle`s (`CycleStatus`). Orders flow Checkout → `BillingRecord` → `FulfillmentOrder` (POD via Peecho) → `CreatorPayout`/`PayoutCalculation`. `GeneratedPrintFile` links to the PDF produced by `pdf-worker`. Stripe events are idempotently recorded in `StripeWebhookEvent`.

## pdf-worker architecture

NestJS service consuming **BullMQ** queues (Redis). Two processors:
- `src/booklet/` — `booklet.processor` builds print-ready PDFs. PDF pipeline under `booklet/pdf/`: `artwork-page` + `cover-page` → `pdf-builder` → `pdfx-processor` (PDF/X for print). Output via `booklet/storage/storage.service`.
- `src/auto-assign/` — `auto-assign.processor`.

Storage is pluggable via `STORAGE_DRIVER`: `local` (dev) or `s3` (prod / local MinIO via `AWS_ENDPOINT_URL`). Locally, MinIO + the `booklets` bucket come up with `docker compose`.

`mvp` enqueues jobs (see `lib/billing/pdf-trigger-service.ts` / `lib/queue/`) that `pdf-worker` consumes — they communicate through Redis + S3, not direct calls.

## social-media-generator architecture

LangGraph agent in `src/agent/` (`graph.py`, `nodes.py`, `state.py`, `prompts.py`). Flow: `load_history → plan_post → write_post → human_review → (regenerate | approve/edit → save_output)`, with a guidelines-based feedback system reinjected on later runs. LLM via Fireworks AI; SQLite checkpointer (`output/checkpoints.db`); outputs to `output/posts/`.

## Deployment

All apps deploy to **Railway** (see `DEPLOYMENT.md`). `pdf-worker` builds from the monorepo root via `Dockerfile.pdf-worker` to preserve pnpm workspace linking. `DATABASE_URL` targets Postgres (Neon in production).


# GENERAL DEV GUIDELINES
- ensure quality of your code by running "npm run format" and "npm run build"
- make a commit after you've finished a task. Write concise, informative commit messages: Start with a summary in imperative mood, explain the 'why' behind changes, keep the summary under 50 characters, use bullet points for multiple changes, avoid using the word refactor, instead explain what was done, and reference related issues or tickets.
- our color palette is configured in Tailwind
- always use semantic colors to ensure dark mode support
- DO NOT RUN builds for trivial changes such as style changes
- use 'uv' for python projects and 'pnpm' for node projects

