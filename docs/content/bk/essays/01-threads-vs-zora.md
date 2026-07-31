---
slug: threads-vs-zora
title: "Three things that can happen to the same post"
subtitle: "One image. Threads, Zora, or print — with the actual percentages, including the ones that don't flatter me."
byline: b|k
status: draft — awaiting Zora re-verification + publication setup
facts_verified: 2026-07-31
sources: docs/content/bk/research/zora-mechanics.md
utm_campaign: threads-vs-zora
---

You make an image. You post it on Threads. From that moment there are, roughly,
three futures available to that specific file — and they pay very differently.

I want to walk through all three with real numbers, because almost everything
written about creator monetisation compares a platform's best case to another
platform's worst case. So: every option here gets its unflattering number,
including mine. I build one of the three. I'll say which, and I'll give you the
part of it that doesn't look good.

## Option one: it stays a post

This is the default and it's worth stating plainly, because it's the baseline
everything else is measured against.

Your post gets some number of impressions. It scrolls away. Meta sells the
attention it gathered. Your share of that is **zero**. There is no general
revenue share on Threads — no per-impression payment, no ad split. Meta has run
invite-only bonus programmes, but an invite-only bonus is not a rate; you can't
plan against a number you can't see and don't qualify for.

What you actually get is real, just not money: reach, followers, the occasional
commission enquiry in your DMs. For a lot of artists that's the whole business
model, and it works — but notice what happened. The post itself has no economic
existence. It's an advertisement for you, and you paid for the ad with the work.

**Unflattering number: 0%.**

## Option two: the post becomes a coin

This is Zora, and it's genuinely a different idea rather than a better version
of the same one.

On Zora, posting mints an ERC-20 token. Every post becomes a coin with a fixed
supply of one billion units. For a post ("content coin"), 990 million units go
straight into a liquidity pool and **10 million go to you** at launch. Your
profile also has a Creator Coin: one billion units, half to the open market,
**half to you, vesting linearly over five years**. Content coins are backed by
your Creator Coin rather than by ETH, so activity on your posts feeds back into
your profile-level coin.

The coin trades in a dedicated Uniswap V4 pool. Every trade pays a **1% fee**,
split like this:

| Recipient | Share of the fee | Share of the trade |
| --- | --- | --- |
| **You, the creator** | 50% | **0.5%** |
| Platform referral | 20% | 0.2% |
| Liquidity (permanent pool depth) | 20% | 0.2% |
| Protocol | 5% | 0.05% |
| Trade referral | 4% | 0.04% |
| Doppler | 1% | 0.01% |

So: **you earn 0.5% of the value of every trade in your coin**, paid in $ZORA,
for as long as people keep trading it.

Read that sentence again, because the important word is *trade*, not *view*. On
Zora you are not paid for attention. You are paid for **turnover**. A post that
a hundred thousand people love and nobody trades earns you nothing. A post that
four people flip back and forth all afternoon earns you more than that.

Now the parts that don't make the marketing page.

**Zora's own documentation contradicts itself on the headline number.** The help
centre says you earn "1% of every trade." The contract docs say the creator gets
50% of a 1% fee — 0.5%. The second is right; the first is the total fee, not your
share. I mention this not to dunk on Zora but because it's a fair warning about
this entire category: if the platform's own two pages disagree by a factor of
two, you should verify anything anyone tells you about your cut, including this
essay. My sources are linked at the bottom.

**Your earnings are denominated in a volatile token.** You earn $ZORA. What that
is worth in rent is not a fixed quantity, and no honest person can tell you what
it will be.

**The first ten seconds of your coin are a war zone.** The pool applies a 99%
sniper tax that decays over ten seconds, specifically because bots would
otherwise front-run every launch. That's a sensible mitigation, and it also tells
you exactly what kind of venue this is.

**And Zora says the quiet part in its own docs.** Coins, it states, are "for
entertainment and social engagement purposes only."

Which brings up the honest tension, and I don't think it can be argued away: this
model turns your work into a speculative asset. The thing that generates your
income is people betting on your work's price. That is precisely the property
many artists objected to in the NFT wave, and it hasn't gone anywhere — it's just
better engineered now. If you found that distasteful in 2021 on principle, the
principle hasn't changed. If your objection was that the tooling was clunky and
the fees were absurd, that part genuinely has changed.

**Unflattering number: 0.5% of turnover you don't control, in a token you can't
price.**

