# Deployment Guidelines

## Image Storage Setup (S3 / MinIO)

The application supports two storage backends: **AWS S3** for production and **MinIO** for local development. Both use the same S3-compatible API.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AWS_REGION` | Yes | AWS region (e.g., `eu-west-1`) or any value for MinIO |
| `AWS_ACCESS_KEY_ID` | Yes | Access key for S3 or MinIO |
| `AWS_SECRET_ACCESS_KEY` | Yes | Secret key for S3 or MinIO |
| `AWS_S3_BUCKET` | Yes | Bucket name for storing artworks |
| `AWS_ENDPOINT_URL` | No | Set to `http://localhost:9000` for MinIO only |

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
