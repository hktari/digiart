# Collection → print: consolidating the two booklet paths

**Status:** designed 2026-07-31, approved. Supersedes the deferral in
[collect-print-open-questions.md](../../collect-print-open-questions.md) — three
of the four questions there are now answered or made moot.

**Priority:** consolidate the extension→magazine path with the PrintFeed booklet
builder, and get a **real booklet physically printed** from the collected work.
The print is not a victory lap; it is the instrument that settles the image
resolution requirement empirically.

---

## What this changes, in one paragraph

The PDF worker currently *is* the subscription logic: it takes
`{collectorProfileId, cycleId}` and runs a `CollectorReleaseSelection` query
itself. That query is the only reason a `Collection` cannot use the same
pipeline. We invert it — callers resolve artwork, the worker only builds — so
one worker path serves both cycles and collections. At the same time we fix the
reason most collected images are unprintable: the resolution gate and the page
renderer disagree about what a page looks like, and the gate is wrong.

## Decisions taken

| Question | Decision |
| --- | --- |
| One-off print or first issue of a subscription? | **One-off print.** A collection is "issue zero", a standalone purchase. Subscription is pitched after delivery, not at checkout. |
| Print floor? | **Tiered.** ≥250 dpi prints; 200–250 dpi prints but is flagged to the collector, who can keep or drop it; <200 dpi is dropped. |
| Scope of this pass? | **Through PDF generation.** Collection → queued job → PDF/X in storage → collector can preview it. No live Peecho order, no Stripe charge. |
| Generative upscaling? | **Not needed, so not built.** The tiered floor recovers enough coverage that we do not have to take a position on altering other people's artwork. Left open, unbuilt. |

## Evidence behind the floor

Measured over all 108 images (31 artists) collected by the extension into
`~/Downloads/art-collect`:

| Policy | Images | Artists |
| --- | --- | --- |
| Current gate (assumes full-bleed) | 32 / 108 (30%) | 10 / 31 |
| True 300 dpi *as actually rendered* | 40 / 108 (37%) | 13 / 31 |
| **250 dpi as rendered** | **78 / 108 (72%)** | **20 / 31** |
| 220 dpi as rendered | 82 / 108 (76%) | 21 / 31 |
| 200 dpi as rendered | 86 / 108 (80%) | 24 / 31 |

Two things follow. First, **measuring the right thing gains three artists at no
quality cost at all** — that gain is pure defect repair. Second, Peecho's own
published guidance is ≥150 dpi recommended for images and 220 dpi for text-heavy
documents, with 300 as ideal; our 300 dpi hard reject was stricter than the
printer's, self-imposed, and never met by the renderer anyway.

Orientation-blindness in the current constant was investigated and **ruled out**
as a cause: zero images pass an orientation-aware 300 dpi test that the current
constant rejects. A `2608×1370` landscape plate fails both ways, because
full-bleed A5 needs ~1748 px on the short edge.

## Root cause: the gate and the renderer disagree

- `apps/pdf-worker/src/booklet/booklet.types.ts:38` — `MIN_WIDTH_PX = 1696`,
  `MIN_HEIGHT_PX = 2528`: enough pixels for a **full-bleed** A5 plate at 300 dpi.
