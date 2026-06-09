# Art Subscription Platform

pnpm monorepo with multiple apps and shared infrastructure.

## Apps

| App                      | Path                          | Stack                                     | Dev port |
| ------------------------ | ----------------------------- | ----------------------------------------- | -------- |
| `mvp`                    | `apps/mvp`                    | Next.js 16, Prisma, NextAuth v5           | 3000     |
| `pdf-worker`             | `apps/pdf-worker`             | NestJS, BullMQ, Prisma                    | 3001     |
| `landing`                | `apps/landing`                | Next.js 14, Tailwind CSS, Resend          | 3002     |
| `lead-scraper`           | `apps/lead-scraper`           | Node.js, Prisma, Hono (web UI)            | 3100     |
| `social-media-generator` | `apps/social-media-generator` | Python, LangGraph, Fireworks AI, Telegram | —        |

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Python ≥ 3.10 + [uv](https://github.com/astral-sh/uv) (for `social-media-generator`)
- Docker (for local infrastructure)

## Local Dev Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start infrastructure

Redis and MinIO (S3-compatible storage) run via Docker Compose. On first run, `minio-init` automatically creates the `booklets` bucket.

```bash
docker compose up -d
```

| Service       | URL                                                         |
| ------------- | ----------------------------------------------------------- |
| Redis         | `redis://localhost:6379`                                    |
| MinIO API     | `http://localhost:9000`                                     |
| MinIO Console | `http://localhost:9001` (user: `minioadmin` / `minioadmin`) |

### 3. Configure env vars

```bash
cp apps/mvp/.env.example apps/mvp/.env.local
cp apps/pdf-worker/.env.example apps/pdf-worker/.env
```

Both apps require `DATABASE_URL` pointing to a Postgres instance (Neon recommended for production, or add a local Postgres container).

To use MinIO as S3 storage in `pdf-worker`, set:

```env
STORAGE_DRIVER=s3
AWS_ENDPOINT_URL=http://localhost:9000
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_BUCKET=booklets
```

### 4. Run database migrations

```bash
pnpm --filter mvp db:migrate
```

### 5. Start apps

```bash
pnpm dev           # apps/mvp on :3000
pnpm dev:worker    # apps/pdf-worker on :3001
```

## Monorepo Commands

```bash
pnpm install                        # install all workspace deps
pnpm add <pkg> --filter <app>       # add dep to a specific app
pnpm add <pkg> -w                   # add dep to monorepo root
pnpm -r run build                   # build all apps
pnpm --filter <app> <script>        # run any script in a specific app
```

## Deployment

Both apps deploy to Railway. See `DEPLOYMENT.md` for detailed instructions.

### `apps/mvp` → Railway

1. Create Railway project from GitHub repo
2. Set **Root Directory** to `apps/mvp`
3. Set **Build Command**: `pnpm install && pnpm build`
4. Set **Start Command**: `pnpm start`
5. Configure env vars from `apps/mvp/.env.example`

### `apps/pdf-worker` → Railway

Railway does not have native monorepo support — use a Dockerfile that builds from the monorepo root so pnpm workspace linking is preserved.

Example `Dockerfile` (place at repo root):

```dockerfile
FROM node:20-alpine AS base
RUN npm i -g pnpm

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/pdf-worker/package.json ./apps/pdf-worker/

RUN pnpm install --frozen-lockfile

COPY apps/pdf-worker ./apps/pdf-worker
RUN pnpm --filter pdf-worker build

CMD ["node", "apps/pdf-worker/dist/main"]
```

Set env vars from `apps/pdf-worker/.env.example` in the Railway dashboard.
Use real AWS S3 credentials (`AWS_ENDPOINT_URL` is only needed for local MinIO).

## Testing

```bash
pnpm --filter mvp test              # Unit tests (Vitest)
pnpm --filter mvp test:e2e          # E2E tests (Playwright, local)
pnpm --filter mvp test:smoke        # Smoke tests (against deployed URL)
pnpm --filter mvp test:integration  # Integration tests
```

### Smoke Testing (Post-Deployment)

After deploying MVP to Railway:

```bash
cd apps/mvp
MVP_DEPLOYMENT_URL=https://your-mvp.railway.app pnpm test:smoke
```

## Storage

`pdf-worker` supports two storage drivers via `STORAGE_DRIVER`:

| Driver  | When to use               | Config                                                     |
| ------- | ------------------------- | ---------------------------------------------------------- |
| `local` | Dev only                  | `STORAGE_LOCAL_PATH` (default: `/tmp/booklets`)            |
| `s3`    | Production or local MinIO | `AWS_*` env vars + optionally `AWS_ENDPOINT_URL` for MinIO |

## Social Media Generator

A standalone Python agent (`apps/social-media-generator`) that generates Threads posts for creator and collector audience segments using LangGraph + Fireworks AI, with a human-in-the-loop review step.

### Setup

```bash
cd apps/social-media-generator
cp .env.example .env          # add FIREWORKS_API_KEY and optionally Telegram vars
uv sync                       # install dependencies into .venv
```

### Usage

```bash
# Generate drafts for both segments (pauses at human review)
uv run agent generate

# Review pending drafts interactively (approve / edit / regenerate)
uv run agent review

# Optional: Telegram HITL bot (set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in .env)
uv run telegram-bot
```

### Architecture

```
load_history → plan_post → write_post → human_review
  → regenerate (loops back to write_post)
  → approve/edit → reflect_on_feedback → save_output
```

- **LLM**: `minimax-m2p7` via Fireworks AI
- **Persistence**: SQLite checkpointer + in-memory store (reflections seeded from disk)
- **Output**: `output/posts/{segment}-{theme}-{date}/post.md`
- **Reflections**: Style learnings extracted after each approved/edited post and reinjected on next run

### Environment Variables

| Variable             | Required | Description                       |
| -------------------- | -------- | --------------------------------- |
| `FIREWORKS_API_KEY`  | Yes      | Fireworks AI API key              |
| `LANGSMITH_PROJECT`  | No       | LangSmith tracing project name    |
| `TELEGRAM_BOT_TOKEN` | No       | Telegram bot token (for HITL bot) |
| `TELEGRAM_CHAT_ID`   | No       | Telegram chat ID (for HITL bot)   |

# Railway deploy trigger
