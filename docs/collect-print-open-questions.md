# Collection → print: open questions

**Status:** deferred, 2026-07-30. Deliberately not designed yet — these are
decisions to make, not a plan to execute. Everything below the questions is
evidence gathered while reviewing the funnel, so the next session starts from
facts rather than re-deriving them.

Related: [collect-funnel.md](./collect-funnel.md) (the funnel as built).

---

## The four questions

### 1. What is the minimum resolution still acceptable for print?

The current floor is **1696 × 2528 px** (`MIN_WIDTH_PX` / `MIN_HEIGHT_PX` in
`apps/pdf-worker/src/booklet/booklet.types.ts`), roughly 300 dpi across a
full-bleed A5 page.

What that costs us, measured against 92 real collected images:

| Floor | Approx. dpi at A5 | Images passing |
| --- | --- | --- |
| 1696 × 2528 (current) | ~300 | **16 / 92 (17%)** |
| 1131 × 1685 | ~200 | ~45 / 92 (49%) |
| 848 × 1264 | ~150 | most |

Threads serves phone-sized images for the majority of artists; this is a
property of what they uploaded, not of how we collect (see *Ruled out* below).
So the floor is the single biggest determinant of whether a collection is
printable at all.

Worth checking Peecho's published minimum rather than guessing — they state a
requirement, and it is likely below 300 dpi.

**Related decision:** the processor currently rejects the *entire job* if any
one artwork is under the floor. For a 77-piece collection that is fatal on the
first bad image. Collections almost certainly need skip-and-report instead.

### 2. Is generative upscaling viable, and what is the process?

Mechanically this is easy — Replicate is already wired into this workspace, and
upscalers are a solved commodity.

The hard part is not technical. Upscalers **invent detail that the artist did
not draw**. Doing that to someone else's artwork, then printing and selling it,
is a different act from reproducing their work. It cuts directly against the
"named, credited, opted in, never scraped" positioning that the ELSEWHERE and
PrintFeed campaigns are built on.

So the question splits:

- Is upscaling acceptable **at all** for work we did not originate?
- If yes, only with the artist's consent, or silently?
- If used: originals kept alongside derivatives, disclosed on the page, or not?
- Cost and latency per image at collection scale (77 pieces is one collection).

A defensible middle: upscale only after the artist has claimed and agreed, and
treat it as a fallback to question 3 rather than a substitute.

### 3. Can we automatically prompt the author for a high-res version?

Partly — the pieces exist, with one gap.

**Exists:** a `CREATOR` `Lead` per handle, deduped on `sourceHandle`, created on
every collect. A `/claim/<handle>` page. A working transactional email sender
(`apps/mvp/lib/email.ts`, added 2026-07-30).

**The gap:** creator leads have a Threads handle and **no email address**. So
"automatically contact" cannot mean email until the artist has claimed their
page. The real sequence is:

```
collect → creator Lead (handle only)
        → outbound on Threads/IG (manual or semi-automated, no address yet)
        → artist claims /claim/<handle> → account + email
        → NOW email can ask for print-res files
```

**Also missing:** somewhere for a claimed artist to upload print-res versions.
The creator artwork-upload path (`app/creator/artworks`) may be reusable, but
nothing links a `CollectedItem` to an `Artwork` an artist later uploads.

This is the option most consistent with the positioning: it asks rather than
fabricates, and it converts an artist in the process.

### 4. How does this fit the PrintFeed booklet generation system? (product)

The existing machinery is **subscription-cycle-shaped**: a booklet belongs to a
`(collectorProfileId, cycleId)` pair, assembled from `CollectorReleaseSelection`
→ `Release` → `Artwork`. A collection has none of those.

Two shapes, and this choice determines most of the technical work:

- **A collection is a cycle of one.** Reuse the cycle machinery with a synthetic
  profile/cycle. Less new code, but bends a subscription model around a one-off
  purchase.
- **A collection is its own product.** A distinct job type and its own keying.
  Cleaner conceptually; more to build; two booklet paths to maintain.

Bound up with this: is the collection booklet a **one-off print** or the
**first issue of a subscription**? That is the actual product question, and it
decides whether the collect funnel feeds the subscription product or sits
beside it.

---

## Technical facts established (so nobody re-derives them)

**The two apps share one database.** `CLAUDE.md` says "separate Prisma schemas /
databases" — the *schemas* are separate, the database is not. The worker's 12
models are a read-slice of mvp's 39 against the same Neon instance. This is not
a cross-database problem.

**The job payload is the coupling point.** `BookletJobData` is
`{collectorProfileId, cycleId, issueLabel, pageFormat}` and the worker resolves
artwork itself. Either add `Collection`/`CollectedItem` to the worker schema, or
make the job self-contained by passing the artwork list in the payload — the
latter decouples the worker from mvp's schema entirely and is probably the
better default.

**`GeneratedPrintFile` is uniquely keyed `collectorProfileId_cycleId`.** A
collection has neither; this needs a nullable collection key either way.

**`CollectedItem` has no `orientation` column** — derivable from width/height,
which have been measured server-side from the stored bytes since 2026-07-30.

**Scale:** the one real collection is 77 pieces from 24 artists ≈ 80 printed
pages. Worth checking against Peecho's perfect-bound page limits, and against
what it does to the price.

**Already unblocked (2026-07-30):** the worker built its own download URL at
`<bucket>.s3.<region>.amazonaws.com`, which in production resolved to nothing —
storage is Tigris via `AWS_ENDPOINT_URL`, and the bucket is private. Downloads
now go through `StorageService` as a signed `GetObject`. Before this, *every*
booklet job would have failed at the first artwork regardless of anything else.

## Ruled out

**Our collection path is not the resolution bottleneck.** `pickLargestSrcset`
already takes the largest candidate offered, and collecting from the fullscreen
viewer versus the post page makes no material difference (23% vs 20%
print-ready). Two artists collected both ways contradict each other. The ceiling
is what the artist uploaded to Threads.
