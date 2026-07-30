# Marketing Campaigns Playbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a project skill at `.claude/skills/marketing-campaigns/` that gives Claude Code auto-loading context to report campaign results, draft posts, and avoid repeating any of the 20 angles already tried on the PrintFeed and ELSEWHERE brands.

**Architecture:** Three markdown files. `SKILL.md` holds triggers, brand positioning, and two workflows (create a post / report results). `references/channels.md` holds account IDs, exclusions, and baselines. `references/campaign-log.md` holds the 48-post history as three era tables plus a dated observations block. No live state in any file — the skill instructs the agent to query Zernio for anything current.

**Tech Stack:** Markdown only. No runtime code, no dependencies. Verification is grep- and `test`-based, plus one live `accounts_list` MCP call.

## Global Constraints

Every task's requirements implicitly include this section.

- **No live state in any file.** Never write scheduled counts, "currently running", or "next post is". Those come from `posts_list` / `posts_list_failed` at query time.
- **Date-stamp every metric.** Any number in any file carries `as of 2026-07-30` or the post's own date. Metrics are snapshots, never current truth.
- **Scope is PrintFeed + ELSEWHERE only** — Zernio profile `6a4765d0568c787a4ccd94c5`, accounts `6a4673619d9472faae553503` (facebook PrintFeed) and `6a4411809d9472faae33a942` (threads `_bk_art29`).
- **Excluded accounts** appear only as an exclusion list: `6a4765939d9472faae61b024` (T.I.KA Design, separate business) and `6a32960e5f7d1751abef1c46` (LinkedIn, personal founder voice).
- **Findings, not instructions.** The observations block states what the data shows. It must not prescribe strategy — that is a separate decision. No "you should", "stop doing", "focus on".
- **Do not modify** `apps/social-media-generator/output/guidelines-*.md`, anything under `var/skills/`, or any of the five existing doc locations. Link to them; never move or rewrite them.
- **Angle slugs are fixed.** Use exactly these 20, kebab-case, in both `campaign-log.md` and any future reference: `hashtag-only`, `platform-explainer`, `visual-prototype`, `monetization-channel`, `ephemerality`, `earnings-calculator`, `recurring-revenue`, `fan-support`, `co-creation`, `algorithm-gatekeeping`, `twenty-true-collectors`, `ownership-shelf`, `extension-collect-demo`, `wonder-cafe`, `provenance-antiscrape`, `direct-recruit`, `tagged-submission-call`, `program-terms`, `craft-object`, `venue-b2b`.
- **Commit trailer** on every commit: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- The pre-commit hook runs lint-staged over `*.md`. If it reformats a file, the reformatting is correct — amend and move on.

## File Structure

| File | Responsibility |
| --- | --- |
| `.claude/skills/marketing-campaigns/SKILL.md` | Frontmatter triggers, orientation rule, brand table, create-a-post checklist, report-results procedure |
| `.claude/skills/marketing-campaigns/references/channels.md` | Campaign account IDs, exclusion list, baseline bands, platform gotchas |
| `.claude/skills/marketing-campaigns/references/campaign-log.md` | 48-post history in three era tables, angle index, `extension-collect-demo` detail, dated observations |

Build order is `channels.md` → `campaign-log.md` → `SKILL.md`, because `SKILL.md` links to both references and its link-existence check should pass on first run.

---

### Task 1: `references/channels.md`

**Files:**
- Create: `.claude/skills/marketing-campaigns/references/channels.md`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: the file path `.claude/skills/marketing-campaigns/references/channels.md`, linked from `SKILL.md` in Task 4 as `references/channels.md`. Defines the canonical profile ID string `6a4765d0568c787a4ccd94c5` reused in Tasks 2 and 4.

- [ ] **Step 1: Write the failing check**

Create the check as a shell one-liner you will re-run after writing the file. Run it now:

```bash
test -f .claude/skills/marketing-campaigns/references/channels.md \
  && grep -q '6a4765d0568c787a4ccd94c5' .claude/skills/marketing-campaigns/references/channels.md \
  && grep -q 'Exclude from all campaign reporting' .claude/skills/marketing-campaigns/references/channels.md \
  && echo PASS || echo FAIL
```

- [ ] **Step 2: Confirm it fails**

