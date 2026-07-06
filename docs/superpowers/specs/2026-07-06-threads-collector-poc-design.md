# ELSEWHERE Collector — Threads POC

**Date:** 2026-07-06
**Status:** Approved design, pre-implementation
**Owner:** Boštjan Kamnik

## Purpose

An installable (unpacked MV3) Chrome extension that lets the user "collect" artwork
from a Threads post while browsing — scraping the full-resolution images plus the
minimal post metadata needed to reach out to the creator afterward.

This is a proof of concept. Consent and rights are handled out-of-band (creators
opt in and share print margins); the POC does not enforce or model consent.

## Scope

### In scope
- Two collect actions:
  1. **Collect post** — save *all* images in a post (carousel), treated as one
     thematically-aligned set (a future "Release").
  2. **Collect single image** — save just one image from a post.
- Full-resolution image extraction (largest `srcset` candidate).
- Minimal metadata capture sufficient for later outreach.
- Local, inspectable output (files on disk). No backend.

### Out of scope (POC)
- Login / authentication (a real extension runs in the user's already-authenticated
  session; testing uses public posts reached via the home feed).
- Pushing to Airtable prospects, `mvp`, or any backend.
- Video posts (detect and skip; images only).
- Deduplication, collection management UI, settings.
- Any UI beyond the two injected buttons.

## Findings that constrain the design (verified on live DOM, 2026-07-06)

- **Author + shortcode are in the permalink URL** (`/@<handle>/post/<shortcode>`) —
  the reliable metadata anchor. No scraping needed for these.
- **Full-res is reachable** via `img[srcset]` — observed a 3280px-wide candidate,
  adequate for print.
- **Carousels are enumerable** — each image is tagged `CAROUSEL_ITEM` in the DOM.
- **Video items** are flagged `video_default_cover_frame` — detectable, skipped.
- **Image URLs are signed and expire** (`scontent.cdninstagram.com/...&oh=<sig>&oe=<expiry>`).
  Must be fetched immediately at collect-time; the stored artifact is the image bytes,
  never the URL.
- **Threads is an SPA — `<meta og:*>` tags are stale** after client-side navigation.
  Read the DOM (`img`/`srcset`, permalink link), not meta tags.
- **Meta obfuscates CSS class names** (e.g. `xl1xv1r x1iwo8zk`). Anchor on structural
  signals: the permalink link, the `cdninstagram`/`fbcdn` image host, and `srcset`.

## Architecture

Three files, each with one responsibility:

### `manifest.json` (MV3)
- `manifest_version: 3`
- `permissions: ["downloads"]`
- `content_scripts` matching `*://www.threads.com/*` → injects `content.js` + button CSS.
- `background.service_worker: background.js`

### `content.js` — DOM extraction + button injection
- Locates each post's article container on the page.
- Reads `handle` and `shortcode` from the post's permalink link.
- For each content image in the post, selects the **largest `srcset`** candidate on the
  `cdninstagram`/`fbcdn` host; skips images flagged as video cover frames.
- Injects:
  - one **`⬇ Collect post`** button per post (carries all image URLs + metadata), and
  - a small **`⬇`** overlay button per image (carries one image URL + metadata).
- On click, sends a `collect` message with the payload to the service worker.
- Knows nothing about saving files.

### `background.js` — persistence via `chrome.downloads`
- Receives the `collect` payload.
- For each image URL, calls `chrome.downloads.download({ url, filename })` — hits the
  signed CDN URL directly (no `fetch`, so no CORS; expiry still valid).
- Writes `metadata.json` via a `data:application/json` URL.
- Knows nothing about the DOM.

## Data flow

1. User clicks a Collect button on a Threads post.
2. `content.js` builds a payload from the DOM and posts it to the service worker.
3. `background.js` downloads each image + a `metadata.json` into a per-post folder.

## Output layout (inspectable)

```
~/Downloads/art-collect/<handle>__<shortcode>/
    metadata.json
    01.jpg
    02.jpg
    03.jpg
```

Single-image collects land in the same per-post folder, named to indicate the single
item (e.g. `single_<n>.jpg`), so everything from one post stays together.

### `metadata.json` shape

```json
{
  "source": "threads",
  "collectedAt": "<ISO 8601>",
  "mode": "post" | "single",
  "handle": "<creator handle>",
  "postUrl": "https://www.threads.com/@<handle>/post/<shortcode>",
  "shortcode": "<shortcode>",
  "caption": "<post caption text, best-effort>",
  "imageCount": <n>,
  "images": [
    { "index": 1, "url": "<signed cdn url at collect time>", "width": <w>, "height": <h>, "filename": "01.jpg" }
  ]
}
```

`handle` + `postUrl` + `caption` are the minimum needed to reach out to the creator.

## Error handling

- **No permalink / shortcode found** → skip button injection for that post (nothing to
  anchor on); do not crash the page.
- **Image has no `srcset`** → fall back to the `src` attribute.
- **Download failure for one image** → the other images and `metadata.json` still save;
  failures are logged to the service-worker console.
- **Video cover frame** → excluded from the image set (images-only POC).

## Verification plan

1. Launch Chrome with `--load-extension=<dist>` (and without `--disable-extensions`) on
   the existing CDP profile.
2. Open a public Threads post by navigating from the home feed (works logged-out, per
   the findings).
3. Click **Collect post** on a carousel post, then a single-image **`⬇`** button.
4. `Read` `~/Downloads/art-collect/<handle>__<shortcode>/` to confirm the images and a
   well-formed `metadata.json` landed.

## Future (not built now)

- Push collected metadata into the ELSEWHERE prospects Airtable
  (base `app1QOtINLEvz5kxP`) to seed the outreach pipeline.
- Re-host image bytes to S3/MinIO and create a "collected piece" record in `mvp`,
  linking `handle` → `Creator`/prospect.
- Group a "Collect post" set as a `Release`.
- Handle video posts.
