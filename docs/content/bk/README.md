# The b|k content funnel

Educational essays for visual creators about how their work actually pays, run
as a **third funnel** alongside B2C (collectors) and B2B (venues). Design agreed
2026-07-30 on [Trello card yPXPTe0q](https://trello.com/c/yPXPTe0q); this
directory is the working home for it.

## Why it exists

Every PrintFeed channel so far failed on **distribution, not messaging**. The two
campaign accounts have ~0 and ~13 followers, so organic broadcast reaches nobody
regardless of copy quality — adding images in round 2 changed nothing. LinkedIn
is the only account with a real audience and it's reserved for AI-agency content.

So this funnel deliberately picks channels whose distribution is **topical rather
than follower-based**: Reddit routes by subject, Substack by recommendation and
search. That is the entire strategic premise.

## Identity

**Byline: `b|k`.** An existing identity, not a fourth brand — it already renders
as "bo | ka" in the landing footer and links to bostjankamnik.com. Three renames
in three months carried zero audience across; this deliberately isn't a fourth.

**Publication name: `Visual Tech Dispatch`.** Decided 2026-07-31. "Visual Tech"
is the authority claim — the technical one in a room of visual creators —
and it's deliberately broader than one monetisation model, so the series can
cover tools and mechanics without renaming itself. Subtitle carries the money
angle: *How creative work actually pays.*

Two known costs, both accepted: in the wild "visual tech" usually means AV /
display hardware, which is a mild search-discoverability tax (it matters little
on Reddit, where distribution is by subreddit, not by name); and "Dispatch"
says nothing about money on its own, so **the subtitle is load-bearing** — don't
drop it from the Substack header or the Reddit profile.

**Disclosure:** PrintFeed affiliation stated in the bio and in-line in any essay
where PrintFeed appears. Non-negotiable — the whole funnel's value is credibility.

## Editorial spine

> Attention without ownership or payment is a broken deal.

Every piece answers two questions: **how does this actually pay a creator, and
what does it cost them?**

**The discipline: every channel gets its unflattering number, including ours.**
That is what makes the series worth reading rather than a content-marketing
exercise, and it is the reason PrintFeed can appear in a piece without it reading
as a pitch. In the anchor essay, PrintFeed's unflattering number is that the
70% share is of *margin*, is split pro-rata by plate count, and **isn't actually
being paid to anyone yet**.

## The funnel

It feeds the existing funnels at stages 4–5 rather than replacing them. Its own
job is stages 0–3.

| Stage | Where | Measured by |
| --- | --- | --- |
| 0 Reach | Reddit post | Reddit native stats (manual tally) |
| 1 Click to essay | Reddit → Substack | Substack referrer stats |
| 2 **Subscribe** | Substack | Substack subscribers — **primary conversion** |
| 3 Cross to product | essay → printfeed.btechhub.top | PostHog, via UTM |
| 4 Product capture | `/collect` or `/creators` | existing `waitlist_signup` → Resend |
| 5 Activate | app signup | existing B2C funnel |

**No new instrumentation.** PostHog auto-captures UTM parameters, so stage 3+ is
a dashboard filtered on `utm_source=bk`, not new event code.

**UTM convention — non-negotiable, or the join is unmeasurable:**

```
?utm_source=bk&utm_medium=<reddit|substack>&utm_campaign=<essay-slug>
```

Ready-made for the anchor piece:

```
https://printfeed.btechhub.top/collect?utm_source=bk&utm_medium=substack&utm_campaign=threads-vs-zora
https://printfeed.btechhub.top/collect?utm_source=bk&utm_medium=reddit&utm_campaign=threads-vs-zora
```

**Measurement caveat:** stages 0–2 sit outside our analytics entirely. Do not
build one dashboard spanning all six — manual weekly tally for 0–2, PostHog for
3+.

### The dashboard (built, empty until the first essay ships)

[**b|k content funnel — stage 3+**](https://eu.posthog.com/project/173494/dashboard/864154)
in PostHog project `173494` (Printfeed). Three tiles:

| Tile | What it shows |
| --- | --- |
| [referred visitors by medium](https://eu.posthog.com/project/173494/insights/H0Upd29j) | daily uniques with `utm_source=bk`, split reddit vs substack |
| [referred visitors by essay](https://eu.posthog.com/project/173494/insights/fXBtyH9w) | same traffic, split by `utm_campaign` — which essay actually crosses over |
| [waitlist signups from essay traffic](https://eu.posthog.com/project/173494/insights/C6Ib3xwN) | stage 4: `waitlist_signup` by people whose **first touch** was `utm_source=bk`, split by audience |

Two things worth knowing about how it's wired:

- Stage 4 filters on the **person** property `$initial_utm_source`, not the
  event property. UTM parameters only land on the pageview that carried them in
  the URL; a signup two clicks later would fall out of a naive event filter.
  First-touch attribution survives the session.
- `waitlist_signup` **exists in code and has never fired in production.**
  `WaitlistForm` captures it with an `audience` prop on `/collect`, `/creators`
  and `/collectors`, but PostHog has no record of it yet — consistent with zero
  `/api/waitlist` POSTs in the last 7 days. An empty stage-4 tile means no
  traffic, not broken instrumentation.

## Success measure

Substack subscribers (stage 2) and Reddit reach (stage 0).

**Do not judge these against the Threads baselines** in
`.claude/skills/marketing-campaigns/references/channels.md` — those describe a
follower-graph channel and would flatter these numbers meaninglessly. First real
signal: does one Reddit post beat the 232-impression `#artdaily` ceiling?

## Content ladder

Researched in `docs/research/market-competitor-analysis.md`. Each piece leads
with its real number.

1. **Threads vs Zora** — the anchor. Drafted: `essays/01-threads-vs-zora.md`
2. Commissions — 0% direct vs 20% + fees on Fiverr
3. Licensing / stock — artist keeps 33–35%; AI cut stock sales ~12% in 2023
4. Print-on-demand — modest per-unit, needs an existing audience
5. Marketplaces — Etsy 6.5% + $0.20 vs Saatchi 35–50%
6. Subscriptions / fan funding — 5–12% + fees
7. Crowdfunding — 5% + 3–5%, all-or-nothing
8. NFT / crypto art broadly — 2.5% + royalty, volume fell >70% after 2022
9. Streaming — YouTube takes 45% of ad revenue
10. PrintFeed as the paper answer — earned across the series, not asserted

## It reinforces the recruiting funnel

The essay's readers, the tagged submission call scheduled 2026-08-06, and the
outbound artist DMs all target the same Threads artists on the Airtable prospect
list (base `app1QOtINLEvz5kxP`). The essay warms the same people the DMs approach.

## Constraints

- **LinkedIn is off-limits** — reserved for AI-agency content.
- **Nothing on the PrintFeed Threads handle** — that stays product-focused.
- **Verify facts before every publish.** Protocol mechanics age fast; Zora has
  already changed its fee structure once. See `research/zora-mechanics.md`.
- **Verify subreddit rules before every post.** See `reddit-targets.md`.

## Layout

```
docs/content/bk/
├── README.md                     # this file — the operating doc
├── reddit-targets.md             # candidate subs + rule verification (BLOCKED)
├── essays/
│   └── 01-threads-vs-zora.md     # the anchor, drafted
└── research/
    └── zora-mechanics.md         # verified facts + sources, dated
```
