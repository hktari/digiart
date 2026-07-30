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
