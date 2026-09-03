# Paid Acquisition Assessment — Should PrintFeed Run Meta Ads?

**Status:** research / decision input
**Date:** 2026-09-03
**Question:** Is it true that most e-commerce and digital-service customers arrive
through paid ads, and if so, should this project be running Meta ads?

**Short answer:** The hypothesis is half true — paid is the largest *purchasable*
channel but not the majority channel — and it is the wrong lever for this project
right now. Two hard blockers (no live purchase event, €2.34 B2C contribution
margin) make a Meta acquisition campaign structurally unable to pay for itself.
There is a narrow, cheap, legitimate use of paid: as a **demand test**, not as an
acquisition channel. Budget €200–300, expect information, not customers.

---

## 1. Is the hypothesis true?

Partly. The channel-mix data for e-commerce clusters around:

| Channel | Share of e-commerce site traffic |
| --- | --- |
| Organic search | ~23–32% |
| Paid search | ~19% |
| Social (total) | ~14% |
| — of which paid social | ~4–6.5% |
| Direct / email / referral | the remainder, and it is large |

So paid search + paid social is roughly **a quarter of traffic**, not a majority.
Direct and organic together are consistently bigger. Two caveats worth stating
plainly:

- **The data is muddy.** No vendor publishes a clean traffic-source-by-vertical
  benchmark; Similarweb mixes marketplaces with DTC, Shopify doesn't publish
  channel mix, and at least one analyst asserts most "paid share by vertical"
  charts in circulation are extrapolated or fabricated. Treat every number above
  as a band, not a figure.
- **The causality is backwards from how it feels.** Paid dominates *at scale*
  because it is the only channel you can buy more of on demand. It is not how
  most companies got their first hundred customers. The correct reading of the
  hypothesis is: "if you want to scale a proven funnel predictably, you will end
  up buying traffic" — not "customers come from ads."

The universal finding in the founder literature is the same: **ads amplify
product-market fit, they don't create it.** The common failure mode is spending
$30–50k before retention exists, seeing nothing stick, and concluding paid
doesn't work — when what the ads did was reveal, expensively and quickly, that
the product wasn't ready.

## 2. Costs are rising, which raises the bar

- Meta CPMs hit all-time highs (~$22.98 US in Q4); blended e-commerce CPM ~$16.80.
- CPCs up ~11% YoY; Google Shopping CPCs +33.7% in 2025.
- E-commerce CAC up 40–60% from 2023 to 2025.
- Median Meta CPA ~$38; e-commerce average ~$30.

Geography helps a lot here: Slovenia's CPM is roughly **$3.81** and Croatia's
**$5.07**, versus ~$23 in the US — an 80%+ discount. Any test should run in
CEE, not globally.

## 3. Blocker one — there is no purchase event to optimize

`docs/collect-funnel.md` is explicit: the collect → print → get-paid loop is a
**demo/pitch surface**. The Stripe charge, the Peecho order and the PayPal payout
are deliberately deferred. Conversion today is a magic-link signup, not money.

Meta's conversion optimization works by learning from purchase events. With no
purchase event you can only optimize toward a proxy (lead / signup), which
optimizes for people willing to type an email — a population that overlaps
weakly with people willing to pay €25 for a printed magazine. Every euro spent
before the money path is live buys a signal you cannot act on.

## 4. Blocker two — the learning-phase arithmetic

Meta needs ~50 conversion events per ad set per **week** to exit the learning
phase. Minimum daily budget = (target CPA × 50) ÷ 7.

At an optimistic €20 CPA that is **€143/day, ~€1,000/week, per ad set.** At a
realistic €40 CPA it is €286/day. Below that the ad set sits permanently in
"Learning Limited," where results are statistically noise — which means a €10/day
test doesn't produce a small version of the answer, it produces no answer.

This is the point most often missed: a small ad budget on Meta is not a
proportionally small experiment. It is a different, much worse experiment.

## 5. Blocker three — B2C unit economics

