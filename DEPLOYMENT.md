# Deployment Guide

This guide covers deploying the Art Subscription Platform MVP to Railway and the PDF worker to Railway.

## Prerequisites

- [ ] Neon Postgres database created
- [ ] AWS S3 bucket created (or alternative S3-compatible storage)
- [ ] Redis instance (Railway, Upstash, or similar)
- [ ] Railway account

## 1. Deploy MVP to Railway

### Setup

1. **Create New Project in Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Configure Service**
   - Railway will detect the monorepo structure
   - **Root Directory**: `apps/mvp`
   - The `railway.toml` in `apps/mvp` configures build and deploy commands automatically
   - On every deploy, Railway will run: migrations → seed → start

3. **Set Environment Variables**

   In Railway project settings, add:

   ```bash
   # Database
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require

   # NextAuth
   NEXTAUTH_URL=https://your-service.railway.app
   AUTH_SECRET=<generate-with-openssl-rand-base64-32>

   # AWS S3 (for booklet storage)
   AWS_REGION=eu-west-1
   AWS_ACCESS_KEY_ID=<your-access-key>
   AWS_SECRET_ACCESS_KEY=<your-secret-key>
   AWS_S3_BUCKET=<your-bucket-name>

   # Redis (for BullMQ job queue)
   REDIS_URL=redis://default:password@host:port

   # PDF Worker API
   PDF_WORKER_URL=https://your-worker.railway.app

   # App
   PORT=3000
   NODE_ENV=production
   ```

4. **Deploy**
   - Railway will build and deploy your MVP
   - Every deployment automatically runs `prisma migrate deploy` then `seed-production.ts` (idempotent) before starting

### Post-Deployment

1. **Generate Public Domain**
   - In Railway service settings, generate a public domain
   - Copy the URL (e.g., `https://your-mvp.railway.app`)

2. **Run Smoke Tests**

   Verify the deployment is healthy:

   ```bash
   cd apps/mvp
   MVP_DEPLOYMENT_URL=https://your-mvp.railway.app pnpm test:smoke
   ```

3. **Set up custom domain** (optional)
4. **Update `NEXTAUTH_URL`** to match your domain
5. **Redeploy to apply changes**

## 2. Deploy PDF Worker to Railway

### Setup

1. **Create New Project in Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Configure Service**
   - Railway will detect the Dockerfile automatically
   - **Root Directory**: Leave as `/` (Dockerfile is at repo root)
   - **Dockerfile Path**: `Dockerfile`

3. **Set Environment Variables**

   In Railway project settings, add:

   ```bash
   # Database (same as MVP)
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require

   # Redis
   REDIS_URL=redis://default:password@host:port

   # Storage
   STORAGE_DRIVER=s3
   AWS_REGION=eu-west-1
   AWS_ACCESS_KEY_ID=<your-access-key>
   AWS_SECRET_ACCESS_KEY=<your-secret-key>
   AWS_S3_BUCKET=<your-bucket-name>

   # App
   PORT=3001
   NODE_ENV=production
   ```

   **Note**: Do NOT set `AWS_ENDPOINT_URL` in production (that's only for local MinIO)

4. **Deploy**
   - Railway will build the Docker image and deploy
   - Check logs to ensure the service starts successfully

5. **Get Public URL**
   - In Railway service settings, generate a public domain
   - Copy the URL (e.g., `https://your-worker.railway.app`)
   - Update `PDF_WORKER_URL` in the MVP Railway service environment variables
   - Redeploy MVP on Railway

### Post-Deployment

- Monitor Railway logs for any errors
- Test booklet generation from MVP
- Set up health check endpoint monitoring (optional)

## 3. Database Migrations

### Initial Setup

Migrations run automatically on every Railway deployment via `railway.toml`. For manual migration:

```bash
# From your local machine
DATABASE_URL=<production-database-url> pnpm --filter mvp db:migrate:deploy
```

### Future Migrations

1. Create migration locally:

   ```bash
   pnpm --filter mvp db:migrate
   ```

2. Commit the migration files

3. Deploy to Railway — migrations and seed run automatically

## 4. Redis Setup

### Option A: Railway Redis

1. In your Railway project, click "New Service"
2. Select "Redis"
3. Copy the connection URL
4. Add to both MVP and PDF Worker environment variables

### Option B: Upstash

1. Create account at [upstash.com](https://upstash.com)
2. Create new Redis database
3. Copy connection URL
4. Add to both MVP and PDF Worker environment variables

## 5. S3 Storage Setup

### AWS S3

1. Create S3 bucket in AWS Console
2. Create IAM user with S3 access
3. Generate access keys
4. Configure CORS for bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://your-domain.vercel.app"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### Alternative: Cloudflare R2

Cloudflare R2 is S3-compatible and more cost-effective:

1. Create R2 bucket in Cloudflare dashboard
2. Generate API tokens
3. Use R2 endpoint as `AWS_ENDPOINT_URL` (optional, or use S3-compatible endpoint)

## 6. Monitoring & Logs

### Railway

- View logs in Railway dashboard → Service → Logs
- Set up alerts for service downtime

## 7. Environment Variables Checklist

### MVP (Railway)

- [ ] `DATABASE_URL`
- [ ] `NEXTAUTH_URL`
- [ ] `AUTH_SECRET`
- [ ] `ADMIN_EMAIL` (required for seed script)
- [ ] `AWS_REGION`
- [ ] `AWS_ACCESS_KEY_ID`
- [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] `AWS_S3_BUCKET`
- [ ] `REDIS_URL`
- [ ] `PDF_WORKER_URL`

### PDF Worker (Railway)

- [ ] `DATABASE_URL`
- [ ] `REDIS_URL`
- [ ] `STORAGE_DRIVER=s3`
- [ ] `AWS_REGION`
- [ ] `AWS_ACCESS_KEY_ID`
- [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] `AWS_S3_BUCKET`
- [ ] `PORT=3001`
- [ ] `NODE_ENV=production`

## 8. Troubleshooting

### MVP won't build on Railway

- Check Railway build logs for errors
- Verify root directory is set to `apps/mvp`
- Ensure all dependencies are in `package.json`
- Confirm `ADMIN_EMAIL` env var is set (required by seed script)

### PDF Worker fails to start on Railway

- Check Railway logs for startup errors
- Verify Dockerfile builds locally: `docker build -t pdf-worker .`
- Ensure all environment variables are set
- Check Redis and Database connectivity

### Booklet generation fails

- Verify `PDF_WORKER_URL` is set correctly in MVP
- Check Railway logs for worker errors
- Verify S3 credentials and bucket permissions
- Test Redis connection from both services

## 9. Cost Estimates

### MVP (Railway)

- **Hobby**: $5/month
- **Pro**: Pay-as-you-go (recommended for production)

### Railway

- **Free tier**: $5 credit/month (limited)
- **Estimated**: $10-20/month for worker + Redis

### Neon

- **Free tier**: Available
- **Pro**: Starts at $19/month

### AWS S3

- **Storage**: ~$0.023/GB/month
- **Requests**: Minimal for this use case
- **Estimated**: $1-5/month

**Total estimated monthly cost**: $30-50/month for production

## 10. Next Steps

- [ ] Set up custom domain on Railway
- [ ] Configure monitoring and alerts
- [ ] Set up automated backups for Postgres
- [ ] Implement error tracking (Sentry, LogRocket, etc.)
- [ ] Set up CI/CD for automated testing before deployment
- [ ] Configure CDN for static assets (Vercel handles this automatically)
