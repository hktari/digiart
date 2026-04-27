# Art Subscription Platform

pnpm monorepo with two apps and shared infrastructure.

## Apps

| App          | Path              | Stack                           | Dev port |
| ------------ | ----------------- | ------------------------------- | -------- |
| `mvp`        | `apps/mvp`        | Next.js 16, Prisma, NextAuth v5 | 3000     |
| `pdf-worker` | `apps/pdf-worker` | NestJS, BullMQ, Prisma          | 3001     |

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
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

# Railway deploy trigger