From `docs/research/b2b-venue-channel.md`, the current B2C position:

- Contribution margin per booklet: **€2.34**
- Shipping per single home destination: **€7+**

Break-even ROAS = 1 ÷ contribution margin. Standard guidance is that AOV under
~$50 needs either a very high repeat rate or razor-thin CPA targets, and gross
margin under 25% generally rules out profitable Meta scaling without strong LTV.

Rough funnel math at *favourable* Slovenian prices — CPM €3.50, CTR 1%, cold
landing-page conversion 1%:

```
€3.50 / 1000 impressions → 10 clicks → 0.1 purchases
cost per purchase ≈ €35
contribution margin per purchase = €2.34
```

Even at a generous 2% conversion and a €0.30 CPC, cost per purchase lands near
€15. **The gap to €2.34 is roughly 6–20×.** A customer would need to buy six to
twenty booklets before the acquisition cost was repaid. There is no creative
optimization that closes a 20× hole; only pricing, margin, or repeat rate can.

## 6. Where the diagnosis in `docs/content/bk/README.md` is right, and where it is incomplete

Right: every channel so far failed on **distribution**. 48 posts, accounts at 0
and 13 followers, one recorded click, zero attributed follows. Organic broadcast
to nobody stays nobody regardless of copy quality — round 2's images changed
nothing.

Incomplete: distribution failure and demand failure look identical from here.
Nobody has yet demonstrated that a stranger will pay for a printed collection of
Threads art. The corpus contains no evidence either way, because it never reached
enough people to test the question. That is precisely the gap paid traffic *can*
fill — as an instrument, not a channel.

## 7. Recommendation

**Do not open a Meta acquisition campaign.** Do the following instead, in order.

### A. Spend €200–300 on paid as a demand test (worth doing)

Not to acquire customers — to buy an answer to "does anyone want this?" in two
weeks instead of two years.

- Geography: Slovenia + Croatia + one CEE neighbour (CPM €3–5).
- Objective: traffic or leads, **not** purchases. Accept Learning Limited; you
  are not asking Meta to optimize, you are buying impressions at a known price.
- Destination: a single landing page with one honest ask — pre-order at a real
  price, or a waitlist with a deposit. A free email signup will not answer the
  question.
- Creative: the `extension-collect-demo` video. It is the only angle in the
  20-angle corpus that demos a working tool rather than describing a plan, and
  it produced July's best number (33 impressions).
- Success criterion, set before spending: **≥1% of landing-page visitors put down
  money or a deposit.** Below 0.3%, the demand hypothesis is in trouble and no
  amount of budget fixes it.
- Prerequisites: the money path live, or at minimum a real pre-order form; and
  UTM plumbing into PostHog, which the `bk` funnel already found missing.

### B. Put the real weight on the venue channel

The economics are 8–25× better and the machinery already exists:

| | B2C collector | B2B venue |
| --- | --- | --- |
| Margin per unit | €2.34 / booklet | €18–60 / account / month |
| 12-month contribution | ~€2–10 | €216–720 |
| Viable CAC | ~€2 | €50–150 |
| Targetable on Meta? | Poorly | No — audience too small |

A €50–150 CAC is a *sales* number, not an ads number. `apps/lead-scraper` plus
the Telegram lead-triage work already shipped is an outbound machine pointed at
exactly this. The cheapest validation in the doc — one physical sample issue,
walk into ten specialty cafés, ask for money — costs less than one week of ad
spend and answers a harder question.

### C. Unblock the two channels already designed and stalled

- **`bk` / Substack:** the live essay has no PrintFeed link at all, so stage 3 is
  unmeasurable, and nothing has been distributed to Reddit because subreddit
  rules are unverified. Both are hours of work, not strategy.
- **Tagged artist outreach:** the only two posts in 48 that drew replies both
  tagged artists by name (2026-05-22: 73 imp / 2 comments; 2026-07-06: 20 imp /
  3 likes / 2 comments). That is the single strongest signal in the corpus and it
  is a manual, unpaid, unscaled motion. Do it a hundred times before buying
  impressions.