Expected output: `FAIL` (the directory does not exist yet).

- [ ] **Step 3: Create the directory and write the file**

```bash
mkdir -p .claude/skills/marketing-campaigns/references
```

Write `.claude/skills/marketing-campaigns/references/channels.md` with exactly this content:

```markdown
# Channels

Accounts, IDs, and what "normal" looks like. All numbers are snapshots as of
2026-07-30 — re-query Zernio for anything current.

## Campaign accounts

Zernio profile: `6a4765d0568c787a4ccd94c5` (holds both accounts below).

| Platform | Username | Account ID | Followers (2026-07-30) |
| --- | --- | --- | --- |
| facebook | PrintFeed | `6a4673619d9472faae553503` | 0 |
| threads | `_bk_art29` | `6a4411809d9472faae33a942` | 13 |

Follower history, weekly, July 2026: PrintFeed `0 → 0`; `_bk_art29` `10 → 13`.

## Exclude from all campaign reporting

These share the Zernio workspace but are not PrintFeed/ELSEWHERE channels.

| Platform | Username | Account ID | Why excluded |
| --- | --- | --- | --- |
| facebook | T.I.KA Design | `6a4765939d9472faae61b024` | Separate business (Slovenian wooden goods) |
| linkedin | Bostjan Kamnik | `6a32960e5f7d1751abef1c46` | Personal founder-voice account |

**Always pass `profile_id: 6a4765d0568c787a4ccd94c5` when pulling analytics.**
An unfiltered call returns all four accounts. The excluded two are 10–30× larger
and dominate every ranking — the July 2026 top-20-by-engagement was almost
entirely T.I.KA Design product posts.

## Baseline bands (2026-07-30 snapshot)

Use these to judge whether a number is normal, not to set targets.

| Channel | Impressions/post | Reach | Clicks |
| --- | --- | --- | --- |
| threads `_bk_art29` | 5–33 | not reported by API (always 0) | ~0 |
| facebook PrintFeed | 0–7 | 0–2 | ~0 |

Across all 48 posts from 2026-04-25 to 2026-07-28 there was **one** recorded
click, on a 2026-07-18 Facebook post.

## Platform gotchas

- **`posts_retry` and `posts_retry_all_failed` do not work** — a `Status10.FAILED`
  status mismatch. Recreate the post instead.
- **Media upload is browser-only.** `media_generate_upload_link` cannot be driven
  from MCP; attach images or video in the Zernio web UI before publishing.
- **Meta cannot fetch `.webp`.** Any image referenced in a Facebook or Threads post
  needs a `.jpg` sibling. Verify it returns `200 image/jpeg` before scheduling.
- **Never omit `account_id`** on write calls. Both platforms here have more than
  one account in the workspace, and the silent first-match behavior was removed —
  an omitted ID returns an error listing candidates.
```

- [ ] **Step 4: Re-run the check**

```bash
test -f .claude/skills/marketing-campaigns/references/channels.md \
  && grep -q '6a4765d0568c787a4ccd94c5' .claude/skills/marketing-campaigns/references/channels.md \
  && grep -q 'Exclude from all campaign reporting' .claude/skills/marketing-campaigns/references/channels.md \
  && echo PASS || echo FAIL
```

Expected output: `PASS`.

- [ ] **Step 5: Verify no live-state language leaked in**

```bash
grep -niE 'currently (running|scheduled)|next post|is scheduled|posts? pending' \
  .claude/skills/marketing-campaigns/references/channels.md && echo "VIOLATION" || echo "CLEAN"
```

Expected output: `CLEAN`.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/marketing-campaigns/references/channels.md
git commit -m "$(cat <<'EOF'
Add campaign channel reference

Records the two PrintFeed/ELSEWHERE account IDs, the profile ID
that must scope every analytics call, and the baseline bands that
make a number readable as normal or not.

Names the two workspace accounts to exclude — a separate business
and a personal profile — because an unfiltered analytics call
returns all four and the outsiders dominate every ranking.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `references/campaign-log.md` — era tables

**Files:**
- Create: `.claude/skills/marketing-campaigns/references/campaign-log.md`

