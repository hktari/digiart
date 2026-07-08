# Collect Funnel

The **Collect → Print → Get-Paid** loop: a value-first growth funnel that turns
a Threads user's existing collection into a printed magazine, and turns every
collect into two signup prospects (the collector *and* the artist). Conversion
is a real `mvp` magic-link signup — not a live charge.

> **Status:** demo / pitch surface. All pieces of the loop are in place so a
> viewer understands the whole thing. Live money (Stripe charge, Peecho order,
> PayPal payout) is intentionally deferred — those pipelines already exist in
> `lib/billing` and are the production continuation. See
> [Real vs. demo](#real-vs-demo).

---

## The loop

```
Threads   ──[Collect]──►   Your Collection   ──[Print as magazine]──►  activate → ship
 artist                    /c/<token>                                    (mvp signup)
   │                       N pieces from M artists                            │
   └────────── accrues margin share + "claim your page" ◄────────────────────┘
                          /claim/<handle>   →   activate → get paid   (mvp signup)
```

- **Value first:** collecting needs no account. A hosted, durable collection
  appears immediately at `/c/<token>`.
- **Two prospects per collect:** the collector (`Lead type=COLLECTOR`) and the
  artist whose work was collected (`Lead type=CREATOR`, deduped by handle).
- **Conversion:** *activate* to unlock platform features — collector →
  printing/shipping, creator → payouts. Activation is a magic-link signup that
  stitches the anonymous lead to a real `User`.

## The three questions it answers

1. **Where does "Collect" move the images?**
   The extension posts the collected images (as signed Threads CDN URLs) to a
   public ingest endpoint. The server **fetches the bytes while the URL is still
   valid and stores them durably in S3** under `collect/<token>/<imageId>.<ext>`.
   Pages render via presigned GET URLs, so collections never rot when the CDN
   links expire. Local `~/Downloads/art-collect/` download stays as a fallback.

2. **How does the user go from Collect to Print?**
   Every collect lands in a hosted collection at `/c/<token>`. From there,
   **Print as magazine →** opens `/c/<token>/print`: a magazine mock-up, an
   illustrative price (base + per-page), and **Activate to ship**, which routes
   through magic-link signup and back. On authenticated return,
   `claimCollection(token)` links the collection to the user and advances the
   collector lead to `SIGNED_UP`.

3. **How does the creator get notified & compensated?**
   Each collected item is attributed to a creator `Lead` by Threads handle. The
   **`/claim/<handle>`** page aggregates every collect of that artist's work —
   collector count, collected pieces, and **pending earnings** — and is the
   asset pasted into Threads to reach the artist. **Claim your page & get paid**
   converts the creator via signup; `claimCreatorLead(handle)` advances that
   lead to `SIGNED_UP`. Real payout runs through the existing
   `lib/billing/payout-service` + PayPal path once activated.

---

## Code map

| Concern | Path |
| --- | --- |
| Ingest logic | `apps/mvp/lib/collect/ingest-service.ts` (`ingestCollect`, `getCollectionView`, `getClaimView`) |
| Server actions (conversion) | `apps/mvp/lib/collect/actions.ts` (`saveCollectionEmail`, `claimCollection`, `claimCreatorLead`) |
| Demo pricing | `apps/mvp/lib/collect/pricing.ts` |
| Public ingest endpoint | `apps/mvp/app/api/collect/ingest/route.ts` |
| Collection page | `apps/mvp/app/c/[token]/page.tsx` |
| Print page | `apps/mvp/app/c/[token]/print/page.tsx` |
| Claim page | `apps/mvp/app/claim/[handle]/page.tsx` |
| Standalone shell (no app chrome) | `apps/mvp/components/layout/app-shell.tsx` |
| Durable storage helper | `apps/mvp/lib/s3.ts` (`putStorageObject`, `getPresignedStorageUrl`) |
| Lead/analytics helpers | `apps/mvp/lib/analytics/events.ts` |
| Admin funnel view | `apps/mvp/app/admin/analytics/collectors/page.tsx` |
| Browser extension | `extensions/threads-collector/` (see its `README.md`) |

Design & build history: `docs/superpowers/specs/2026-07-06-collect-funnel-demo.md`
and `docs/superpowers/plans/2026-07-06-threads-collector-poc.md`.

## Data model

Reuses the existing GTM layer; adds two models + one `Lead` field. Migration:
`20260706155910_collect_funnel`.

- **`Lead`** — anonymous-first prospect (`type: COLLECTOR | CREATOR`, nullable
  `email`, funnel `status: NEW → … → SIGNED_UP → ACTIVATED`, `source`,
  `ownerUserId`). New field **`sourceHandle`** (+ index) dedups creator leads by
  Threads handle.
- **`LeadEvent`** — one `collect` event per collect.
- **`Collection`** — `token` (guest token from the extension, unique), optional
  `email`, `collectorLeadId`, `ownerUserId` (stitched at activation), `items[]`.
- **`CollectedItem`** — `storageKey` (durable S3), `imageId` (dedup key),
  `sourceHandle`, `sourcePostUrl`, `caption`, `creatorLeadId`.
  `@@unique([collectionId, imageId])` makes re-collects idempotent.

## Ingest — `POST /api/collect/ingest` (public)

Unauthenticated, CORS-open (`Access-Control-Allow-Origin: *` + `OPTIONS`
preflight) because the extension is cross-origin from `threads.com`. Same trust
model as the landing waitlist. Zod-validated.

**Request:**
```jsonc
{
  "token":   "<guest token>",         // string, 8–100 chars; minted + persisted in chrome.storage
  "handle":  "magdalenakaczmarczykart", // 1–100 chars
  "postUrl": "https://www.threads.com/@.../post/...", // optional
  "caption": "…",                     // optional, ≤2000 chars
  "images": [                          // 1–20 items
    { "url": "<signed cdn url>", "imageId": "…", "width": 3280, "height": 1920, "ext": "jpg" }
  ]
}
```

**Behavior** (`ingestCollect`, `source = "threads_collect"`):
1. Upsert `Collection` by `token`.
2. Ensure collector `Lead` (`type COLLECTOR`) + link to collection; log a
   `collect` `LeadEvent`.
3. `findFirst`-or-create creator `Lead` by `(type CREATOR, sourceHandle=handle)`
   — **prospect #2 per collect**.
4. Per image: fetch bytes → `putStorageObject` to S3 → upsert `CollectedItem`
   (deduped on `[collectionId, imageId]`), attributed to the creator lead.

**Response:** `{ token, collectionUrl: "/c/<token>", itemCount }`. Analytics
failures never throw to the caller (best-effort).

## Pages (public, standalone)

All three render **without the authenticated app chrome** — `AppShell`
(`components/layout/app-shell.tsx`) detects the `/c/` and `/claim/` prefixes and
skips the sidebar/breadcrumb/footer so a pasted link looks intentional. Pages
use **semantic color tokens** (`bg-background`, `bg-card`, `text-foreground`,
`text-muted-foreground`, …) and are theme-aware in both light and dark.

- **`/c/[token]`** — collection grid grouped by artist; "N pieces from M
  artists"; **Print as magazine →**; optional email capture
  (`saveCollectionEmail`).
- **`/c/[token]/print`** — magazine mock-up, illustrative price, ship teaser,
  **Activate to ship** → sign-in with `callbackUrl` back to the page.
  `claimCollection` on return.
- **`/claim/[handle]`** — per-artist aggregate (collectors, pieces, pending
  earnings), collected-work grid, **Claim your page & get paid**.
  `claimCreatorLead` on return. This is the Threads-facing asset.

## Pricing (illustrative — not a live quote)

`lib/collect/pricing.ts`. Deliberately simple so the flow *feels* real:

- `magazinePriceCents(n) = 1200 + 150 × n` (base cover/binding + one page per
  collected piece). `formatEur(1800) → "€18.00"`.
- `creatorEarningsCents(collectors) = 200 × collectors` — display-only pending
  earnings on the claim page.

The production price comes from `lib/peecho` (live quote) + the booklet
pipeline; these constants are demo stand-ins.

## Where prospects & analytics land

- **`Lead` / `LeadEvent`** in the `mvp` Postgres DB — the single home for
  collector and creator prospects (no Airtable). Every collect creates/updates
  both leads and logs a `collect` event.
- **Admin funnel view:** `/admin/analytics/collectors` — collector-lead counts,
  signup conversion %, and creator leads ranked by collect volume.
- **PostHog:** anonymous events via `lib/analytics/events.ts`
  (`trackAnonymousEvent`), stitched to the user on activation. See
  `memory` note on PostHog project 173494 / funnel dashboard 792915.

## Real vs. demo

| Real (as-built) | Demo / deferred |
| --- | --- |
| Durable S3 image storage | Live Peecho order submission |
| Collector + creator `Lead` capture, dedup, events | Live Stripe charge |
| Magic-link **signup** as the conversion event | Real PayPal payout to creators |
| Hosted collection / print / claim pages | Illustrative pricing & earnings numbers |
| Admin funnel + PostHog measurement | Any change to cycle/booklet machinery |

The demo converts on **signup**. Fulfillment and payout are the existing
production pipelines (`lib/billing/*`, `lib/peecho/*`, `pdf-worker`) that a
signed-up user flows into.

## Run it

```bash
pnpm dev                     # mvp on :3003
# load the unpacked extension from extensions/threads-collector (see its README)
# collect on threads.com → toast links to /c/<token>
```

**Local vs. deployed:** the extension's `MVP_URL` (`content.js`) points at the
deployed origin `https://app.printfeed.btechhub.top` for pitching; switch it back
to `http://localhost:3003` for end-to-end testing. The manifest permits both
hosts. The ingest endpoint is CORS-open, so the extension can post from
`threads.com` to either origin.
