# ELSEWHERE — Artist Curation & Consent Program (Issue 01)

**Status:** draft, 2026-07-03 — the artist-recruitment keystone. Every outreach
message, application page, and selection decision references this doc.
**Grounded in:** [worlds-magazine-concept](./worlds-magazine-concept.md) (editorial
spine, provenance principle, five regions), [ai-art-landscape](./ai-art-landscape.md)
(subject taxonomy + fit-flags + backlash risk).

> **Model (decided 2026-07-03):** Issue 01 is a **capital-light demo**. We curate
> existing, excellent, publicly-shared AI art and **upscale it for print** — but every
> piece runs **with the artist's consent and credit**, never scraped. **No upfront
> royalties for the demo;** revenue-share turns on once venues are paying. The consent
> outreach *is* our creator-recruiting engine — every "yes" is a signed-up creator and
> a warm relationship. ⚙️ *Open founder inputs marked below.*

---

## 1. Why this is the whole strategy, not a side task

Getting an artist's "yes" here is the same act as recruiting a creator for the B2C
marketplace — reframed from *"join our empty platform"* into *"we love your work and
want to print it, credited, in a gallery-grade magazine on the tables of the
best-designed venues — free now, and you share revenue once venues subscribe."*
Artists say yes to that. Every one becomes a seeded, warm creator for the marketplace.

## 2. The offer — what an artist gets (demo issue)

- **A printed showcase, credited.** Named on the piece + a bio in "The Cartographers"
  back matter + a link out. A premium physical object in curated venues — not a feed
  that scrolls away.
- **We do the print work.** We handle curation, upscaling to print resolution, and
  layout. Zero effort or cost to the artist.
- **They keep everything.** ⚙️ *Proposed: non-exclusive, worldwide print + promotional
  license for the specific piece in ELSEWHERE and its marketing; artist retains
  copyright, can sell/show anywhere, revoke for future issues. No exclusivity.*
- **Revenue-share when venues pay.** ⚙️ *Proposed: once a venue subscription revenue
  base exists, contributing artists share in it (and in any "take a world home" print
  sales). Framed honestly as coming-when-there's-revenue, not promised for the demo.*
- **First access to the platform.** Contributors get early access to the B2C creator
  product (subscriptions + print sales) as it opens, and their worlds can return.

**The honesty rule:** never overstate. "Free now, credited, rev-share when venues
subscribe, no exclusivity" — say exactly that. The whole moat is *not* being the
scrapey thing; the pitch has to model it.

## 3. The provenance guardrail (non-negotiable)

ELSEWHERE's masthead promise is *every world made by a named artist who chose to be
here.* Therefore, for the demo:

- **No piece prints without explicit consent** from its maker. Consent + credit is the
  minimum bar — the thing that separates us from the backlash pattern.
- Keep a **consent record** per piece (who, what, where reached, their yes, terms
  shown). This is both ethics and legal cover.
- If an artist can't be reached or says no → cut the piece. Never "ask forgiveness."

## 4. Issue 01 creative brief (the curation filter)

**Theme:** *First Dispatches* — the inaugural map of ELSEWHERE. Curate toward five
regions, all in the research GREEN fit-zone:

| Region | What we're curating for |
| --- | --- |
| **I. Worldbuilding** | Whole invented places — terraformed futures, rewilded earths, worlds with their own quiet logic. |
| **II. Dreamscapes** | Serene impossibilities — a calm that shouldn't exist, half-remembered. |
| **III. Imagined Architecture** | Cities never built, shown as *livable* (never dystopian/decayed). |
| **IV. Cosmic** | Skies borrowed from other planets; stillness at the scale of galaxies. |
| **V. Algorithmic Abstractions** | Pure colour and form — generative, never once repeated. |

**Each selected piece needs a "field note"** — a 1–2 sentence hook that names the world
and hints at its logic (we can draft it and get the artist's OK). This is what makes a
world *explorable* rather than decorative.

**Auto-decline:** uncanny close-up human portraits; dystopia / ruin / decay;
disembodied-eye surrealism; anything provocative or "AI-slop"-coded. Gut check: does it
feel *calm, curious, considered* on a café table?

**Print-readiness:** we upscale, so a great lower-res piece is fine to select — but for
final print we want the **highest-res original the artist can share** (or their OK to
upscale). Target: long edge ≥ ~4000px equivalent after upscaling, landscape preferred.

## 5. Who we're curating from

AI-native visual artists with a distinct world-sense — feeds that already read like
postcards from somewhere that doesn't exist. Source communities: **Cara**, Instagram, X,
Behance/ArtStation, curated AI-art newsletters, Midjourney / Flux showcase channels,
r/aiArt-adjacent showcase subs. Quality bar over volume — a small, excellent, *consenting*
roster is the brand.

## 6. How it works (the consent + recruiting funnel)

1. **Curate** → shortlist pieces that fit the brief, by region.
2. **Reach out** → per-artist permission message (credit now + rev-share later + prestige
   placement). See the outreach kit.
3. **Consent** → capture the yes + terms shown + best-res file → log it.
4. **Produce** → upscale, lay out, write/clear the field note, credit in The Cartographers.
5. **Recruit** → every yes → tracked creator signup + Resend contact + a note to pitch the
   B2C platform later.

Instrument the funnel in PostHog (`artist_outreach_sent → artist_consented →
artist_featured`) so recruiting is measured, not guessed — same discipline as the venue
and B2C funnels.

## 7. What to build next (turning this into an engine)

- **Outreach kit** — permission templates + plain-language consent terms + response
  tracking. *(→ elsewhere-outreach-kit.md)*
- **Sourcing list** — an initial 30–50 candidate artists + the specific pieces that fit,
  by region, with links. High-touch by hand at first; systematize later.
- **Consent + creator-signup capture** — every yes becomes a tracked creator lead
  (Resend + the mvp CRM `Lead` model), so curation feeds the B2C pipeline directly.
- **Print-prep pipeline** *(later / as needed)* — Replicate-based upscale-to-300DPI for
  the pieces we've cleared, so "curation + upscaling" is a repeatable step, not manual.
