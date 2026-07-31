# Zora mechanics — verified facts

**Verified 2026-07-31 against Zora's own documentation.** Re-verify before
republishing: this protocol has already changed its fee structure at least once
(pre-2.2.0 coins used a 3% fee), so anything written here has a shelf life.

Sources, in order of authority:

1. <https://docs.zora.co/coins/contracts/rewards> — contract-level reward split
2. <https://docs.zora.co/coins> — protocol overview
3. <https://support.zora.co/en/articles/6316801> — Creator Coins help article
4. <https://support.zora.co/en/articles/2509953> — rewards help article

## The numbers

| Fact | Value | Source |
| --- | --- | --- |
| Total trading fee, Creator + Content coins | **1% of trade value** | 1, 4 |
| Creator's share of that fee | **50% of the fee = 0.5% of trade value** | 1 |
| Platform referral | 20% of fee (0.2% of trade) | 1 |
| LP rewards / permanent pool depth | 20% of fee (0.2% of trade) | 1 |
| Protocol | 5% of fee (0.05% of trade) | 1 |
| Trade referral | 4% of fee (0.04% of trade) | 1 |
| Doppler | 1% of fee (0.01% of trade) | 1 |
| Trend coins | 0.01% fee, **100% to protocol**, no creator reward | 1 |
| Coin supply (all coins) | 1,000,000,000 fixed | 2, 3 |
| Content coin allocation | 990M to the liquidity pool, **10M to the creator at launch** | 2 |
| Creator Coin allocation | 50% open market / **50% creator, vested linearly over 5 years** | 3 |
| Market venue | dedicated Uniswap V4 pool with a custom hook | 2 |
| Sniper tax | 99%, declining over the first 10 seconds | 2 |
| Content coin backing currency | the creator's own Creator Coin (not ETH) | 2 |
| Reward payout currency | **$ZORA**, via multi-hop swaps | 2, 3 |
| Claim mechanism | `claimVesting()` | 2 |

## The allocation is the main event, not the fees

Added 2026-07-31 after the fee-first draft was challenged and found wanting.

A creator's return has **two components**, and the fee stream is the smaller one:

| | Content coin (a post) | Creator Coin (a profile) |
| --- | --- | --- |
| Creator allocation | 10M of 1B (**1%**) at launch | 500M of 1B (**50%**) |
| Vesting | at launch | **linear over 5 years** ≈ 273,973 coins/day |
| Source | 2 | 3, plus <https://support.zora.co/en/articles/6338497> |

Framing Zora purely as "0.5% of turnover" **understates the model** and gets the
creator's incentives wrong. The allocation makes the creator *long their own
coin*: upside comes from the price of the stake they hold, not mainly from the
toll on other people's trades.

Note the two mechanisms point in **opposite directions** — fees reward churn,
the allocation rewards buy-and-hold. That tension is real and worth writing about.

## The creator cannot set the price

Verified against <https://docs.zora.co/coins/contracts/creating-a-coin> and
<https://docs.zora.co/coins/contracts/architecture>.

990M coins are deployed into a Uniswap V4 pool at launch. The curve shape comes
from the `poolConfig` parameter and Doppler multi-curve positions — Zora's
tooling, not the creator. There is **no creator-set opening price**; price is
discovered from the first trade.

The fair analogy is an exchange listing with **no book-building and no set
opening share price**. Its limit: a share carries legal rights (dividend, vote,
residual claim); a coin carries none. Do not let the analogy imply otherwise.

## ⚠️ "Market cap" is not realisable, and is quoted inconsistently

Two separate traps:

1. **Depth ≠ supply.** A 500M holding cannot be sold into the pool at the quoted
   price; selling it is what moves the price. Paper value ≠ exit value.
2. **Which supply was it divided by?** At a $6M market cap, a daily vest of
   273,973 coins is worth **$1,644** against the full 1B supply, or **$3,288**
   against the 500M circulating. Secondary coverage generally uses circulating
   without saying so, which doubles the headline. Always ask.

Use these as **illustrative arithmetic only** — never quote a named creator's
live market cap, it dates within hours.

## ⚠️ Zora's own sources disagree

The help centre article (source 3) says: *"You earn 1% of every trade in $ZORA
across your Creator Coin and all your posts."*

The contract documentation (source 1) and the other help article (source 4) both
put the creator at **0.5% of trade value** — 50% of a 1% total fee.

**Use 0.5%.** The 1% figure is the *total fee*, of which the creator takes half;
source 3 appears to be a loose simplification. This discrepancy is worth naming
in the essay rather than hiding — it is a real, checkable illustration of how
hard these platforms are to compare.

## Things not to state as fact

- **"$1.6B volume, $10–15M paid to creators"** appears widely in secondary
  crypto press, attributed to Zora. Not found in primary docs. If used, attribute
  it to Zora's own marketing, do not present it as independent.
- **Token price.** Creator earnings are denominated in $ZORA. Do not quote a
  euro/dollar equivalent — it dates instantly and implies a stability that isn't
  there.
- **"Passive income."** Earnings require *trading volume on your coin*, which
  requires speculators. No trades, no earnings, regardless of how many people
  view the post.

## The disclaimer that matters

Zora's own documentation describes coins as *"ERC-20 representations of
user-created Zora posts and are for entertainment and social engagement purposes
only."*

That line is the honest centre of the comparison. Quote it.
