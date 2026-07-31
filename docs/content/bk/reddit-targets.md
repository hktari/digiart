# Reddit targets — candidate subs and rule verification

**Status: BLOCKED on manual verification. Do not post until the table below has
real ticks in it.**

Reddit blocks this environment at the network layer — `WebFetch`, `curl`, and a
headless browser all return 403 / "blocked by network security" on every
`about/rules` endpoint. Subreddit rules therefore **cannot be verified by an
agent from here**. They have to be read by a logged-in human, which takes about
ten minutes for the whole list.

This is not a formality. Self-promotion is the single most heavily policed
behaviour on Reddit, several large art subs ban AI work outright, and a
crypto-adjacent essay trips a second set of rules on top. Getting this wrong
costs the account, not just the post.

## Verification protocol

For each sub, open `reddit.com/r/<sub>/about/rules` while logged in and record:

1. **AI stance** — is AI-generated work banned? Does that extend to *discussing*
   AI, or only to posting AI images? (This essay posts no images, but many subs'
   AI rules are written broadly.)
2. **Crypto/NFT stance** — several art subs ban NFT content by name.
3. **Self-promo rule** — the usual forms: outright ban, a ratio (e.g. 1 in 10
   posts), a weekly megathread, or "links in profile, not in posts."
4. **Blog/newsletter rule** — some subs allow discussion but ban linking to a
   Substack specifically.
5. **Post-karma / account-age gate** — many subs silently autoremove new accounts.

## Candidates

**Track A — economics / business of art.** Framing: rates, margins, who takes
what. Lead with the comparison, not the crypto.

| Sub | Why | AI | Crypto | Self-promo | Verified |
| --- | --- | --- | --- | --- | --- |
| r/ArtBusiness | closest topical fit — pricing and getting paid | ? | ? | ? | ☐ |
| r/ArtistLounge | large, general artist discussion | ? | ? | ? | ☐ |
| r/freelance | rate/fee comparisons land well | ? | ? | ? | ☐ |
| r/Illustration | practitioner audience | ? | ? | ? | ☐ |

**Track B — AI-native / web3 mechanics.** Framing: protocol mechanics and the
0.5%-of-turnover point. This audience will fact-check the Zora numbers, which is
a feature.

| Sub | Why | AI | Crypto | Self-promo | Verified |
| --- | --- | --- | --- | --- | --- |
| r/CryptoArt | on-topic by definition | ? | ? | ? | ☐ |
| r/NFT | will engage with the fee split | ? | ? | ? | ☐ |
| r/aiArt | overlaps the prospect list | ? | ? | ? | ☐ |
| r/StableDiffusion | large, technical, monetisation comes up often | ? | ? | ? | ☐ |

## Known exclusion

**r/Art — do not post.** Its rule reads: *"No 'AI' art, ever, and absolutely
nothing 'NFT,' or anything similar."* That excludes this essay on both counts.
Confirmed via search 2026-07-31; it is the only rule verified so far, and it is a
prohibition.

## Posting approach, once rules are verified

The card's decision was **contribute first, link in profile rather than in the
post**. Concretely:

- Comment usefully in the target sub for a while before posting anything of your
  own. A first-post-is-a-link account reads as spam to both humans and automods.
- Prefer posting the **argument in the post body** — the comparison table works
  as a self-contained Reddit text post — with the Substack in your profile. A
  text post that doesn't need the click is also the version that survives a
  self-promo rule.
- If a link is allowed, it carries
  `?utm_source=bk&utm_medium=reddit&utm_campaign=threads-vs-zora`.
- **Same facts in both tracks.** The framing changes per room; the numbers never
  do. People follow you across subs and a contradiction ends the whole thing.

## Measurement

Stage 0 (reach) and stage 1 (click) are Reddit-native and outside our analytics.
Tally them manually per post: upvotes, comments, and the post's own view counter.
See `docs/content/bk/README.md` for the full funnel.