**Interfaces:**
- Consumes: the profile ID `6a4765d0568c787a4ccd94c5` established in Task 1.
- Produces: the file path `.claude/skills/marketing-campaigns/references/campaign-log.md`, linked from `SKILL.md` in Task 4 as `references/campaign-log.md`. Establishes the 20 angle slugs and the six-column era-table format (`Date | Angle | Channel | Format | Hook | imp/lk/cm`) that Task 3 appends to.

Source data: 48 published posts on profile `6a4765d0568c787a4ccd94c5`, 2026-04-25 → 2026-07-28. Row counts per era: DigiArt 20, ELSEWHERE 21, PrintFeed 7.

- [ ] **Step 1: Write the failing check**

```bash
test -f .claude/skills/marketing-campaigns/references/campaign-log.md && \
  [ "$(grep -cE '^\| 2026-' .claude/skills/marketing-campaigns/references/campaign-log.md)" = "48" ] \
  && echo PASS || echo FAIL
```

- [ ] **Step 2: Confirm it fails**

Expected output: `FAIL` (file does not exist).

- [ ] **Step 3: Write the file**

Write `.claude/skills/marketing-campaigns/references/campaign-log.md` with exactly this content:

```markdown
# Campaign log

Every post published on the PrintFeed/ELSEWHERE profile
(`6a4765d0568c787a4ccd94c5`), 2026-04-25 → 2026-07-28. 48 posts, three brand
eras, 20 distinct angles.

Metrics are the values recorded at the 2026-07-30 sync — `imp/lk/cm` is
impressions / likes / comments. Append a row when a campaign ships; that is the
only maintenance ritual.

## Angle index

| Slug | Era | Posts | Best result |
| --- | --- | --- | --- |
| `hashtag-only` | pre-campaign | 1 | 232 imp |
| `platform-explainer` | DigiArt | 2 | 24 imp |
| `visual-prototype` | DigiArt | 1 | 38 imp |
| `monetization-channel` | DigiArt | 1 | 20 imp |
| `ephemerality` | DigiArt | 3 | 73 imp, 2 cm |
| `earnings-calculator` | DigiArt | 1 | 13 imp |
| `recurring-revenue` | DigiArt | 2 | 19 imp |
| `fan-support` | DigiArt | 2 | 24 imp |
| `co-creation` | DigiArt | 2 | 19 imp, 1 cm |
| `algorithm-gatekeeping` | DigiArt | 1 | 18 imp |
| `twenty-true-collectors` | DigiArt | 1 | 11 imp |
| `ownership-shelf` | DigiArt | 2 | 10 imp |
| `tagged-submission-call` | ELSEWHERE | 2 | 20 imp, 3 lk, 2 cm |
| `wonder-cafe` | ELSEWHERE | 4 | 12 imp |
| `provenance-antiscrape` | ELSEWHERE | 5 | 17 imp |
| `program-terms` | ELSEWHERE | 1 | 6 imp |
| `direct-recruit` | ELSEWHERE | 4 | 12 imp, 1 lk |
| `venue-b2b` | ELSEWHERE | 2 | 8 imp |
| `craft-object` | ELSEWHERE | 2 | 16 imp |
| `extension-collect-demo` | PrintFeed | 5 | 33 imp |

## Era 1 — DigiArt (2026-04-25 → 2026-07-07)

Brand: DigiArt, `digiart.btechhub.top`. Audience: creators and collectors, mixed
in the same feed. Retired when ELSEWHERE launched.

| Date | Angle | Channel | Format | Hook | imp/lk/cm |
| --- | --- | --- | --- | --- | --- |
| 2026-04-25 | `hashtag-only` | threads | image | `#artdaily` — no pitch at all | 232/2/0 |
| 2026-05-15 | `platform-explainer` | threads | text | "platform that lets people follow their favorite digital creators" | 24/0/0 |
| 2026-05-18 | `visual-prototype` | threads | carousel | "a visual prototype using public artwork from creators I admire" | 38/0/0 |
| 2026-05-21 | `monetization-channel` | threads | text | "ready to explore a new monetization channel for your digital art?" | 20/0/0 |
| 2026-05-21 | — *(blank)* | threads | image | **shipped with empty copy** | 21/0/0 |
| 2026-05-22 | `ephemerality` | threads | image | "What if your impressions did not disappear into the feed?" — tagged `@108iroha23` | 73/0/2 |
| 2026-05-22 | `platform-explainer` | threads | carousel | "exploring new ways to experience, share and support digital artists" | 20/0/2 |
| 2026-05-23 | `ephemerality` | threads | text | "what's so charming about digital art feeds?" | 17/0/1 |
| 2026-05-25 | `earnings-calculator` | threads | text | "made a calculator so you can see if it's worth your time" | 13/0/0 |
| 2026-06-10 | `recurring-revenue` | threads | carousel | "one-off sales are a rollercoaster" | 19/0/0 |
| 2026-06-16 | `fan-support` | threads | carousel | "your fans want to support you, not just like a post" | 24/0/0 |
| 2026-06-26 | `co-creation` | threads | text | "Collectors! Need your help in shaping the product" | 5/0/1 |
| 2026-06-26 | `co-creation` | threads | text | "Creators! Need your help in shaping the product" | 19/0/1 |
| 2026-07-01 | `algorithm-gatekeeping` | threads | image | "your best work is buried… because you didn't pay to boost it" | 18/0/0 |
| 2026-07-02 | `ownership-shelf` | threads | image | "a screen doesn't feel like ownership" | 8/0/0 |
| 2026-07-03 | `twenty-true-collectors` | threads | image | "20 true collectors instead of 20k passive scrollers" | 11/0/0 |
| 2026-07-04 | `ownership-shelf` | threads | image | "wanting your digital art collection to feel real" | 10/0/0 |
| 2026-07-05 | `fan-support` | threads | image | repeat of 2026-06-16 copy | 20/0/0 |
| 2026-07-06 | `ephemerality` | threads | image | "digital art feels like a passing cloud" | 14/0/0 |
| 2026-07-07 | `recurring-revenue` | threads | image | repeat of 2026-06-10 copy | 11/0/0 |
```

- [ ] **Step 4: Append the ELSEWHERE era table**

Append to the same file:

```markdown
## Era 2 — ELSEWHERE (2026-07-06 → 2026-07-24)

