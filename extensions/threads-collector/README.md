# ELSEWHERE Collector (Threads POC)

Unpacked MV3 Chrome extension that adds "Collect" buttons to Threads posts and
saves full-res images + post metadata to `~/Downloads/art-collect/`, ready for
creator outreach.

## Load it (real use)

1. Open `chrome://extensions`, enable **Developer mode** (top-right).
2. **Load unpacked** → select this folder (`extensions/threads-collector`).
3. Browse Threads (logged in). On any post you'll see:
   - **⬇ Collect post** — saves every image in the post (a carousel = one set).
   - **⬇** on each image — saves just that image.

> Note: branded **Google Chrome** blocks loading extensions via the
> `--load-extension` command-line flag (`"--load-extension is not allowed in
> Google Chrome, ignoring."`). The **Load unpacked** button above works fine.
> For automated/headless runs, use **Chromium** or **Chrome for Testing**, which
> still honor `--load-extension`.

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
- `src/content.js` — walks the page, injects buttons, builds the collect payload.
- `src/background.js` — service worker; writes files via `chrome.downloads`
  (hits the signed CDN URL directly, so no CORS and the signature is still valid).

## Notes / limitations (POC)

- Images only — video posts are detected and skipped.
- Image CDN URLs are signed and expire; the extension downloads bytes immediately.
- Caption capture is **best-effort** and length-bounded (Threads obfuscates DOM
  structure); `handle` + `postUrl` are the reliable outreach keys.
- On a permalink thread page each image-bearing reply also gets its own
  **Collect post** button.
- No backend push yet — see
  `docs/superpowers/specs/2026-07-06-threads-collector-poc-design.md` for the
  intended path into the ELSEWHERE prospects/outreach pipeline.
