# Physical print test — what to order and what to look for

**Built 2026-07-31.** Three PDFs, designed so a printed copy answers six
questions with a ruler and a side-by-side rather than an impression.

Generator: `apps/pdf-worker/scripts/build-print-test.cts`
Calibration pages: `apps/pdf-worker/scripts/print-test-pages.cts`

The artwork pages go through the **real** `CoverPageService` and
`ArtworkPageService`, so what prints is what production would print. Only the
colour path differs, and that is the point of test B.

---

## The finding that shaped this test

Peecho's knowledge base states: *"Peecho's print suppliers require files in RGB
format. Even if you upload a file in CMYK, their system will automatically
convert it to RGB before sending it to production."* They recommend exporting
RGB from the start where colour matters.

Our pipeline does the opposite. `pdfx-processor.service.ts` runs every booklet
through Ghostscript to **PDF/X-3 with CMYK / FOGRA39**. So a Threads JPEG goes
**RGB → CMYK → back to RGB** before it reaches a press. Two gamut conversions,
on saturated digital art, which is the worst case for exactly this.

This is a hypothesis until paper says otherwise — hence tests A and B being the
same content down opposite colour paths.

## What to order

| # | File | Pages | Colour | Answers |
| --- | --- | --- | --- | --- |
| **A** | `~/Downloads/printfeed-test-A-rgb.pdf` | 30 | RGB, as authored | 1:1, colour baseline, resolution, credits, curation, material |
| **B** | `~/Downloads/printfeed-test-B-cmyk.pdf` | 30 | CMYK/FOGRA39 (current pipeline) | colour, against A |
| **C** | `~/Downloads/printfeed-test-C-rgb-long.pdf` | 60 | RGB | size / page count, against A |

Each has a sibling `.manifest.json` mapping every page to its artist, pixel
size, measured dpi and tier.

Order all three **in the same product, paper and binding**, or the comparisons
are worthless. One copy each.

**Product (confirmed against the live account, 2026-07-31):** offering
**7011275** — *Magazine, glossy laminated cover, silk content, full colour, A5
(148x210mm)*, **18-500 pages**. It is the only A5 offering on the account, which
settles half the material question before anything is printed: the cover is
glossy laminated, the interior is silk. All three books are in range.

**Cost, quoted live, shipping to SI in EUR:**

| | Print | Shipping | VAT | Total |
| --- | --- | --- | --- | --- |
| **All three in one order** | 35.00 | 9.01 | 2.89 | **46.90** |
| A + B only (colour test alone) | 21.72 | 6.93 | 1.79 | **30.44** |
| Single 30pp book | 14.64 | 6.93 | 1.21 | 22.78 |
| Single 60pp book | 18.56 | 6.93 | 1.53 | 27.02 |

Order all three as **one** order: three separate orders cost 72.58, and a single
press run is also what makes the comparisons fair.

**Placing it:** `apps/mvp/scripts/order-print-test.ts` creates the order unpaid
and stops. Paying is a separate Peecho call and a separate decision; the script
will not make it.

```bash
pnpm --filter mvp exec tsx scripts/order-print-test.ts \
  --env <path to env with PEECHO_MERCHANT_API_KEY> \
  --address address.json --files files.json --live --dry-run
```

Drop `--dry-run` to create it. Without `--live` it hits Peecho's test endpoint,
which is the right place to rehearse.

**Two things the script cannot supply:**

1. **A shipping address and email.** Required by Peecho, and not guessable.
2. **A public HTTPS URL per PDF.** Peecho fetches the file itself, so a local
   path is not enough, and there are no storage credentials alongside the Peecho
   keys. Either host the three PDFs somewhere Peecho can GET them, or upload
   them through Peecho's web checkout, which takes the file directly.

## What to check when they arrive

### 1. PDF → print, 1:1?
**Page 2 of any book.** Put a ruler on the 100 mm bar. It must read 100 mm. Do
the vertical bar too — if they disagree, the scaling is non-uniform. Then look at
the corner marks: they were drawn flush to the page edge, so whatever is missing
is what the guillotine took. That number tells you whether the 10 mm safe margin
is generous, correct, or already too tight.

### 2. Colours
**Page 3 of A and B, side by side, in daylight.** Same swatches, same press,
opposite colour paths.
- If **A is visibly better**, delete the CMYK conversion — the pipeline is
  actively damaging colour and the fix is to stop converting.
- If they are **indistinguishable**, the conversion is harmless and can stay for
  PDF/X compliance.
- If **B is better**, that is a surprise worth understanding before changing
  anything.
Watch the saturated row hardest — hot pink, electric blue, acid green are where
gamut clipping shows. On the greyscale ramp, look for banding and for where
black stops separating.

### 3. Curation
**Pages 8 onward.** Plates are grouped by artist and contiguous, two per artist
in A, three in C. Read it as a magazine and ask: does an artist's run hold
together? Does the boundary between two artists land, or does it read as a
shuffle? There is currently **no divider, no section title, nothing** between
artists — just the next plate. If the boundary feels abrupt, that is a design
gap to fill, and it is cheap to fill.