### D. Consider Pinterest before Meta for B2C

Pinterest is a visual search engine — topical distribution, not follower-based,
the same premise the `bk` funnel was built on. Ads run ~$2–5 CPM and organic pins
keep working for months. For art prints it is a structurally better fit than a
Facebook page with zero followers.

## 8. What would change this answer

Revisit paid acquisition when **all three** hold:

1. Live payments — a real Stripe charge fires a real purchase event.
2. Contribution margin per order above ~€15, via price, bundle size, or
   shipping amortization.
3. Evidence of repeat purchase or retention from at least a handful of
   non-friend customers.

Until then, ads are a way to find out faster that the funnel isn't finished.

---

## Sources

- Ecommerce traffic-source shares: [Eightx organic share by vertical](https://eightx.co/blog/average-ecommerce-organic-traffic-share-by-vertical-2026), [Eightx paid share by vertical](https://eightx.co/blog/average-ecommerce-paid-traffic-share-by-vertical-2026), [SEO Sherpa ecommerce SEO statistics](https://seosherpa.com/ecommerce-seo-statistics/), [Opensend organic traffic share](https://www.opensend.com/post/organic-traffic-ecommerce)
- Meta cost benchmarks: [ContentStudio Meta Ads benchmarks](https://contentstudio.io/blog/meta-ads-benchmarks), [Triple Whale Facebook ad benchmarks](https://www.triplewhale.com/blog/facebook-ads-benchmarks), [Ryze Meta ads cost benchmarks](https://www.get-ryze.ai/blog/meta-ads-cost-benchmarks-by-industry-2026)
- CPM by country: [AdAmigo CPM/CPC by country](https://www.adamigo.ai/blog/meta-ads-cpm-cpc-benchmarks-by-country-2026), [Adligator CPM by country](https://adligator.com/blog/meta-ads-cpm-by-country-benchmarks), [Lebesgue Facebook CPM by country](https://lebesgue.io/facebook-ads/facebook-cpm-by-country)
- Learning phase and minimum budget: [Pigeon Digital 50-conversions rule](https://www.pigeondigital.com/insight/facebook-ads-learning-phase-50-conversions-rule-2026), [Stackmatix minimum budget requirements](https://www.stackmatix.com/blog/facebook-ads-minimum-budget-requirements), [ROASPIG minimum viable test budget](https://roaspig.com/blog/minimum-viable-budget-testing-facebook-ads/)
- CAC / LTV and low-AOV thresholds: [Talk Shop DTC CAC benchmarks](https://www.letstalkshop.com/blog/dtc-customer-acquisition-cost-benchmarks), [Retainful CAC guide](https://www.retainful.com/blog/customer-acquisition-cost-ecommerce), [DTC Systems unit economics](https://dtcsystems.ai/blog/dtc-unit-economics), [Lucid Media Meta unit economics calculator](https://www.lucidmedia.co.nz/tools/meta-ads-unit-economics-calculator/)
- Ads before PMF: [molfar.io why paid ads too early kill startups](https://www.molfar.io/blog/paid-ads-kill-startups), [Prose on growth before paid](https://www.prosemedia.com/blog/why-early-stage-startups-need-a-growth-marketer-before-they-even-think-about-paid-ads)
- Art-print channels: [Gelato Pinterest for artists](https://www.gelato.com/blog/pinterest-for-artists), [Artvertise Meta ads for art prints](https://www.artvertise.co/), [FinerWorks poll on advertising art](https://support.finerworks.com/news/poll-results-best-way-to-advertise-art/)

*Internal sources: `docs/collect-funnel.md`, `docs/research/b2b-venue-channel.md`,
`docs/content/bk/README.md`, `.claude/skills/marketing-campaigns/references/campaign-log.md`,
`apps/mvp/lib/collect/pricing.ts`.*