Brand: ELSEWHERE, `elsewhere.btechhub.top`. Two audiences: artists (recruited as
"Cartographers") and venues (cafés, studios, boutique hotels). First era to
cross-post Threads + Facebook with identical copy.

| Date | Angle | Channel | Format | Hook | imp/lk/cm |
| --- | --- | --- | --- | --- | --- |
| 2026-07-06 13:12 | `tagged-submission-call` | threads | text | "Looking for creators that could select 3-5 works" — tagged 8 artists by name | 20/3/2 |
| 2026-07-06 13:18 | `tagged-submission-call` | threads | text | "anyone interested in collaborating on a project?" | 14/0/1 |
| 2026-07-06 15:14 | — *(blank)* | facebook | image | **shipped with empty copy** | 2/0/0 |
| 2026-07-08 | `wonder-cafe` | threads | image | "every page is a place that doesn't exist" | 12/0/0 |
| 2026-07-10 | `wonder-cafe` | facebook | text | same copy, CTA "link in bio or dm" | 2/0/0 |
| 2026-07-10 | `wonder-cafe` | threads | text | same copy | 8/0/0 |
| 2026-07-12 | `provenance-antiscrape` | threads | image | "named in every issue. opted in, never scraped" | 17/0/0 |
| 2026-07-13 | `provenance-antiscrape` | facebook | text | "come be a Cartographer" | 7/0/0 |
| 2026-07-13 | `provenance-antiscrape` | threads | text | same copy | 7/0/0 |
| 2026-07-14 | `program-terms` | facebook | image | long-form: credited, opted in, zero cost, rev-share | 6/0/0 |
| 2026-07-15 | `direct-recruit` | facebook | text | "looking for artists who build worlds" | 3/0/0 |
| 2026-07-15 | `direct-recruit` | threads | text | same copy | 8/0/0 |
| 2026-07-18 17:13 | `venue-b2b` | threads | image | "what's the last café that had a proper coffee-table book" | 8/0/0 |
| 2026-07-18 17:42 | `venue-b2b` | facebook | image | "For café, studio and boutique-hotel owners" | 2/0/0 |
| 2026-07-18 17:42 | `wonder-cafe` | facebook | image | "Ever pick up a magazine in a café…" — the corpus's only click | 2/0/0 |
| 2026-07-20 16:00 | `craft-object` | threads | image | "lives at 2000px wide, then scrolls past in half a second" | 16/0/0 |
| 2026-07-20 16:02 | `craft-object` | facebook | image | same copy | 0/0/0 |
| 2026-07-22 16:02 | `provenance-antiscrape` | threads | image | "named in the back of the issue. and paid on every copy printed" | 14/1/0 |
| 2026-07-22 16:02 | `provenance-antiscrape` | facebook | image | same copy | 0/0/0 |
| 2026-07-24 16:04 | `direct-recruit` | facebook | image | "looking for people who make places that don't exist" | 0/0/0 |
| 2026-07-24 16:05 | `direct-recruit` | threads | image | same copy | 12/1/0 |

