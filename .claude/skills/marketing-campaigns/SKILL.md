---
name: marketing-campaigns
description: Use when working on social marketing for the PrintFeed or ELSEWHERE brands — drafting, scheduling, or publishing a post; reporting how a campaign or post performed; answering what is scheduled or what has already been tried; or picking an angle. Also use when the user mentions PrintFeed, ELSEWHERE, DigiArt, Cartographers, Zernio, Threads posting, or the collect extension in a marketing context.
---

# Marketing campaigns (PrintFeed / ELSEWHERE)

Durable context for driving the social campaigns. Scope is the two accounts on
Zernio profile `6a4765d0568c787a4ccd94c5`. See
[references/channels.md](references/channels.md) for IDs, exclusions, and baselines.

## 1. Orient before answering

**This skill contains no live state.** Nothing here tells you what is scheduled
or what happened this week — those change daily and any value written down would
be wrong. Before making a claim about campaign state, call:

- `posts_list` — what exists, by status (`draft` / `scheduled` / `published` / `failed`)
- `posts_list_failed` — what needs recreating (note: retry is broken, see channels.md)

Never answer "what's scheduled" or "did it go out" from
[references/campaign-log.md](references/campaign-log.md). The log is history, not state.

## 2. The brands

| Brand | Status | Audience | URL |
| --- | --- | --- | --- |
| DigiArt | Retired (2026-04-25 → 07-07) | creators + collectors, mixed | `digiart.btechhub.top` |
| ELSEWHERE | Active | artists ("Cartographers") + venues | `elsewhere.btechhub.top` |
| PrintFeed | Active | collectors (collect funnel) | `printfeed.btechhub.top` |

DigiArt is retired but its angle history still counts — same product, same two
accounts, 11 of the 20 logged angles.

Where the source material lives (authoritative — read, don't duplicate):

- `apps/landing/marketing/elsewhere-social-drafts.md` — ELSEWHERE copy, both scheduled rounds
- `docs/research/elsewhere-artist-program.md` — artist program terms, consent + recruiting funnel
- `docs/research/elsewhere-outreach-kit.md` — venue outreach kit
- `docs/research/b2b-venue-icp.md` — venue ICP
- `docs/collect-funnel.md` + `extensions/threads-collector/` — what PrintFeed copy demos

## 3. Creating a post

Every item below comes from something that actually went wrong.

- [ ] **Pass `account_id` explicitly.** Both platforms have multiple accounts in
      the workspace; an omitted ID errors with a candidate list. IDs in
      [references/channels.md](references/channels.md).
- [ ] **Verify the copy is non-empty before publishing.** Four posts shipped
      blank, most recently 2026-07-28. Read back what you are about to send.
- [ ] **Images must be `.jpg`.** Meta cannot fetch `.webp`. Confirm the URL
      returns `200 image/jpeg`.
- [ ] **Media cannot be attached via MCP** — upload is browser-only. Either
      attach it in the Zernio web UI or publish text-only knowingly.
- [ ] **Do not write "link in bio"** unless the bio link is actually set on that
      account. It has been used as a CTA while resolving nowhere.
- [ ] **Check the angle isn't a repeat** against the angle index in
      [references/campaign-log.md](references/campaign-log.md). Two DigiArt
      angles were re-posted verbatim within a month.
- [ ] **If the copy claims product behavior**, verify it against
      `extensions/threads-collector/src/content.js` and `docs/collect-funnel.md`.
      See [the tool-led angle](references/campaign-log.md#extension-collect-demo--the-tool-led-angle).

## 4. Reporting results

1. **Always scope by profile:** pass `profile_id: 6a4765d0568c787a4ccd94c5` to
   `analytics_get_analytics`. Unfiltered, it returns two unrelated accounts whose
   numbers are 10–30× larger and will silently inflate any summary.
2. **Expect the response to exceed the tool token limit** on any realistic date
   range. It gets saved to a file instead. Parse it with Python — note the payload
   is a Python-repr string, so `ast.literal_eval` works where `json.loads` fails:

   ```python
   import json, ast
   d = json.load(open(PATH))
   o = ast.literal_eval(d["result"])   # {'overview': {...}, 'posts': [...]}
   ```

3. **Judge numbers against the baseline bands**, not against zero — see
   [references/channels.md](references/channels.md). Threads 5–33 impressions is
   normal; Facebook 0–2 reach is normal. Neither is a signal on its own.
4. **Report follower deltas from `accounts_get_follower_stats`**, not from any
   number written in these files.

## 5. After a campaign ships

Append a row to the relevant era table in
[references/campaign-log.md](references/campaign-log.md): date, angle slug,
channel, format, copy hook, and `imp/lk/cm` once metrics settle. Reuse an
existing slug if the angle is a repeat; add a new one only for a genuinely new
angle, and update the angle index.

Findings live in
[Observations](references/campaign-log.md#observations-2026-07-30). That section
records what the data shows and deliberately does not prescribe strategy — if
asked what to do next, reason from the evidence and say it is your read, not
established policy.
