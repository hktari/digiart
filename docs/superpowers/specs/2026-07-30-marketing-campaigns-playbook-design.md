# Marketing Campaigns Playbook — Design Spec

**Date:** 2026-07-30
**Goal:** Give Claude Code durable, auto-loading context to drive the social marketing campaigns — know what's running, report results accurately, and draft posts without repeating angles or re-hitting known platform failures.

## Problem

Campaign knowledge is scattered across five locations and none of it reaches an agent session automatically:

| Where | What it holds | Reaches a session? |
| --- | --- | --- |
| `apps/landing/marketing/elsewhere-social-drafts.md` | ELSEWHERE copy + both round schedules | Only if pointed at |
| `docs/research/elsewhere-{artist-program,outreach-kit}.md` | Artist program terms, venue kit | Only if pointed at |
| `apps/social-media-generator/output/guidelines-{creator,collector}.md` | 7-line tone rules for the LangGraph writing node | Feeds the Python agent only |
| `apps/social-media-generator/output/scheduled/2026-W27/lineup.md` | One week's Threads lineup | Only if pointed at |
| `var/skills/{social-content,social-media-strategist}` | Generic community strategist advice | **Never** — `var/skills/` is an unloaded stash |

Result: every session re-derives campaign history from Zernio, and there is no record of which of the 17 angles already ran or how they did.

## Non-goals

- Prescribing strategy. The log presents evidence; the user decides the next motion. A separate brainstorm covers "what should we actually do next."
- Modifying `apps/social-media-generator/output/guidelines-*.md`.
- Consolidating or moving the five scattered doc locations. The skill links to them; they stay authoritative in place.
- Touching `var/skills/`.

## Structure

```
.claude/skills/marketing-campaigns/
├── SKILL.md                    # triggers, orientation, positioning, workflows
└── references/
    ├── campaign-log.md         # append-only history: 3 eras, 17 angles, results
    └── channels.md             # account IDs, baselines, platform gotchas
```

`.claude/skills/` is committable — only `.claude/settings.local.json` is ignored, via the user's global gitignore. The directory does not exist yet and will be created.

### Why a skill rather than a doc

A project skill at `.claude/skills/<name>/SKILL.md` is auto-discovered by Claude Code and triggers on description match. A doc under `docs/` requires either a `CLAUDE.md` pointer — costing tokens in every session, including the majority that are not marketing — or an explicit prompt to read it, which is the status quo that failed.

### The staleness rule

The skill holds **no live state**. Rules, IDs, positioning, and history are durable; what is scheduled, what failed, and how last week performed are not. The skill instructs the agent to query Zernio for anything current. Historical metrics appear only in `campaign-log.md`, always date-stamped as a snapshot. This is what prevents the file from decaying into confidently-wrong numbers.

## `SKILL.md`

**Frontmatter.** `name: marketing-campaigns`. Description triggers on: writing or scheduling a social post, campaign status, "how did X do", "what have we tried", and the brand names ELSEWHERE, PrintFeed, DigiArt.

**Part 1 — Orient before answering.** Call `posts_list` and `posts_list_failed` before making any claim about campaign state. Never answer "what's scheduled" from the log.

**Part 2 — The three brands.**

| Brand | Status | Audience | URL |
| --- | --- | --- | --- |
| DigiArt | Retired (Apr 25 – Jul 7) | creators + collectors, mixed | digiart.btechhub.top |
| ELSEWHERE | Active | artists ("Cartographers") + venues | elsewhere.btechhub.top |
| PrintFeed | Active | collectors (collect funnel) | printfeed.btechhub.top |

Each entry links to where its copy and program terms live rather than duplicating them.

**Part 3 — Creating a post.** Pre-publish checklist, every item derived from an observed failure:

- Pass `account_id` explicitly; never let Zernio pick when the platform has more than one account.
- Images must be `.jpg` — Meta cannot fetch `.webp`.
- Media upload is browser-only; MCP cannot attach media.
- **Verify copy is non-empty.** Four posts shipped blank (2026-05-21, 07-06 FB, 07-20 15:37, 07-28 FB).
- Do not write "link in bio" unless the bio link is actually set.
- Check `campaign-log.md` for whether the angle is a repeat.

**Part 4 — Reporting results.** Account and profile IDs (see `channels.md`), plus the practical note that `analytics_get_analytics` exceeds the tool token limit on any realistic range — dump to a file and parse with Python. Includes baseline bands so a number can be judged normal or not.

## `references/channels.md`

Accounts as of 2026-07-30:

| Platform | Username | Account ID | Profile ID | Followers |
| --- | --- | --- | --- | --- |
| facebook | PrintFeed | `6a4673619d9472faae553503` | `6a4765d0568c787a4ccd94c5` | 0 |
| threads | `_bk_art29` | `6a4411809d9472faae33a942` | `6a4765d0568c787a4ccd94c5` | 13 |
| facebook | T.I.KA Design | `6a4765939d9472faae61b024` | `6a476559a2a2daf6b4cff808` | 352 |
| linkedin | Bostjan Kamnik | `6a32960e5f7d1751abef1c46` | `6a47661a4f6abe599a332c2d` | 206 |

T.I.KA Design is a separate business (Slovenian wooden goods) sharing the Zernio workspace — its posts must never be conflated with PrintFeed campaign results.

**Baseline bands (2026-07-30 snapshot):** Threads 5–33 impressions/post; Facebook PrintFeed 0–7 impressions, 0–2 reach; clicks ~0 across the corpus.

**Known platform gotchas:** `posts_retry` and `posts_retry_all_failed` do not work (a `Status10.FAILED` mismatch) — recreate the post instead.

## `references/campaign-log.md`

One table per era with: date, angle slug, channel, format, copy hook, and impressions/likes/comments. Source data is the 48 published posts on profile `6a4765d0568c787a4ccd94c5`, 2026-04-25 → 2026-07-28.

The 17 angles to record:

- **Creator-side (DigiArt):** platform-explainer, visual-prototype, monetization-channel, ephemerality, earnings-calculator, recurring-revenue, fan-support, co-creation, algorithm-gatekeeping, twenty-true-collectors
- **Collector-side:** ownership-shelf, product-demo
- **ELSEWHERE:** wonder-cafe, provenance-antiscrape, direct-recruit, craft-object, venue-b2b

Followed by a dated observations block, stated as findings rather than instructions:

- Top post of all 48 was `#artdaily` on an image (2026-04-25, 232 impressions) with no pitch. Nothing since has approached it.
- The only two posts that drew replies both tagged artists by name (2026-05-22, 73 impressions/2 comments; 2026-07-06, 20 impressions/3 likes/2 comments).
- Format (image/video/carousel/text) is uncorrelated with reach.
- Facebook PrintFeed reached 0–2 people on every post regardless of format or image.
- Adding images in round 2 did not change Threads performance versus text-only round 1.
- Three brand renames in three months; no audience carried across.

**Maintenance:** append a row when a campaign ships. That is the only ritual.

## Verification

This is a documentation change with no runtime surface, so there is nothing to unit test. Verification is:

1. The skill appears in the available-skills list in a fresh session.
2. Every account ID and profile ID in `channels.md` resolves via `accounts_list`.
3. Every relative path linked from `SKILL.md` exists.
4. No live-state claims (scheduled counts, "currently running") appear in any of the three files.