## Era 3 — PrintFeed (2026-07-19 → 2026-07-28)

Brand: PrintFeed, `printfeed.btechhub.top`. Audience: collectors. All copy demos
the collect funnel via the browser extension.

| Date | Angle | Channel | Format | Hook | imp/lk/cm |
| --- | --- | --- | --- | --- | --- |
| 2026-07-19 | `extension-collect-demo` | threads | video | "How I'm collecting art on Threads 👇" | 5/0/0 |
| 2026-07-20 09:05 | `extension-collect-demo` | facebook | video | "PrintFeed lets you collect it. tap once…" | 1/0/0 |
| 2026-07-20 09:10 | `extension-collect-demo` | threads | video | same copy | 8/0/0 |
| 2026-07-20 15:37 | — *(blank)* | threads | text | **shipped with empty copy** | 0/0/0 |
| 2026-07-21 09:06 | `extension-collect-demo` | facebook | video | "see a piece you love? one click adds it to your magazine" | 1/0/0 |
| 2026-07-21 09:06 | `extension-collect-demo` | threads | video | same copy | 33/0/0 |
| 2026-07-28 12:51 | — *(blank)* | facebook | video | **shipped with empty copy** | 0/0/0 |
```

- [ ] **Step 5: Re-run the row-count check**

```bash
[ "$(grep -cE '^\| 2026-' .claude/skills/marketing-campaigns/references/campaign-log.md)" = "48" ] \
  && echo PASS || echo "FAIL: got $(grep -cE '^\| 2026-' .claude/skills/marketing-campaigns/references/campaign-log.md)"
```

Expected output: `PASS`. If the count is off, a row was dropped or duplicated — the era counts are DigiArt 20, ELSEWHERE 21, PrintFeed 7.

- [ ] **Step 6: Verify all 20 angle slugs appear in era tables**

```bash
for s in hashtag-only platform-explainer visual-prototype monetization-channel \
         ephemerality earnings-calculator recurring-revenue fan-support co-creation \
         algorithm-gatekeeping twenty-true-collectors ownership-shelf \
         extension-collect-demo wonder-cafe provenance-antiscrape direct-recruit \
         tagged-submission-call program-terms craft-object venue-b2b; do
  grep -q "\`$s\`" .claude/skills/marketing-campaigns/references/campaign-log.md || echo "MISSING: $s"
done; echo "slug check done"
```

Expected output: `slug check done` with no `MISSING` lines.

- [ ] **Step 7: Verify the four blank posts are recorded**

```bash
[ "$(grep -c 'shipped with empty copy' .claude/skills/marketing-campaigns/references/campaign-log.md)" = "4" ] \
  && echo PASS || echo FAIL
```

Expected output: `PASS`.

- [ ] **Step 8: Commit**

```bash
git add .claude/skills/marketing-campaigns/references/campaign-log.md
git commit -m "$(cat <<'EOF'
Log 48 published posts across three brand eras

Records every post on the PrintFeed/ELSEWHERE profile from
2026-04-25 to 07-28, tagged with one of 20 angle slugs, so a
session can answer "have we tried this already" without
re-deriving it from Zernio each time.

Marks the four posts that shipped with empty copy, since that
failure is invisible in any per-angle summary.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `campaign-log.md` — extension angle detail and observations

**Files:**
- Modify: `.claude/skills/marketing-campaigns/references/campaign-log.md` (append two sections at end of file)

