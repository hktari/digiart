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
| **A** | `~/Downloads/printfeed-test-A-rgb.pdf` | 26 | RGB, as authored | 1:1, colour baseline, credits, curation, material |
| **B** | `~/Downloads/printfeed-test-B-cmyk.pdf` | 26 | CMYK/FOGRA39 (current pipeline) | colour, against A |
| **C** | `~/Downloads/printfeed-test-C-rgb-long.pdf` | 56 | RGB | size / page count, against A |

Each has a sibling `.manifest.json` mapping every page to its artist, pixel
size, measured dpi and tier.

Order all three **in the same product, paper and binding**, or the comparisons
are worthless. One copy each.

**Product:** A5 magazine, perfect bound, 115 gsm silk-coated — that is the stock
Peecho lists for magazines. Silk sits between matt and gloss; if a true gloss or
a heavier cover is offered in the configurator, note which you chose here,
because "glossy + softcover" is one of the open questions and the answer depends
on what they actually offer. Peecho magazines run **18–500 pages**, so all three
are in range.

**Order by hand** through Peecho's web flow. Not via the API — live order
integration is deliberately out of scope, and this is a purchase.

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
**Pages 6 onward.** Plates are grouped by artist and contiguous, two per artist
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
**A (26 pp) against C (56 pp).** Same content family, same binding. Which one
feels like a product? 26 pages may read as thin and unsatisfying; 56 with three
plates per artist may read as unfocused. The per-artist cap is the lever —
currently 2 by default in `print-service.ts` — and the answer here sets it.
Also check the spine: at 26 pages perfect binding can be marginal, and how the
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

## Recording the result

The two dpi constants live in one place —
`packages/print-geometry/src/grade.ts` (`PRINT_DPI_FLOOR`, `PRINT_DPI_WARN`) —
so whatever page 5 says translates to a one-line change.

**Page 5 is the most valuable page in the book.** One image, four cells, same
printed size, fed at 300 / 250 / 200 / 150 dpi. The first cell that looks wrong
is where the floor belongs. A normal proof cannot answer this, because every
plate is a different picture and you end up judging the art instead of the
resolution.