## Option three: the post becomes an object

This is the one I build, so read it with the appropriate suspicion.

The premise: someone reading Threads sees your image, and instead of liking it,
*collects* it — a browser extension pulls that specific image into a collection.
Enough collected pieces become a printed magazine. The artist of each piece gets
credited in the print and paid a share of what the copy sells for.

Mechanically, credit is per-plate: every page carries a caption reading
`Title — @handle`. Payment is a share of the **margin** — what the copy retails
for, minus what it costs to physically print — split 70/30 between artists and
the platform, and then divided among contributors in proportion to how many
plates each of them has in the issue.

Here are the numbers that don't flatter it.

**70% is of margin, not of revenue.** Printing is a real cost and it comes out
first. On a physical object, the printer is paid before anyone else is. A "70%
share" sounds enormous next to Zora's 0.5% and it is not comparable — one is a
share of a residual, the other a share of gross turnover.

**Your cut is pro-rata by plate count.** Two pages in a forty-page issue is 5% of
the artist pool, not 5% of anything larger.

**The cover only fits one name.** A single-artist issue is bylined properly. A
multi-artist issue currently reads "Selected Works" on the cover, and your name
appears at 7pt under your own plate. I'd rather tell you that than let you find
out holding the thing.

**And the biggest one: the money isn't live yet.** The collect-to-print loop
works end to end as a demonstration. Real charging, real print orders, real
payouts run through pipelines that exist but are not switched on for this funnel.
Anyone quoting you earnings from it today, myself included, is quoting a model
and not a receipt.

**Unflattering number: 70% of a residual, split by page count, currently paid to
nobody.**

## What actually separates them

Strip the branding off and the three options differ on one question: **what is
being sold?**

- On Threads, your attention is sold, to advertisers, by Meta.
- On Zora, *belief about* your work is sold, to speculators, by the market.
- In print, an object is sold, to a person who wanted it, by you.

Each one has a failure mode that follows directly from that. Threads fails you by
never paying. Zora fails you when nobody trades — and pays you best when your
work is churned rather than kept. Print fails you on volume: physical objects
sell in the dozens, not the millions, and no amount of good design changes that.

None of these is a scam and none of them is a solution. They're three different
answers to a question most platforms don't even ask out loud, which is whether
the person who made the thing has any economic relationship to it at all.

My own position, for whatever it's worth: I think the speculative model is a real
answer and I think it selects for the wrong work — it rewards the pieces that get
flipped, not the pieces that get kept. I'd rather build the one where somebody
pays for a thing because they want to keep it. That's a preference, not an
argument, and the volume ceiling on it is brutal.

What I'd actually suggest, if you're on Threads and wondering: don't migrate.
Test. Mint a few posts on Zora and watch whether *anyone trades them* — not
whether they get likes, whether they trade. That's the only number that pays. If
they don't trade, you have your answer in a fortnight and it cost you nothing.

---

**Disclosure:** I build PrintFeed, option three. I don't work for Zora or Meta
and hold no position in $ZORA.

**Sources:** Zora's [rewards contract
documentation](https://docs.zora.co/coins/contracts/rewards), [Coins protocol
overview](https://docs.zora.co/coins), and help centre articles on [Creator
Coins](https://support.zora.co/en/articles/6316801) and
[rewards](https://support.zora.co/en/articles/2509953). All figures verified
2026-07-31; this protocol has changed its fee structure before, so check them
against the current docs before relying on them.

*Next in this series: commissions — what 0% actually means when you invoice
directly, versus 20% plus fees on Fiverr.*

---

<!--
PUBLISH CHECKLIST — remove this block before publishing.

- [ ] Re-verify every Zora number against docs.zora.co (facts age fast)
- [ ] Confirm the Threads "no general revenue share" claim still holds
- [ ] Confirm option-three claims against docs/collect-funnel.md + payout-service.ts
- [ ] Subscribe CTA links to the Substack, not to printfeed
- [ ] Any printfeed link carries:
      ?utm_source=bk&utm_medium=substack&utm_campaign=threads-vs-zora
      (or utm_medium=reddit when linked from a Reddit comment)
- [ ] Reddit: verify the target sub's self-promo + AI + crypto rules first —
      see docs/content/bk/reddit-targets.md. r/Art bans both AI work and
      anything NFT-adjacent; this essay is not postable there.
-->