**Interfaces:**
- Consumes: `campaign-log.md` with all three era tables from Task 2.
- Produces: the `## extension-collect-demo — the tool-led angle` heading and `## Observations (2026-07-30)` heading, both linked from `SKILL.md` in Task 4 as anchor targets `references/campaign-log.md#extension-collect-demo--the-tool-led-angle` and `references/campaign-log.md#observations-2026-07-30`.

- [ ] **Step 1: Write the failing check**

```bash
grep -q 'the tool-led angle' .claude/skills/marketing-campaigns/references/campaign-log.md \
  && grep -q 'Observations (2026-07-30)' .claude/skills/marketing-campaigns/references/campaign-log.md \
  && echo PASS || echo FAIL
```

- [ ] **Step 2: Confirm it fails**

Expected output: `FAIL` (neither section exists yet).

- [ ] **Step 3: Append both sections**

Append to `.claude/skills/marketing-campaigns/references/campaign-log.md`:

```markdown
## `extension-collect-demo` — the tool-led angle

Recorded as its own class because it is structurally different from the other 19:
it demos a **working tool** rather than describing a planned product.

Five posts (2026-07-19 through 07-21) showing the ELSEWHERE Collector browser
extension — `extensions/threads-collector`, manifest name "ELSEWHERE Collector
(Threads POC)" — running on live Threads and posting to
`app.printfeed.btechhub.top`. It produced the best Threads number of July: 33
impressions on 2026-07-21.

**This angle has a code dependency no other angle has.** Its copy makes concrete
claims about behavior — "tap once", "one click adds it to your magazine". Before
reusing or adapting it, check the claims against
`extensions/threads-collector/src/content.js` and `docs/collect-funnel.md`.
Commit `34328a4` changed per-image collect so that swiping a carousel collects
the visible slide rather than always the first one; demo copy outlives the build
it was written against.

## Observations (2026-07-30)

What the 48-post corpus shows. These are findings, not instructions — the choice
of what to do next is a separate decision.

- The top post of all 48 is `hashtag-only` (2026-04-25, 232 impressions): an
  image with `#artdaily` and no pitch. Nothing in the three months since has come
  within 3× of it.
- The only two posts that drew replies both tagged artists by name — 2026-05-22
  (73 impressions, 2 comments, tagged `@108iroha23`) and 2026-07-06 (20
  impressions, 3 likes, 2 comments, tagged 8 artists). No untagged post in the
  corpus produced a comment thread.
- Format is uncorrelated with reach. Image, video, carousel, and text all land in
  the same 5–33 band on Threads.
- Facebook PrintFeed reached 0–2 people on every post, regardless of format,
  image, or copy. The account has 0 followers.
- Adding images did not change outcomes. Round 1 (2026-07-10/13/15) was text-only
  and round 2 (07-20/22/24) shipped `.jpg` mockups; both landed in the same band.
- Three brand renames in three months (DigiArt → ELSEWHERE → PrintFeed) with no
  audience carried across. `_bk_art29` went 10 → 13 followers across all of July;
  PrintFeed stayed at 0.
- Across all 48 posts there was one recorded click and zero attributed follows.
- Four posts shipped with empty copy, one of them as recently as 2026-07-28.
```

- [ ] **Step 4: Re-run the check**

```bash
grep -q 'the tool-led angle' .claude/skills/marketing-campaigns/references/campaign-log.md \
  && grep -q 'Observations (2026-07-30)' .claude/skills/marketing-campaigns/references/campaign-log.md \
  && echo PASS || echo FAIL
```

Expected output: `PASS`.

- [ ] **Step 5: Verify the observations block stays neutral**

The Global Constraints forbid prescriptive language here.

```bash
grep -nE 'you should|we should|stop (doing|posting)|instead of posting|must focus|recommend' \
  .claude/skills/marketing-campaigns/references/campaign-log.md && echo "VIOLATION" || echo "CLEAN"
```

Expected output: `CLEAN`. If a line matches, rewrite it as a statement of what the data shows.

- [ ] **Step 6: Verify the row count is still 48**

Appending must not have disturbed the tables.

```bash
[ "$(grep -cE '^\| 2026-' .claude/skills/marketing-campaigns/references/campaign-log.md)" = "48" ] \
  && echo PASS || echo FAIL