- `apps/pdf-worker/src/booklet/pdf/artwork-page.service.ts:11` —
  `MARGIN_PT = 28.35` (10 mm, per Peecho's guideline), and lines 151–155 scale
  each image **to fit inside that margin**.

The renderer has never produced a full-bleed plate. The gate has always been
validating against a layout that does not exist. Changing the number alone
leaves the two expressions independent and free to drift again, which is why
the fix is structural.

---

## Design

### 1. One worker path, two callers

`BookletJobData` becomes self-contained:

```ts
interface BookletJobData {
  printFileId: string;      // the row to update — one key for both callers
  issueLabel: string;
  pageFormat?: PageFormat;
  plates: ArtworkRecord[];  // resolved: storageKey, width, height, orientation, creatorName
}
```

The worker's job reduces to: download each `storageKey` through
`StorageService` → grade → build → upload → update `printFileId`. It performs no
artwork queries and knows nothing of cycles *or* collections.

- The existing `CollectorReleaseSelection` query moves out of
  `booklet.processor.ts` into `apps/mvp/lib/billing/pdf-trigger-service.ts`,
  essentially verbatim, including the creator-name stamping that keeps
  multi-creator booklets credited.
- A new `apps/mvp/lib/collect/print-service.ts` does the `CollectedItem`
  equivalent for collections.

This is the shape `apps/pdf-worker/scripts/build-demo-booklet.cts` already
proves: it drives the real `PdfBuilderService` from extension collects with no
Redis, no database and no cycle. We are promoting that proven path to production.

**Risk, stated plainly:** this touches the working cycle path, not only the new
one. The mitigation is that the query moves rather than changes, and the
existing `booklet.processor.spec.ts` suite must stay green as the proof.

### 2. Print geometry as shared code

New workspace package `packages/print-geometry` (requires adding `packages/*` to
`pnpm-workspace.yaml`; `Dockerfile.pdf-worker` already builds from the monorepo
root, which preserves the linkage). It exports:

- `PAGE_DIMENSIONS`, `MARGIN_PT`
- the fit-inside-margin computation
- `plateDpi(width, height, pageFormat)`
- `gradePlate(width, height, pageFormat) → "OK" | "MARGINAL" | "REJECT"`

`artwork-page.service.ts` uses it to *place* the image, the grader uses it to
*score* the image, and `apps/mvp` imports the same package for the collector
preview. The gate cannot drift from the renderer because it is the same
function. This is the part that makes the bug non-recurring rather than fixed
once.

### 3. Tiered grading and skip-and-report

```ts
PRINT_DPI_FLOOR = 250;   // prints
PRINT_DPI_WARN  = 200;   // prints, flagged to the collector
```

The processor grades every plate, **drops rejects and continues**, and fails the
job only when nothing survives. This replaces the `throw` at
`booklet.processor.ts:97`, which currently kills an entire job on its first
under-floor image — fatal for a 77-piece collection.

Dropped and marginal plates are returned on `BookletJobResult` and persisted, so
they surface to the collector instead of vanishing. `build-demo-booklet.cts`
already sets the standard: never report a selection without saying what fell out
of it.

### 4. Data model

`GeneratedPrintFile` is keyed `@@unique([collectorProfileId, cycleId])`; a
collection has neither.

- `collectorProfileId` and `cycleId` become nullable (relations become optional).
- Add nullable `collectionId` + relation to `Collection`, with `@@unique([collectionId])`.
- Keep `@@unique([collectorProfileId, cycleId])` — Postgres treats NULLs as
  distinct, so collection rows do not collide and the cycle path is untouched.
- The worker stops keying on `collectorProfileId_cycleId` and updates by
  `printFileId` primary key. This is what makes a single worker path possible.

A **new** migration via `pnpm --filter mvp db:migrate`. Committed migrations are
immutable and enforced by `scripts/prevent-migration-modification.js`.

### 5. Collector-facing preview

`/c/[token]/print` gains a readout above the CTA, computed in mvp from
`CollectedItem.width/height` through the shared package:

> **78 of 108 pieces are print-ready.** 8 will look soft at this size — keep or
> drop. 22 can't be printed at the resolution the artist posted.

Keep/drop persists as a selection; the chosen plate ids go into the job payload.
This is where the tiered floor becomes visible rather than a silent quality
compromise. The CTA continues to reserve — no order, no charge.

**Page count control:** 78 plates is roughly 80 pages. A per-artist cap
(the demo script's `--per-artist`) defaults to 2, collector-adjustable. Peecho's
perfect-bound page limit is still unverified and must be checked before the
proof print is ordered.

### 6. The proof print

A first-class deliverable, not a follow-up. As soon as the shared geometry and
tiered grading land (before the consolidation work), generate a booklet from the
real collection and **order one physical copy manually through Peecho's web
flow** — manual, so this stays inside the "no live order integration" scope while
still producing a physical object.

The booklet is built to be diagnostic: it deliberately includes plates from all
three tiers (300+, 250–299, 200–249), and a build manifest records which plate
is which. Holding the printed copy then answers, from paper rather than from
argument:

- Is 250 dpi actually acceptable at A5? Is 200?
- Does a marginal plate read as soft when facing a 300 dpi neighbour?
- Is ~80 pages the right magazine, or is the per-artist cap doing real work?

Order it early: it ships on physical timescales, and the consolidation work
proceeds while it is in transit. Whatever it teaches feeds back into
`PRINT_DPI_FLOOR` and `PRINT_DPI_WARN`, which is why they are two named
constants in one shared package rather than numbers spread across two apps.

### 7. Testing

- `plateDpi` / `gradePlate` unit tests, including the regression that started
  this: `1880×2280` must pass at 250 dpi, and the full-bleed and margined
  computations must not diverge.
- Processor tests for skip-and-report, and for the all-rejected failure.
- `print-service` test: collection → payload.
- The existing cycle specs stay green — that is the evidence the payload
  inversion did not break the production path.

---

## Out of scope, deliberately

- **Generative upscaling** (open question 2). The tiered floor makes it
  unnecessary; the authorship question it raises is not one to answer under
  schedule pressure.
- **Asking artists for high-res files** (open question 3). Still blocked on
  creator leads having a Threads handle and no email until they claim.
- **Live Peecho order submission and Stripe charge.** The proof print is ordered
  by hand precisely so this stays out.

## Sequencing

1. `packages/print-geometry` + tiered grading + skip-and-report.
2. **Order the proof print.** (Physical lead time starts here.)
3. Payload inversion, `GeneratedPrintFile` keying, migration, `print-service`.
4. Collector preview on `/c/[token]/print`.
5. Fold what the printed copy teaches back into the two dpi constants.
