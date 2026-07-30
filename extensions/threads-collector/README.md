# ELSEWHERE Collector (Threads POC)

Unpacked MV3 Chrome extension that adds "Collect" buttons to Threads posts. Each
collect does two things: saves full-res images + post metadata to
`~/Downloads/art-collect/` for creator outreach, **and** pushes the collect into
the PrintFeed collect funnel so a hosted collection builds at `/c/<token>`.

## Load it (real use)

1. Open `chrome://extensions`, enable **Developer mode** (top-right).
2. **Load unpacked** → select this folder (`extensions/threads-collector`).
3. Browse Threads (logged in). A single floating button appears bottom-right,
   depending on the page:
   - On a **post page** (`/@handle/post/<id>`) → **Collect post** (magenta) —
     saves every image in the post (a carousel = one set).
   - On an **image page** (`/@handle/post/<id>/media`, the fullscreen viewer) →
     **Collect image** (cyan) — saves just the image shown.

   There is never more than one button on the page. The icon is the PrintFeed
   mark; the color tells you which action it is.

> Note: branded **Google Chrome** blocks loading extensions via the
> `--load-extension` command-line flag (`"--load-extension is not allowed in
> Google Chrome, ignoring."`). The **Load unpacked** button above works fine.
> For automated/headless runs, use **Chromium** or **Chrome for Testing**, which
> still honor `--load-extension`.

## Where a collect goes

Two destinations, both on every collect:

1. **Local files** — `~/Downloads/art-collect/...` (below), for creator outreach.
2. **Server ingest** — `POST https://app.printfeed.btechhub.top/api/collect/ingest`
   (`src/content.js:16-17`, sent from `src/background.js`). The server fetches the
   signed CDN bytes while they are still valid, stores them in S3, and builds the
   hosted collection at `/c/<token>` plus two `Lead` prospects. Point `MVP_URL` at
   `http://localhost:3003` to test the funnel end to end.

Marketing copy claiming "one click adds it to your magazine" describes (2) — see
`docs/collect-funnel.md`.

## Output

```
~/Downloads/art-collect/<handle>__<shortcode>/
    metadata.json   # source, handle, postUrl, caption, images[]
    01.jpg 02.jpg ...          # "Collect post"
    single_<n>.jpg             # "Collect single image"
```

`metadata.json` carries the minimum needed to reach out to the creator
(handle, post URL, caption).

## Test the extraction logic

```bash
npm test        # node --test — pure extraction functions in src/extract.js
```

## How it works

- `src/extract.js` — pure, unit-tested logic (permalink parsing, largest-`srcset`
  selection, video-cover detection, metadata shaping). No DOM, no chrome APIs.
- `src/content.js` — classifies the page (post vs `/media`), shows the single
  floating button, and builds the collect payload. On a thread page it scopes to
  the *main* post (the one matching the URL), not the replies.
- `icons/mark.svg` — PrintFeed brand mark, rendered as a tinted CSS-mask icon.
- `src/background.js` — service worker; writes files via `chrome.downloads`
  (hits the signed CDN URL directly, so no CORS and the signature is still valid).

## Notes / limitations (POC)

- Images only — video posts are detected and skipped.
- Image CDN URLs are signed and expire; the extension downloads bytes immediately.
- Caption capture is **best-effort** and length-bounded (Threads obfuscates DOM
  structure); `handle` + `postUrl` are the reliable outreach keys.
- On a permalink thread page each image-bearing reply also gets its own
  **Collect post** button.
- Not on the Chrome Web Store — developer-mode **Load unpacked** only. The
  `/collect` landing page therefore offers a waitlist, not an install button.
- Ingest is fire-and-forget: a failed push is logged to the service-worker
  console and does not block the local download.