```

Expected output: `PASS`.

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/marketing-campaigns/references/campaign-log.md
git commit -m "$(cat <<'EOF'
Record extension angle detail and corpus findings

Separates extension-collect-demo from the other 19 angles: it
demos a shipped tool, so its copy makes claims that can drift
from the code. Points at content.js and the collect-funnel doc
as the check before reusing it.

Adds a dated observations block stating what the 48 posts show,
deliberately without prescribing a next motion.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `SKILL.md`

**Files:**
- Create: `.claude/skills/marketing-campaigns/SKILL.md`

**Interfaces:**
- Consumes: `references/channels.md` (Task 1) and `references/campaign-log.md` with both appended sections (Tasks 2–3). All links are relative to the skill directory.
- Produces: the skill itself. `name: marketing-campaigns` is the invocation name.

- [ ] **Step 1: Write the failing check**

```bash
test -f .claude/skills/marketing-campaigns/SKILL.md \
  && head -1 .claude/skills/marketing-campaigns/SKILL.md | grep -q '^---$' \
  && grep -q '^name: marketing-campaigns$' .claude/skills/marketing-campaigns/SKILL.md \
  && echo PASS || echo FAIL
```

- [ ] **Step 2: Confirm it fails**

Expected output: `FAIL`.

- [ ] **Step 3: Write the file**

Write `.claude/skills/marketing-campaigns/SKILL.md` with exactly this content:

```markdown
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
```

- [ ] **Step 4: Re-run the frontmatter check**

```bash
test -f .claude/skills/marketing-campaigns/SKILL.md \
  && head -1 .claude/skills/marketing-campaigns/SKILL.md | grep -q '^---$' \
  && grep -q '^name: marketing-campaigns$' .claude/skills/marketing-campaigns/SKILL.md \
  && echo PASS || echo FAIL
```

Expected output: `PASS`.

- [ ] **Step 5: Verify every relative link target exists**

```bash
cd .claude/skills/marketing-campaigns
grep -oE '\]\(references/[a-z-]+\.md' SKILL.md | sed 's/](//' | sort -u | while read f; do
  test -f "$f" && echo "OK   $f" || echo "BROKEN $f"
done
cd - >/dev/null
```

Expected output: `OK references/campaign-log.md` and `OK references/channels.md`, no `BROKEN` lines.

- [ ] **Step 6: Verify every repo path referenced from SKILL.md exists**

```bash
for p in apps/landing/marketing/elsewhere-social-drafts.md \
         docs/research/elsewhere-artist-program.md \
         docs/research/elsewhere-outreach-kit.md \
         docs/research/b2b-venue-icp.md \
         docs/collect-funnel.md \
         extensions/threads-collector/src/content.js; do
  test -e "$p" && echo "OK   $p" || echo "MISSING $p"
done
```

Expected output: all `OK`. If any path is `MISSING`, correct the link in `SKILL.md` — do not create the file.

- [ ] **Step 7: Verify the anchor targets resolve**

The two deep links must match real headings in `campaign-log.md`.

```bash
grep -q '^## `extension-collect-demo` — the tool-led angle$' \
  .claude/skills/marketing-campaigns/references/campaign-log.md && echo "OK anchor 1" || echo "BROKEN anchor 1"
grep -q '^## Observations (2026-07-30)$' \
  .claude/skills/marketing-campaigns/references/campaign-log.md && echo "OK anchor 2" || echo "BROKEN anchor 2"
```

Expected output: `OK anchor 1`, `OK anchor 2`.

- [ ] **Step 8: Commit**

```bash
git add .claude/skills/marketing-campaigns/SKILL.md
git commit -m "$(cat <<'EOF'
Add marketing-campaigns skill entry point

Auto-loading context for the PrintFeed and ELSEWHERE campaigns:
brand positioning, a pre-publish checklist built from real
failures, and the procedure for pulling results without
inheriting two unrelated accounts' traffic.

Holds no live state by design — it tells the reader to query
Zernio for what is scheduled, so the file cannot go stale on
numbers.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Cross-file verification

**Files:**
- Modify (only if a check fails): any of the three skill files.

