# ADR-001: Storage Backend Selection — Railway S3 for MVP

## Status
Accepted

## Context
The art subscription platform requires object storage for:
- Artwork image uploads (up to 50MB each, pending validation)
- Avatar images (up to 5MB each)
- Generated booklet PDFs (print-ready, fulfillment source)

The MVP is deployed on Railway with the pdf-worker and Next.js app in the same project.

## Decision
Use Railway's S3-compatible object storage (`digiart-storage` bucket, AMS region) for the MVP/NDP phase.

## Rationale

### Why Railway S3 for MVP

1. **Single vendor simplicity** — Billing, logs, networking, and credentials are unified in Railway dashboard. Zero additional operational overhead during validation phase.

2. **Zero egress costs** — Both MVP app and pdf-worker access the bucket over Railway's private network. No bandwidth charges for inter-service communication.

3. **Region alignment** — AMS (Amsterdam) region aligns with EU pilot focus (Tier 1-2 shipping regions).

4. **Auto-wired credentials** — Railway injects `AWS_*` environment variables automatically. No manual secret rotation or IAM policy management.

5. **Code abstraction** — The `lib/s3.ts` module already abstracts backend selection via `AWS_ENDPOINT_URL`. Switching to AWS S3 later requires only an environment variable change, no code changes.

### Why Not AWS S3 Now

1. **Egress costs** — AWS charges ~$0.09/GB for data transfer out. With Railway S3, egress within Railway is free.

2. **IAM overhead** — AWS requires managing access keys, IAM roles, and S3 bucket policies. This adds complexity during MVP validation.

3. **CDD (Cost-Driven Decision)** — The CDN benefits of CloudFront (global low-latency image serving) are not needed for EU pilot scope. This becomes relevant when expanding to Tier 3-5 markets (UK, North America, Asia-Pacific).

4. **Lifecycle policies** — Railway S3 lacks lifecycle rules, but this can be addressed with a cron job for `uploads/pending/` cleanup at MVP scale.

## Consequences

### Positive
- Reduced operational complexity during validation
- No additional vendor to manage
- Zero egress costs between services
- Migration path to AWS S3 is zero-friction (env var change only)

### Negative
- No native CDN integration for artwork previews
- No lifecycle policies (requires manual cleanup or cron job)
- Durability SLA is less battle-tested than AWS S3 (11 nines)
- Vendor lock-in risk if Railway object storage changes or is deprecated

### Technical Debt
- `storage.service.ts:54` hardcodes AWS S3 URL format: `https://${bucket}.s3.${region}.amazonaws.com/${key}`. This may produce incorrect URLs for Railway S3. Verify endpoint format and use `getPublicStorageUrl()` pattern from MVP for consistency.

## Migration Path

Switch triggers to move to AWS S3:
1. **CDN requirement** — When artwork preview gallery performance becomes critical (likely when expanding beyond EU)
2. **Lifecycle management** — When `uploads/pending/` cleanup needs automated expiry
3. **Scale** — When PDF volume makes egress costs significant
4. **Reliability** — If Railway S3 shows durability/availability issues

Migration steps:
1. Create AWS S3 bucket in `eu-west-1` or `eu-central-1`
2. Set `AWS_ENDPOINT_URL` to empty (or omit) in Railway env vars
3. Update IAM credentials
4. Optional: Configure CloudFront distribution for public image assets

## Alternatives Considered

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Railway S3 | Single vendor, zero egress, simple | No CDN, no lifecycle policies | **Selected for MVP** |
| AWS S3 | Industry standard, CloudFront, lifecycle rules | Egress costs, IAM overhead, another vendor | Deferred to post-MVP |
| Cloudflare R2 | Zero egress globally, S3-compatible | Additional vendor, less integration with Railway | Not evaluated yet |
| Backblaze B2 | Low cost, S3-compatible | No native CDN, requires CloudFront | Not evaluated yet |

## References
- Deployment guideline: `apps/mvp/docs/deployment-guideline.md`
- S3 abstraction: `apps/mvp/lib/s3.ts`
- Storage service: `apps/pdf-worker/src/booklet/storage/storage.service.ts`
- PRD shipping tiers: `docs/PRD.md` (lines 66-90)
