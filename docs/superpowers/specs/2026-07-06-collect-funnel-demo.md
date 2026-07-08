# Collect Funnel Demo — Design Spec

**Date:** 2026-07-06
**Goal:** Turn the Threads "Collect" extension into a two-sided, value-first funnel that drives signups on the `mvp` app. Every collect delivers immediate value (a hosted collection) and captures two prospects (collector + creator) as native `Lead` records. Activation — the conversion event — is a real mvp magic-link signup.

## The loop

```
Threads  ──[Collect]──►  Your Collection  ──[Print as magazine]──►  activate → ship
  artist                  /c/<token>                                  (mvp signup)
    │                     N pieces from M artists                          │
    └────────── accrues margin share + "claim your page" ◄────────────────┘
                /claim/<handle>  →  activate → get paid  (mvp signup)
```

**Value first:** collecting requires no account. **Conversion:** activate to unlock platform features — collector → printing/shipping, creator → payouts.

## Data model

Reuse the existing GTM layer, add two models for the grabbed artworks.

**Reused (no change to behavior):**
- `Lead` (`type: COLLECTOR | CREATOR`, nullable `email` → anon-first, `status` funnel `NEW → … → SIGNED_UP → ACTIVATED`, `source`, `ownerUserId`, `creatorProfileId`).
- `LeadEvent` — one `collect` event per collect.
- `lib/analytics/events.ts` helpers (`createLead`, `updateLeadStatus`).

**New field on `Lead`:** `sourceHandle String?` + `@@index([sourceHandle])` — dedup creator leads by Threads handle (no natural unique key exists today).

**New models (migration `collect_funnel`):**

```prisma
model Collection {
  id              String   @id @default(cuid())
  token           String   @unique          // guest token minted by the extension
  email           String?                    // captured at a value moment (save/ship)
  collectorLeadId String?  @unique
  ownerUserId     String?  @unique           // stitched on at activation (signup)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  collectorLead Lead?           @relation("CollectionCollectorLead", fields: [collectorLeadId], references: [id])
  ownerUser     User?           @relation(fields: [ownerUserId], references: [id])
  items         CollectedItem[]
}

model CollectedItem {
  id            String   @id @default(cuid())
  collectionId  String
  storageKey    String                        // durable S3 key (bytes fetched at ingest)
  imageId       String                        // dedup key (CDN filename stem)
  width         Int?
  height        Int?
  sourceHandle  String                        // threads @handle
  sourcePostUrl String?
  caption       String?  @db.Text
  creatorLeadId String?
  createdAt     DateTime @default(now())

  collection  Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  creatorLead Lead?      @relation("CollectedItemCreatorLead", fields: [creatorLeadId], references: [id])

  @@unique([collectionId, imageId])
  @@index([sourceHandle])
  @@index([creatorLeadId])
}
```

Back-relations added to `Lead` (`collectionAsCollector`, `collectedItems`) and `User` (`collection`).

**Durability:** Threads CDN URLs are signed + expiring. At ingest the server fetches the bytes (URL still valid) and `PutObject`s to S3 under `collect/<token>/<imageId>.<ext>`, storing `storageKey`. Pages render via `getPresignedStorageUrl(key)` (`lib/s3.ts`). Collections don't rot.

## Ingest — `POST /api/collect/ingest` (public)

Admin API is `requireAdmin()`-gated and can't be called from an extension. This is a dedicated public write, same trust model as the landing waitlist: unauthenticated, CORS-enabled (extension is cross-origin from threads.com), zod-validated, lightly rate-limited.

**Request:**
```jsonc
{
  "token": "<guest token>",           // minted + persisted in extension chrome.storage
  "mode": "post" | "single",
  "handle": "magdalenakaczmarczykart",
  "postUrl": "https://www.threads.com/@.../post/...",
  "caption": "…",
  "images": [{ "url": "<signed cdn url>", "imageId": "…", "width": 3280, "height": 1920 }]
}
```

**Behavior (`lib/collect/ingest-service.ts` → `ingestCollect`):**
1. Upsert `Collection` by `token`.
2. Ensure collector `Lead` (`type COLLECTOR`, `source "threads_collect"`) linked to the collection; log a `collect` `LeadEvent`.
3. Ensure creator `Lead` by `(type CREATOR, sourceHandle=handle)` — findFirst-or-create (**this is prospect #2 per collect**), `source "threads_collect"`, `notes` = handle.
4. For each image: fetch bytes → S3 → upsert `CollectedItem` (unique `[collectionId, imageId]`, so re-collects dedupe) linked to the creator lead.
5. CORS: `OPTIONS` handler + `Access-Control-Allow-Origin: *` on responses.

**Response:** `{ token, collectionUrl: "/c/<token>", itemCount }`. Never throws to the caller on analytics failure (best-effort, matching `trackAnonymousEvent`).

## Pages (mvp, public)

- **`/c/[token]`** — collection grid grouped by artist; header "N pieces from M artists"; **Print as magazine →** CTA to `/c/[token]/print`; minimal "save your collection" email capture (server action `saveCollectionEmail` → sets `Collection.email` + collector lead email).
- **`/c/[token]/print`** — magazine preview (cover + spreads from items), page-count → demo price (`magazinePrice(itemCount)` — flat base + per-page; NOT a live Peecho quote), ship-to teaser, **Activate to ship** → `/auth/sign-in?callbackUrl=/c/[token]/print`. On authenticated return, server action `claimCollection(token)` links `Collection.ownerUserId`, flips collector lead → `SIGNED_UP`; page shows "You're in — magazine on the way."
- **`/claim/[handle]`** — aggregate `CollectedItem` by `sourceHandle`: count collectors, show collected pieces, **pending earnings** (`EARNINGS_PER_COLLECT` constant × distinct collections — display only). **Claim your page & get paid** → `/auth/sign-in?callbackUrl=/claim/[handle]`. On authenticated return, mark creator lead `SIGNED_UP`. This page is the asset pasted into Threads.

## Extension change

`background.js`: after the existing local download, `fetch(POST <MVP_URL>/api/collect/ingest, {token, …})`. Token minted once and persisted in `chrome.storage.local`. Toast in `content.js` links to `<MVP_URL>/c/<token>`. Manifest gains `host_permissions` for the mvp origin. Local download stays as a fallback.

## Explicitly out of scope

Live Stripe charges, real Peecho order submission, real PayPal payouts, and any change to mvp's cycle/booklet machinery. The demo converts on **signup**, not on live money; the real fulfillment/payout pipelines already exist and are the production continuation.

## Test focus

- `ingest-service`: dedup on re-collect (`[collectionId, imageId]`), two leads per collect, creator-lead dedup by handle. (Mock S3 + fetch.)
- `magazinePrice`: monotonic in item count.
- Extension `extract.js` tests already cover parsing; add an ingest-payload shaper test if logic moves there.
