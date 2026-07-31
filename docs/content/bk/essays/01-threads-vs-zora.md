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

The important word there is *trade*, not *view*. This part of your income isn't
paid for attention, it's paid for **turnover**. A post that a hundred thousand
people love and nobody trades pays you nothing here. A post that four people
flip back and forth all afternoon pays you more.

But the fee stream is the smaller half of the story, and stopping there gets the
whole model wrong.

### You are also issued a stake in yourself

The larger mechanism is that you **hold coins**.

- On a **content coin** — a post — you receive **10 million of the 1 billion
  supply, 1%**, at launch.
- On your **Creator Coin** — your profile — you receive **500 million of 1
  billion, 50%**, vesting linearly over five years. That's roughly **273,973
  coins a day**, every day, for five years.

This is the part that scales. Fees pay you a slice of other people's trading;
the allocation makes you **long your own coin**. If the market decides your work
is worth more, the stake you already hold is worth more, and you didn't have to
sell anything for that to happen.

Which corrects the picture I gave a moment ago. You are not a toll booth
collecting 0.5% on strangers' speculation. You are a participant in it, holding
a position, with most of your upside in the price rather than the fees.

### You do not get to set the price

This is the sharpest difference from every other option on this list, and it's
easy to miss: **you cannot price your own work.**

There's no opening price you choose. At launch 990 million coins go into a
Uniswap V4 pool, the curve shape comes from Zora's own tooling rather than from
you, and the market discovers the price from the first trade onward. Your input
is the work. The number is somebody else's decision, permanently.

The closest analogy is a company listing on an exchange with **no book-building
and no set opening share price** — you're floated, and whatever the first buyers
pay is what you're worth that day. But the analogy flatters it. A share is a
legal claim on a company with rights attached: a dividend, a vote, a residual
claim on assets. A coin is none of those things. It's a stake in sentiment about
you, and nothing else. (Zora says as much itself — I'll come back to it.)

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

**"Market cap" is not money you can get.** This is the one I'd most want a
first-time creator to understand. Market cap is price × supply, and the price
comes from a pool with far less depth than the supply implies. Your 500 million
coins cannot be sold into that pool at the quoted price — selling that much
*is* the thing that collapses the price. Paper value and realisable value are
different numbers, and the gap is widest exactly when the coin looks most
successful.

The arithmetic is slipperier still. Take a coin at a $6 million market cap.
Divide by the full 1 billion supply and your daily vested 273,973 coins are
worth about **$1,644**. Divide by the 500 million actually circulating — which
is how these numbers are usually quoted — and the same day is worth about
**$3,288**. Same coin, same day, two answers, one of them double the other.
Before you believe any figure like this, ask which supply it divided by.

**Selling your own allocation is a public act.** Your holders can see it. A
creator steadily selling into their own pool reads to the people holding their
coin exactly the way founder share sales read to shareholders. So the stake is
not just illiquid in the mechanical sense — it's socially expensive to realise,
in a way a print royalty or an invoice simply isn't.

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

**Unflattering number: a stake you can't price, can't exit quickly and can't
fully realise — plus 0.5% of turnover.**

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

- On Threads, **your attention** is sold, to advertisers, by Meta. You are not
  party to the transaction and receive none of it.
- On Zora, **a stake in you** is sold, to speculators, by an automated pool, at
  a price you don't set — and you are holding some of that stake yourself.
- In print, **an object** is sold, to a person who wanted it, by you, at a price
  you do set.

That middle one is worth sitting with, because it's the genuinely novel thing
here and it's not what it first looks like. Zora doesn't sell your *work*. It
sells claims on your future desirability, and it hands you a block of those
claims so your interests point the same way as the buyers'. Whether that's
alignment or a conflict of interest depends entirely on where you're standing.

Each has a failure mode that follows directly. Threads fails you by never
paying. Print fails you on volume — physical objects sell in the dozens, not the
millions, and no amount of good design changes that.

Zora's failure mode is subtler, because its two payment mechanisms **pull in
opposite directions**. The fee stream rewards churn: it pays best when your coin
is flipped constantly. The allocation rewards the opposite: it pays best when
people buy and *hold*, pushing the price up. So the model simultaneously wants
your work traded and hoarded, and which one you get is not yours to choose. It
fails you completely when neither happens — when a piece is simply admired.

None of these is a scam and none of them is a solution. They're three different
answers to a question most platforms don't even ask out loud, which is whether
the person who made the thing has any economic relationship to it at all.

My own position, for whatever it's worth: the speculative model is a real answer,
and a more serious one than I gave it credit for before I read the contracts
properly. Handing creators a stake rather than only a commission is a genuine
idea, and "you can't set your own price" is a real cost that a lot of enthusiastic
coverage never mentions. What I'd rather build is the one where somebody pays for
a thing because they want to keep it, and where the artist names the number.
That's a preference, not an argument, and the volume ceiling on it is brutal.

What I'd actually suggest, if you're on Threads and wondering: don't migrate,
test. Mint a few posts and watch two things — whether anyone **trades** them, and
whether anyone **buys and holds**. Those are the two different ways this pays,
and likes predict neither. If both stay flat you have your answer in a fortnight,
and it cost you nothing but the posts you were making anyway.

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
