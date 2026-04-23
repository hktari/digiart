# MVP Phase 1 Progress

## Current Status

- **Sprint 1** (T1-T4): ✅ Complete
- **Sprint 2** (T5-T11): ✅ Complete (except T10 tag UI)
- **Sprint 3** (T12-T15): ✅ Complete
- **Sprint 4** (T16-T19): ⬜ Not started
- **Sprint 5** (T20-T24): ⬜ Not started

**Latest completion:** Sprint 3 - Full collector-side implementation with subscription flow, release selection, and browse/discover pages (T12-T15).

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
| 9   | Monthly releases with publish state and artwork assignment                | ✅ Done              |
| 10  | Release tags for creator org and collector filtering                      | 🟡 Schema only       |
| 11  | Public creator profile pages (collector acquisition path)                 | ✅ Done              |
| 12  | Collector onboarding from creator link + shipping country                 | ✅ Done              |
| 13  | Collector creator subscription records                                    | ✅ Done              |
| 14  | Collector release selection records                                       | ✅ Done              |
| 15  | Collector browse and discovery (filtered by tags)                         | ✅ Done              |
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

### Sprint 2 — Creator Side (T5–T11) ✅ Complete (except T10 tags UI)

Goal: a creator can sign up, complete their profile, upload artworks, publish a release, and share their public link.

- **T5** ✅ `/creator/setup` multi-step form: display name, slug (unique check), avatar upload, bio, payout basics. Gate publish on required fields.
- **T6** ✅ `/creator/profile` social links: repeatable label + URL list (add/remove).
- **T7** ✅ File upload infrastructure: storage adapter (local dev / S3-compatible prod), upload API route `/api/uploads`.
- **T8** ✅ `/creator/artworks` CRUD: upload, title, orientation capture, archive.
- **T9** ✅ `/creator/releases` + `/creator/releases/new` + `/creator/releases/[id]`: create release, assign artworks, set publish state.
- **T10** 🟡 Release tags: tag model in schema, but UI for tag selector/display not implemented.
- **T11** ✅ `/creators/[slug]` public profile: display name, avatar, bio, social links, published releases, subscribe CTA.

### Sprint 3 — Collector Side (T12–T15) ✅ Complete

Goal: a collector can land on a creator link, sign up, subscribe, select releases, and browse.

- **T12** ✅ `/creators/[slug]/subscribe` + `/collector/setup`: Full implementation with role creation, shipping country selection (24 countries), and redirect flow from creator profiles.
- **T13** ✅ `/collector/subscriptions`: Grid view of active subscriptions with creator cards, avatars, bio snippets, and links to creator profiles.
- **T14** ✅ `/collector/releases`: Interactive release selection grid with current cycle info, lock date display, artwork previews, tag filtering, and optimistic UI updates.
- **T15** ✅ `/browse/creators` + `/browse/releases` + `/collector/discover`: Full browse experience with tag filtering, creator/release cards, search by tags, and dual-view discover page.

**Implementation details:**

- New actions: `lib/actions/collector.ts` (profile, subscriptions, selections), `lib/actions/cycles.ts` (cycle queries), `lib/actions/browse.ts` (public discovery)
- New components: `CollectorSetupForm`, `ReleaseSelectionGrid`
- All pages fully functional with proper auth guards, empty states, and responsive layouts
- Tag-based filtering across all browse/discover pages
- Optimistic UI updates for release selection with error rollback
<<<<<<< /home/bostjan/source/projects/art-subscription-platform/apps/mvp/progress.md
=======
- Collector dashboard (`/collector`) with stats cards, subscription preview, and quick links
- Header navigation updated to match actual routes (`/browse/creators`, `/browse/releases`)
- Country list marked for Peecho integration in Sprint 4 (currently hardcoded 24 countries)
>>>>>>> /home/bostjan/.windsurf/worktrees/art-subscription-platform/art-subscription-platform-3533524b/apps/mvp/progress.md

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

- Prisma 7 with `@prisma/adapter-pg` (lazy client — no eager DB connection at build time) ✅
- NextAuth v5 beta: magic-link via Resend, roles in session, post-auth → `/onboarding` ✅
