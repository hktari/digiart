# Deployment Guidelines

## Railway Deployment

### Architecture

All services are deployed on Railway under the project **digiart-mvp** (production environment).

| Service           | Railway service          | Notes                                                |
| ----------------- | ------------------------ | ---------------------------------------------------- |
| Next.js MVP       | `mvp`                    | `https://mvp-production-5b72.up.railway.app`         |
| NestJS PDF worker | `pdf-worker`             | Internal only, no public domain                      |
| Redis             | `Redis`                  | Private networking via `redis.railway.internal:6379` |
| Object storage    | `digiart-storage` bucket | Railway S3-compatible, region AMS (Amsterdam)        |
| Database          | Neon (external)          | Set `DATABASE_URL` manually                          |

### Required secrets (set manually via Railway dashboard or CLI)

These are **not** set automatically and must be provided before first deploy:

```bash
# Database (Neon)
railway variable set DATABASE_URL="postgresql://..." --service mvp
railway variable set DATABASE_URL="postgresql://..." --service pdf-worker

# Auth
railway variable set AUTH_SECRET="<generate with: openssl rand -base64 32>" --service mvp

# Email (Resend)
railway variable set AUTH_RESEND_KEY="re_..." EMAIL_FROM="noreply@yourdomain.com" --service mvp

# Peecho
railway variable set PEECHO_API_KEY="..." PEECHO_ENV="production" --service mvp
```

### Auto-wired variables (already set)

- `REDIS_URL` — Railway private DNS via `${{Redis.REDIS_URL}}`
- `AWS_*` — Railway bucket credentials for `digiart-storage`
- `AUTH_URL` / `NEXT_PUBLIC_APP_URL` — Railway public domain
- `STORAGE_DRIVER=s3` (pdf-worker)
- `NODE_ENV=production`

### Monorepo build config

Railway uses the repo root (shared pnpm workspace). Services are scoped via `--filter`:

| Service      | Build command                    | Start command                    |
| ------------ | -------------------------------- | -------------------------------- |
| `mvp`        | `pnpm --filter mvp build`        | `pnpm --filter mvp start`        |
| `pdf-worker` | `pnpm --filter pdf-worker build` | `pnpm --filter pdf-worker start` |

Pre-deploy command on `mvp`: `pnpm --filter mvp db:migrate` (runs Prisma migrations before each deploy).

### First deploy

1. Set all required secrets above
2. Push to `main` — Railway auto-deploys on push
3. Or trigger manually: `railway up --service mvp --detach -m "initial deploy"`

## Image Storage Setup (S3 / MinIO)

The application supports two storage backends: **AWS S3** for production and **MinIO** for local development. Both use the same S3-compatible API.

### Environment Variables

| Variable                | Required | Description                                           |
| ----------------------- | -------- | ----------------------------------------------------- |
| `AWS_REGION`            | Yes      | AWS region (e.g., `eu-west-1`) or any value for MinIO |
| `AWS_ACCESS_KEY_ID`     | Yes      | Access key for S3 or MinIO                            |
| `AWS_SECRET_ACCESS_KEY` | Yes      | Secret key for S3 or MinIO                            |
| `AWS_S3_BUCKET`         | Yes      | Bucket name for storing artworks                      |
| `AWS_ENDPOINT_URL`      | No       | Set to `http://localhost:9000` for MinIO only         |

### Local Development (MinIO)

1. **Start MinIO with Docker Compose:**

   ```bash
   cd apps
   docker-compose up -d
   ```

2. **Configure `.env`:**

   ```bash
   AWS_REGION="us-east-1"
   AWS_ACCESS_KEY_ID="minioadmin"
   AWS_SECRET_ACCESS_KEY="minioadmin"
   AWS_S3_BUCKET="booklets"
   AWS_ENDPOINT_URL="http://localhost:9000"
   ```

3. **Access MinIO Console:**
   - API endpoint: http://localhost:9000
   - Web console: http://localhost:9001 (login: `minioadmin` / `minioadmin`)

### Production (AWS S3)

1. **Create an S3 bucket** in your AWS account

2. **Configure `.env`:**

   ```bash
   AWS_REGION="eu-west-1"
   AWS_ACCESS_KEY_ID="your-aws-access-key"
   AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
   AWS_S3_BUCKET="your-bucket-name"
   # No AWS_ENDPOINT_URL - omit this for AWS S3
   ```

3. **Ensure your AWS credentials have S3 permissions** for PutObject, GetObject, DeleteObject, and CopyObject

### How It Works

The `lib/s3.ts` module automatically detects which backend to use:

- If `AWS_ENDPOINT_URL` is set → Uses **MinIO** with path-style URLs
- If `AWS_ENDPOINT_URL` is not set → Uses **AWS S3** with virtual-hosted URLs

Public URLs are generated via `getPublicStorageUrl(key)` which returns:

- MinIO: `http://localhost:9000/{bucket}/{key}`
- AWS S3: `https://{bucket}.s3.amazonaws.com/{key}`