**Note a real inconsistency:** this test groups by artist, but the product path
(`lib/collect/print-service.ts`) currently preserves *collect order*, which
interleaves artists. Whichever reads better on paper should become the one
behaviour.

### 4. Artist credits
**Page 4** shows five credit formats at 6/7/8/9 pt; the book prints the 7 pt
line today. Then check the real plates — the caption sits along the image's own
bottom edge, and rotates on landscape plates.
Ask: does `@handle` read as a credit or as a watermark? Is a display name
needed? Is 7 pt legible on silk stock at arm's length? Everything we know about
a collected artist is the handle, so if a handle is not enough, that is a
constraint on the whole collect funnel, not a typography fix.

### 5. Size
**A (30 pp) against C (60 pp).** Same content family, same binding. Which one
feels like a product? 30 pages may read as thin and unsatisfying; 60 with three
plates per artist may read as unfocused. The per-artist cap is the lever —
currently 2 by default in `print-service.ts` — and the answer here sets it.
Also check the spine: at 30 pages perfect binding can be marginal, and how the
book *opens* matters as much as how many pages it has.

### 6. Material
Whatever you ordered, judge: does silk-coated 115 gsm suit this artwork? Is
there show-through from the reverse plate? Does a soft cover feel like a
magazine or like a pamphlet? Does gloss help the saturated work and hurt the
muted work?

### Also worth noticing
The proof copy will show a **duplicated credit** wherever the caption's first
line is just the handle — "shumov_painter — @shumov_painter". Cosmetic, already
known, worth confirming how bad it looks in print.

## The resolution ladders — pages 5, 6, 7

These set the floor, so they get their own protocol.

**What they are.** One image, four cells, identical printed size, fed at
300 / 250 / 200 / 150 dpi. Everywhere else in the book a soft plate and a sharp
plate are also *different pictures*, so comparing them judges composition and
palette as much as sharpness. Here resolution is the only thing that varies.

**Why three pages, not one.** Artwork hides low resolution at very different
rates, so a floor set on one picture is a floor for that kind of picture only:

| Page | Artist | Archetype | Expected behaviour |
| --- | --- | --- | --- |
| 5 | `@anastasiatrusovaart` | Dense palette-knife texture, high-contrast detail, saturated | **Fails earliest.** Fine strokes mush together. |
| 6 | `@georgiahartstudios` | Soft tonal, near-neutral landscape | Hides softness well; watch for **banding** in the sky. |
| 7 | `@postwook` | Flat graphic silhouette on a large saturated field | Survives almost anything; watch the **silhouette edge** and flat-field banding. |

**The cells are blind.** Labelled A-D in a shuffled order, different on each
page, key on **page 28**. Knowing a cell is 150 dpi before you look at it is the
fastest way to see what you expect to see.

### How to evaluate

1. **Fix the viewing distance: 35-40 cm, normal reading.** Hold it. A loupe
   condemns everything, arm's length passes everything — the distance *is* the
   test.
2. **Write a verdict per cell before turning to the key.** Two passes, and the
   second is the one that counts:
   - **Rank** the four side by side, best to worst.
   - **Then cover the other three** and ask of each alone: *would I accept this
     as a page I paid for?* Side-by-side inflates sensitivity — you can reliably
     see a difference you would never notice on its own page, and a collector
     only ever sees one page at a time.
3. **The question is not "can I tell them apart."** On page 5 you probably can.
   The question is where "fine" becomes "annoying". Mark that boundary.
4. **Get a second opinion from someone who does not know what varies.** If they
   cannot pick the 200 dpi cell out of a lineup, that is data.
5. **Only then read page 28**, and record the lowest acceptable dpi *per
   archetype*.
6. **Cross-check against the real plates.** The manifest gives every plate's
   measured dpi. Find a ~250 dpi and a ~400 dpi plate in the same book and see
   whether the verdict survives contact with full-page artwork — including the
   thing the ladder cannot show, a soft plate facing a sharp one across a spread.

### Reading the outcome

- **The three agree** — set `PRINT_DPI_FLOOR` to the worst acceptable value.
  One line.
- **They disagree** — the likely result: the textured piece fails at 250 while
  the flat graphic is fine at 150. Then a single global floor is the wrong
  model, and grading should measure each plate's actual detail. Do not build
  that until the print says so.
- **Nothing below 300 is acceptable** — the tiered floor was too optimistic and
  coverage drops back to ~13 of 31 artists. That reopens asking artists for
  high-res files, and only then upscaling.
- **Even 150 is fine** — the floor was never the real constraint, and almost
  every collected artist comes into range.

## Recording the result

The two dpi constants live in one place —
`packages/print-geometry/src/grade.ts` (`PRINT_DPI_FLOOR`, `PRINT_DPI_WARN`) —
so whatever page 5 says translates to a one-line change.

Whatever the ladders say is a one-line change — unless the three archetypes
disagree, in which case the finding is bigger than a constant.