**Interfaces:**
- Consumes: all three files complete from Tasks 1–4.
- Produces: nothing new. This is the spec's Verification section run end to end.

- [ ] **Step 1: Confirm no live-state claims in any file**

```bash
grep -rniE 'currently (running|scheduled|live)|next post is|posts? are scheduled|as of today|right now' \
  .claude/skills/marketing-campaigns/ && echo "VIOLATION" || echo "CLEAN"
```

Expected output: `CLEAN`. Any hit must be rewritten to point at a Zernio query instead.

- [ ] **Step 2: Confirm every metric carries a date**

Scan visually — each table or number should sit under a heading or sentence naming
its date (`2026-07-30 snapshot`, or the post's own date column).

```bash
grep -rn 'as of 2026-07-30\|2026-07-30 snapshot\|(2026-07-30)' .claude/skills/marketing-campaigns/
```

Expected: at least one dated marker in `channels.md` and one in `campaign-log.md`.

- [ ] **Step 3: Confirm the excluded accounts appear only as exclusions**

```bash
grep -rn '6a4765939d9472faae61b024\|6a32960e5f7d1751abef1c46' .claude/skills/marketing-campaigns/
```

Expected: hits only inside the "Exclude from all campaign reporting" table in
`channels.md`. If either ID appears anywhere else, remove it.

- [ ] **Step 4: Verify the account and profile IDs resolve against Zernio**

Call `accounts_list` and confirm each ID in `channels.md` matches a real account,
including the two excluded ones (they must resolve — that is why they are named).

Expected: `6a4673619d9472faae553503` = facebook PrintFeed,
`6a4411809d9472faae33a942` = threads `_bk_art29`, both on profile
`6a4765d0568c787a4ccd94c5`. If an ID has changed, update `channels.md` and note
the change date.

- [ ] **Step 5: Verify the skill is discoverable**

```bash
ls -la .claude/skills/marketing-campaigns/ .claude/skills/marketing-campaigns/references/
git status --short .claude/
```

Expected: three files present, working tree clean (all committed). The skill
appears in the available-skills list only in a **new** session — note this for the
user rather than trying to verify it in the current one.

- [ ] **Step 6: Confirm nothing out of scope was touched**

```bash
git diff --stat main..HEAD -- apps/social-media-generator/output/guidelines-creator.md \
  apps/social-media-generator/output/guidelines-collector.md var/ apps/landing
```

Expected: empty output for `guidelines-*` and `var/`. (`apps/landing` may show the
submodule bump from earlier branch work — that is unrelated to this plan.)

- [ ] **Step 7: Commit any fixes**

Only if Steps 1–4 required an edit:

```bash
git add .claude/skills/marketing-campaigns/
git commit -m "$(cat <<'EOF'
Fix playbook verification findings

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

If nothing changed, skip — do not create an empty commit.

---

## Self-Review

**Spec coverage.** Every spec section maps to a task: Structure → Tasks 1–4 file
paths; staleness rule → Task 1 Step 5, Task 5 Step 1, `SKILL.md` §1; `SKILL.md`
Parts 1–4 → Task 4 §§1–4; `channels.md` → Task 1; `campaign-log.md` era tables and
angle index → Task 2; `extension-collect-demo` section and observations → Task 3;
Verification checks 1–4 → Task 5 Steps 5, 4, 6/Task 4 Steps 5–7, and 1. Scope and
non-goals are in Global Constraints and checked in Task 5 Steps 3 and 6.

**Placeholder scan.** No TBD/TODO. Every file's full content is inline. Every check
is a runnable command with a stated expected output.

**Consistency.** Angle slugs are pinned once in Global Constraints and reused
verbatim in Task 2's index, era tables, and Step 6 loop. Era row counts (20/21/7 =
48) are asserted in Task 2 Steps 5 and 7 and re-asserted in Task 3 Step 6. Anchor
text in Task 4's links matches the exact headings written in Task 3 Step 3,
verified by Task 4 Step 7. Profile ID `6a4765d0568c787a4ccd94c5` is identical
across all tasks.

**One gap accepted.** Spec Verification #1 ("skill appears in a fresh session")
cannot be checked from inside the session that creates it. Task 5 Step 5 verifies
the on-disk preconditions and flags the rest for the user to confirm on next
start.
