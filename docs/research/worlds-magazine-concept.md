# "Worlds" Magazine — Editorial Concept (working blueprint)

**Status:** draft blueprint, 2026-07-02 — feeds the venue-facing frontend build.
**Grounded in:** [ai-art-landscape](./ai-art-landscape.md) (subject taxonomy + fit-flags + backlash risk), [b2b-venue-channel](./b2b-venue-channel.md), [b2b-venue-icp](./b2b-venue-icp.md).

---

## 1. Working name

**Primary: _ELSEWHERE_** — "monthly dispatches from worlds that don't exist."
Clean, evocative, curiosity-forward; works as a spine-word on a cover; doesn't shout "AI."

Alternates:

- **_PROVENANCE_** — leans into the paid-credited-artist positioning (double meaning: art-world provenance + "where it came from"). Strong if we want the ethics angle in the name itself.
- **_TERRA INCOGNITA_** — classic "unknown worlds" cartographic feel.

> Naming is not locked — treat _ELSEWHERE_ as the placeholder the frontend is built around; swap trivially later.

## 2. One-line positioning

> A curated monthly print journey through imagined worlds — dreamscapes, impossible cities, and unseen natural wonders — made by named, paid artists working with AI.

**Pitch register:** wonder first, tech last. The reader should feel _"where is this place?"_ before _"how was this made?"_ (Per research: leading with aesthetics, not "AI!", is what keeps it venue-safe.)

## 3. The provenance principle (non-negotiable)

The entire AI-art backlash is about _scraped, uncompensated, anonymous_ work. ELSEWHERE is the inverse and says so on the masthead:

> **Every world in these pages was made by a named artist who chose to be here and is paid for their work.**

This is our single biggest differentiator and risk-inoculation — available only because the platform already has creator opt-in + payout rails. It appears on the cover flap, the masthead, and the venue pitch.

## 4. Chapter spine (adapted from MAK Vienna's validated taxonomy)

Each issue moves through five "regions," all sitting in the research GREEN/AMBER fit-zones:

| Chapter                         | What it holds                                                                   | Fit |
| ------------------------------- | ------------------------------------------------------------------------------- | --- |
| **I. Worldbuilding**            | imagined environments, terraformed/rewilded futures, whole invented places      | 🟢  |
| **II. Dreamscapes**             | serene surreal, impossible-but-calm scenes                                      | 🟢  |
| **III. Imagined Architecture**  | speculative _livable_ cities & structures (never dystopian/decayed)             | 🟢  |
| **IV. Cosmic**                  | celestial vistas, imagined planets, deep-space serenity                         | 🟢  |
| **V. Algorithmic Abstractions** | generative pattern, color, form                                                 | 🟢  |
| _(rotating guest region)_       | e.g. whimsical **bestiary** or **retrofuturism** — art-directed, used sparingly | 🟡  |

**Screened out every issue (RED):** uncanny close-up human portraits, dystopian/ruin/decay, disembodied-eye surrealism, anything provocative or "AI-slop"-coded.

## 5. Issue anatomy

- **Cover:** one hero "world," logotype only, no cover lines (matches existing quiet-luxury mockup direction).
- **The Threshold** (opening spread): a short evocative editor's note framing this issue's mood/theme.
- **Five chapters**, each opening with a full-bleed hero + a 1–2 sentence "field note" that gives the world a _story hook_ (name it, hint at its logic) — this is what makes it _explorable_, not just pretty.
- **The Cartographers** (back matter): the named artists, short bios, credit — the provenance made visible.
- **(Later) A discreet way to take a world home** — QR to buy the print; venue earns commission (channel doc).

## 6. Tone & voice

Quiet, literary, curious. Think _Kinfolk × a naturalist's field journal from an imaginary planet._ Present each world as if reporting back from somewhere real. Never hype, never "look what AI can do."

## 7. Cadence & physical spec

- **Monthly** (matches platform cadence); each issue a self-contained journey, lightly serialized (recurring worlds can return).
- **Premium coffee-table-scale print** — gloss-laminated softcover, silk-coated interior (existing spec), page-count in the platform's dynamic-pricing sweet spot.
- Precedent (_The AI Art Magazine_, ~176pp / ~€22 biannual) supports art-book-scale format; our venue unit is thinner/monthly and bundled per the channel economics.

## 8. How it lives in a venue

A browsable object on the table/counter that makes the space feel curated and gives guests something to _fall into_ for a few minutes. On-brand for design-forward cafés, co-working, boutique hotels. The provenance line quietly answers the only awkward question a guest or owner might raise.

---

## What this unlocks for the frontend

The venue-facing pitch page can now be built around concrete pillars:

1. **Hero:** a stunning GREEN-zone "world" + "Monthly dispatches from worlds that don't exist."
2. **The experience:** what it feels like on a guest's table (the five regions, sample spreads).
3. **Why venues host it:** curated atmosphere, dwell, conversation, Instagrammable.
4. **The provenance answer:** "made by named, paid artists — not scraped."
5. **The offer + CTA:** simple recurring per-venue plan → "Host ELSEWHERE" / express interest.

Open founder inputs before/while building: final name choice, whether to surface pricing on the page or gate behind a conversation, and beachhead city for any localized proof (Vienna/MAK reference).
