# MVP Phase 1 Progress

## Tickets

| #   | Title                                                                     | Status               |
| --- | ------------------------------------------------------------------------- | -------------------- |
| 1   | Create MVP app, align base tooling                                        | ✅ Done              |
| 2   | Prisma schema, DB config, NextAuth core tables                            | ✅ Done              |
| 3   | Multi-role user support (creator + collector on one account)              | ✅ Done              |
| 4   | Magic-link auth + onboarding entry flow                                   | ✅ Done              |
| 5   | Minimal creator onboarding (profile, payout readiness, slug, share)       | ✅ Done (22 tests)   |
| 6   | Generic creator social links                                              | ✅ Done (21 tests)   |
| 7   | App-managed artwork upload and storage                                    | ✅ Done (part of T8) |
| 8   | Artwork CRUD with metadata and orientation capture                        | ✅ Done (6 tests)    |
| 9   | Monthly releases with publish state and artwork assignment                | ⬜ Pending           |
| 10  | Release tags for creator org and collector filtering                      | ⬜ Pending           |
| 11  | Public creator profile pages (collector acquisition path)                 | ⬜ Pending           |
| 12  | Collector onboarding from creator link + shipping country                 | ⬜ Pending           |
| 13  | Collector creator subscription records                                    | ⬜ Pending           |
| 14  | Collector release selection records                                       | ⬜ Pending           |
| 15  | Collector browse and discovery (filtered by tags)                         | ⬜ Pending           |
| 16  | SubscriptionCycle with lock and fulfillment dates                         | ⬜ Pending           |
| 17  | Booklet constraint config (page-range rules)                              | ⬜ Pending           |
| 18  | Peecho offering sync/config and pricing quote service                     | ⬜ Pending           |
| 19  | Persist quote snapshots                                                   | ⬜ Pending           |
| 20  | Notification trigger framework + email templates                          | ⬜ Pending           |
| 21  | Pre-lock detection for insufficient pages + reselection notifications     | ⬜ Pending           |
| 22  | Fulfillment blocking rule (min page count not met at lock date)           | ⬜ Pending           |
| 23  | Future-ready interfaces (booklet gen, POD order, payout)                  | ⬜ Pending           |
| 24  | Validate role gating, cycle gating, quote fallback, notification triggers | ⬜ Pending           |

## Sprint Plan

### Sprint 1 — Foundation ✅ Complete (T1–T4)

App scaffold, Prisma schema, NextAuth magic-link, multi-role support, onboarding branch.

### Sprint 2 — Creator Side (T5–T11)

Goal: a creator can sign up, complete their profile, upload artworks, publish a release, and share their public link.

- **T5** `/creator/setup` multi-step form: display name, slug (unique check), avatar upload, bio, payout basics. Gate publish on required fields.
- **T6** `/creator/profile` social links: repeatable label + URL list (add/remove).
- **T7** File upload infrastructure: storage adapter (local dev / S3-compatible prod), upload API route `/api/uploads`.
- **T8** `/creator/artworks` CRUD: upload, title, orientation capture, archive.
- **T9** `/creator/releases` + `/creator/releases/new` + `/creator/releases/[id]`: create release, assign artworks, set publish state.
- **T10** Release tags: tag model seeding/management, tag selector on release form, tag display.
- **T11** `/creators/[slug]` public profile: display name, avatar, bio, social links, published releases, subscribe CTA.

### Sprint 3 — Collector Side (T12–T15)

Goal: a collector can land on a creator link, sign up, subscribe, select releases, and browse.

- **T12** `/creators/[slug]/subscribe` + `/collector/setup`: post-auth onboarding, shipping country capture.
- **T13** Collector creator subscription record creation + `/collector/subscriptions` view.
- **T14** `/collector/releases` release selection flow: browse creator releases, select/deselect for current cycle.
- **T15** `/browse/creators` + `/browse/releases` + `/collector/discover`: filtered by tags, basic search.

### Sprint 4 — Platform Controls (T16–T19)

Goal: admin can manage cycles, constraints, and pricing; collector sees live quote estimate.

- **T16** `/admin/cycles`: create/edit `SubscriptionCycle` with lock + fulfillment dates, status transitions.
- **T17** `/admin/booklet-constraints`: configure min/max pages, active flag.
- **T18** Peecho integration: offering sync to `PodOffering`, quote endpoint wrapper at `/api/pricing/quote`.
- **T19** `/collector/pricing`: display live Peecho quote snapshot; persist to `PricingQuoteSnapshot`.

### Sprint 5 — Notifications + Fulfillment Gate (T20–T24)

Goal: automated emails keep creators and collectors on the happy path; fulfillment blocked when eligibility fails.

- **T20** Notification framework: Resend email templates for all `EmailNotificationType` values, trigger service.
- **T21** Pre-lock job: scan collector selections, detect insufficient eligible pages, trigger at-risk notifications.
- **T22** Fulfillment block: at lock date, mark ineligible collectors as blocked, send `COLLECTOR_FULFILLMENT_BLOCKED`.
- **T23** Stub interfaces: `BookletComposition`, `PodOrder`, `CreatorPayout` types as no-op boundaries for future phases.
- **T24** Integration QA: role gating on all protected routes, cycle date gating, quote fallback, notification log audit.

## Notes

- Build: In progress — fixing `lib/auth.ts` type errors
- Tests: 63 unit tests passing (T5: 22, T6: 21, T8: 6 + existing)
- Husky + lint-staged: pre-commit runs lint + typecheck + format ✅
- `biome.json` now extends root monorepo config ✅
- Prisma 7 with `@prisma/adapter-pg` (lazy client — no eager DB connection at build time) ✅
- NextAuth v5 beta: magic-link via Resend, roles in session, post-auth → `/onboarding` ✅
- DB not yet provisioned — set `DATABASE_URL` in `.env.local` and run `pnpm db:migrate` to activate

### PDF Generation System (PR #1 — untested)

- `lib/image-validation.ts`: Sharp-based format/resolution/orientation checks (min 1748×1240px, JPEG/PNG only, ≤50MB)
- `lib/s3.ts`: lazy S3 client with env guard
- `POST /api/artworks/presign`: presigned S3 PUT for `uploads/pending/{uuid}`
- `POST /api/artworks/register`: validates → promotes to `artworks/` → creates Artwork record; cleans up on failure
- `POST /api/fulfillment/generate-booklet`: admin-only BullMQ job dispatch
- `GeneratedPrintFile` + `PrintFileStatus` added to Prisma schema (needs `pnpm db:migrate`)
- Upload UI at `/creator/artworks/new`: drag-drop, progress bar, per-code error messages
- `apps/pdf-worker` NestJS app: BullMQ processor, pdf-lib booklet assembly, S3/local storage driver
- Requires: `docker compose up -d` (Redis), AWS S3 env vars, `prisma generate` in pdf-worker
