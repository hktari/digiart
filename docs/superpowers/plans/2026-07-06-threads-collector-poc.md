# ELSEWHERE Threads Collector POC — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An unpacked MV3 Chrome extension that injects "Collect" buttons onto Threads posts and saves full-res images + a metadata JSON to disk.

**Architecture:** Three-file extension. `extract.js` holds pure, unit-tested DOM/URL logic (no browser APIs). `content.js` walks the page, injects buttons, and builds payloads using `extract.js`. `background.js` (service worker) receives payloads and writes files via `chrome.downloads`. Output is a per-post folder under `~/Downloads/art-collect/`.

**Tech Stack:** MV3 Chrome extension (vanilla JS, no build step, no deps). Tests via Node's built-in `node:test` + `node:assert`.

## Global Constraints

- Location: `extensions/threads-collector/` (outside the `apps/*` pnpm workspace — do NOT add it to `pnpm-workspace.yaml`).
- No runtime dependencies. No bundler. Plain files loaded directly by Chrome.
- `extract.js` must contain **only** pure functions — no `chrome.*`, no `document`, no DOM. It must work in both the browser (as `globalThis.TC`) and Node (`require`).
- Image URLs are signed and expire — never persist a URL as the artifact; download the bytes immediately. `chrome.downloads.download({url})` hits the CDN directly (no `fetch`, so no CORS).
- Anchor extraction on the permalink URL + `cdninstagram`/`fbcdn` image host + `srcset`. Never on Meta's CSS class names.
- Button accent color: fuchsia `#d6009a` (matches the project palette).
- Branch: `feat/threads-collector-poc` (already checked out).

---

### Task 1: Extraction core (`extract.js`) — pure logic, TDD

**Files:**
- Create: `extensions/threads-collector/package.json`
- Create: `extensions/threads-collector/src/extract.js`
- Test: `extensions/threads-collector/test/extract.test.js`

**Interfaces:**
- Produces `globalThis.TC` / `module.exports` = object with:
  - `parsePermalink(pathname: string): {handle, shortcode, postUrl} | null`
  - `pickLargestSrcset(srcset: string|null, srcFallback: string|null): string | null`
  - `looksLikeVideoCover(url: string): boolean`
  - `extFromUrl(url: string): string`
  - `buildFilename(index: number, url: string): string`
  - `imageId(url: string): string`
  - `buildMetadata({mode, handle, shortcode, postUrl, caption, images, collectedAt}): object`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "threads-collector",
  "private": true,
  "version": "0.0.1",
  "description": "ELSEWHERE Threads collector POC (MV3 extension)",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Write the failing test** — `extensions/threads-collector/test/extract.test.js`

```js
const test = require("node:test");
const assert = require("node:assert");
const TC = require("../src/extract.js");

const VIDEO_URL =
  "https://scontent.cdninstagram.com/v/t51.71878-15/736142119_x_n.jpg" +
  "?efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0ueHBpZHMuNjQwLnNkci52aWRlb19kZWZhdWx0X2NvdmVyX2ZyYW1lLkMzIn0%3D&oe=6A51669B";
const PHOTO_URL =
  "https://scontent.cdninstagram.com/v/t51.82787-15/735128813_x_n.jpg" +
  "?efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0ueHBpZHMuMzI4MC5zZHIucmVndWxhcl9waG90by5DMyJ9&oe=6A516DCB";

test("parsePermalink extracts handle + shortcode from a post path", () => {
  const r = TC.parsePermalink("/@ryleelarae/post/DabUWTAkv7M");
  assert.deepEqual(r, {
    handle: "ryleelarae",
    shortcode: "DabUWTAkv7M",
    postUrl: "https://www.threads.com/@ryleelarae/post/DabUWTAkv7M",
  });
});

test("parsePermalink tolerates trailing segments/query", () => {
  const r = TC.parsePermalink("/@ryleelarae/post/DabUWTAkv7M/media?x=1");
  assert.equal(r.shortcode, "DabUWTAkv7M");
});

test("parsePermalink returns null for non-post paths", () => {
  assert.equal(TC.parsePermalink("/"), null);
  assert.equal(TC.parsePermalink("/search"), null);
  assert.equal(TC.parsePermalink("/@ryleelarae"), null);
});

test("pickLargestSrcset returns the highest-width candidate", () => {
  const srcset = "https://cdn/a.jpg 245w, https://cdn/b.jpg 640w, https://cdn/c.jpg 3280w";
  assert.equal(TC.pickLargestSrcset(srcset, "https://cdn/fallback.jpg"), "https://cdn/c.jpg");
});

test("pickLargestSrcset falls back to src when srcset empty", () => {
  assert.equal(TC.pickLargestSrcset("", "https://cdn/fallback.jpg"), "https://cdn/fallback.jpg");
  assert.equal(TC.pickLargestSrcset(null, "https://cdn/fallback.jpg"), "https://cdn/fallback.jpg");
});

test("looksLikeVideoCover detects video cover frames via efg tag", () => {
  assert.equal(TC.looksLikeVideoCover(VIDEO_URL), true);
  assert.equal(TC.looksLikeVideoCover(PHOTO_URL), false);
  assert.equal(TC.looksLikeVideoCover("https://cdn/x.jpg"), false);
});

test("extFromUrl reads a safe image extension", () => {
  assert.equal(TC.extFromUrl("https://cdn/a_n.webp?x=1"), "webp");
  assert.equal(TC.extFromUrl("https://cdn/a_n.jpg?x=1"), "jpg");
  assert.equal(TC.extFromUrl("https://cdn/weird?x=1"), "jpg");
});

test("buildFilename zero-pads and uses the url extension", () => {
  assert.equal(TC.buildFilename(1, "https://cdn/a_n.jpg?x"), "01.jpg");
  assert.equal(TC.buildFilename(12, "https://cdn/a_n.webp?x"), "12.webp");
});

test("imageId returns the filename stem for dedup", () => {
  assert.equal(TC.imageId("https://cdn/v/t51/735128813_18600781354061813_x_n.jpg?a=1"), "735128813_18600781354061813_x_n");
});

test("buildMetadata assembles the outreach payload", () => {
  const meta = TC.buildMetadata({
    mode: "post",
    handle: "ryleelarae",
    shortcode: "DabUWTAkv7M",
    postUrl: "https://www.threads.com/@ryleelarae/post/DabUWTAkv7M",
    caption: "hello",
    collectedAt: "2026-07-06T00:00:00.000Z",
    images: [{ url: "https://cdn/a.jpg", width: 3280, height: 2000, filename: "01.jpg" }],
  });
  assert.equal(meta.source, "threads");
  assert.equal(meta.mode, "post");
  assert.equal(meta.imageCount, 1);
  assert.deepEqual(meta.images[0], {
    index: 1,
    url: "https://cdn/a.jpg",
    width: 3280,
    height: 2000,
    filename: "01.jpg",
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd extensions/threads-collector && npm test`
Expected: FAIL — `Cannot find module '../src/extract.js'`.

- [ ] **Step 4: Write the implementation** — `extensions/threads-collector/src/extract.js`

```js
// Pure extraction/URL helpers. No DOM, no chrome APIs.
// Exposed as globalThis.TC (browser) and module.exports (Node).

function parsePermalink(pathname) {
  const m = /^\/@([^/]+)\/post\/([^/?#]+)/.exec(pathname || "");
  if (!m) return null;
  const handle = m[1];
  const shortcode = m[2];
  return {
    handle,
    shortcode,
    postUrl: `https://www.threads.com/@${handle}/post/${shortcode}`,
  };
}

function pickLargestSrcset(srcset, srcFallback) {
  let best = null;
  if (srcset) {
    for (const part of srcset.split(",")) {
      const seg = part.trim();
      if (!seg) continue;
      const sp = seg.lastIndexOf(" ");
      const url = sp === -1 ? seg : seg.slice(0, sp);
      const w = sp === -1 ? 0 : parseInt(seg.slice(sp + 1), 10) || 0;
      if (!best || w > best.w) best = { url, w };
    }
  }
  if (best && best.url) return best.url;
  return srcFallback || null;
}

function looksLikeVideoCover(url) {
  try {
    const q = (url || "").split("?")[1] || "";
    const efg = new URLSearchParams(q).get("efg");
    if (!efg) return false;
    return /video/i.test(atob(efg));
  } catch {
    return false;
  }
}

function extFromUrl(url) {
  const path = (url || "").split("?")[0];
  const dot = path.lastIndexOf(".");
  const ext = dot === -1 ? "" : path.slice(dot + 1).toLowerCase();
  return /^(jpg|jpeg|png|webp|gif)$/.test(ext) ? ext : "jpg";
}

function buildFilename(index, url) {
  return `${String(index).padStart(2, "0")}.${extFromUrl(url)}`;
}

function imageId(url) {
  const path = (url || "").split("?")[0];
  const seg = path.substring(path.lastIndexOf("/") + 1);
  return seg.replace(/\.[a-z0-9]+$/i, "");
}

function buildMetadata({ mode, handle, shortcode, postUrl, caption, images, collectedAt }) {
  return {
    source: "threads",
    collectedAt,
    mode,
    handle,
    postUrl,
    shortcode,
    caption: caption || "",
    imageCount: images.length,
    images: images.map((img, i) => ({
      index: i + 1,
      url: img.url,
      width: img.width || null,
      height: img.height || null,
      filename: img.filename,
    })),
  };
}

const TC = {
  parsePermalink,
  pickLargestSrcset,
  looksLikeVideoCover,
  extFromUrl,
  buildFilename,
  imageId,
  buildMetadata,
};

if (typeof module !== "undefined" && module.exports) module.exports = TC;
if (typeof globalThis !== "undefined") globalThis.TC = TC;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd extensions/threads-collector && npm test`
Expected: PASS — all tests green.

- [ ] **Step 6: Commit**

```bash
git add extensions/threads-collector/package.json extensions/threads-collector/src/extract.js extensions/threads-collector/test/extract.test.js
git commit -m "feat(threads-collector): pure extraction core + tests"
```

---

### Task 2: Manifest + background service worker

**Files:**
- Create: `extensions/threads-collector/manifest.json`
- Create: `extensions/threads-collector/src/background.js`

**Interfaces:**
- Consumes: runtime message `{type: "collect", payload: {dir, metadata, files: [{url, filename}], metaFile}}` (produced by Task 3's content script).
- Produces: files on disk via `chrome.downloads`.

- [ ] **Step 1: Write `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "ELSEWHERE Collector (Threads POC)",
  "version": "0.0.1",
  "description": "Collect artwork + post metadata from Threads for creator outreach.",
  "permissions": ["downloads"],
  "background": { "service_worker": "src/background.js" },
  "content_scripts": [
    {
      "matches": ["*://www.threads.com/*"],
      "js": ["src/extract.js", "src/content.js"],
      "css": ["src/buttons.css"],
      "run_at": "document_idle"
    }
  ]
}
```

- [ ] **Step 2: Write `src/background.js`**

```js
// Service worker: receives collect payloads and writes files via chrome.downloads.
// Downloads hit signed CDN URLs directly (no fetch => no CORS), so they must run
// immediately while the URL signature is still valid.

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== "collect" || !msg.payload) return;
  const { files, metadata, metaFile } = msg.payload;

  for (const f of files || []) {
    chrome.downloads
      .download({ url: f.url, filename: f.filename, saveAs: false, conflictAction: "overwrite" })
      .catch((e) => console.warn("[tc] image download failed", f.filename, e));
  }

  try {
    const json = JSON.stringify(metadata, null, 2);
    const dataUrl = "data:application/json;base64," + btoa(unescape(encodeURIComponent(json)));
    chrome.downloads
      .download({ url: dataUrl, filename: metaFile, saveAs: false, conflictAction: "overwrite" })
      .catch((e) => console.warn("[tc] metadata download failed", e));
  } catch (e) {
    console.warn("[tc] metadata build failed", e);
  }
});
```

- [ ] **Step 3: Load the unpacked extension and verify no manifest/service-worker errors**

Note: `src/content.js` and `src/buttons.css` don't exist yet (Task 3). Chrome tolerates missing content-script files at load time with a console warning; the manifest and service worker must load cleanly. If load is blocked, create empty placeholder files `src/content.js` and `src/buttons.css` and proceed.

Run (kill any Chrome on the CDP port first, then relaunch WITH the extension and WITHOUT `--disable-extensions`):

```bash
pkill -f -- '--remote-debugging-port=9223' 2>/dev/null; sleep 1
EXT="$(pwd)/extensions/threads-collector"
PROFILE="$(pwd)/example/threads/.chrome-profile"
nohup google-chrome --remote-debugging-port=9223 --user-data-dir="$PROFILE" \
  --no-first-run --no-default-browser-check \
  --load-extension="$EXT" "about:blank" >/dev/null 2>&1 &
for i in $(seq 1 20); do curl -s http://localhost:9223/json/version >/dev/null 2>&1 && break; sleep 0.5; done
agent-browser --cdp 9223 open "chrome://extensions" 2>&1 | tail -1
agent-browser --cdp 9223 screenshot /tmp/tc-extensions.png 2>&1 | tail -1
```

Expected: the extension card "ELSEWHERE Collector (Threads POC)" appears with no red "Errors" badge on the service worker. Read `/tmp/tc-extensions.png` to confirm.

- [ ] **Step 4: Commit**

```bash
git add extensions/threads-collector/manifest.json extensions/threads-collector/src/background.js
git commit -m "feat(threads-collector): manifest + downloads service worker"
```

---

### Task 3: Content script + button styles

**Files:**
- Create: `extensions/threads-collector/src/content.js`
- Create: `extensions/threads-collector/src/buttons.css`

**Interfaces:**
- Consumes: `globalThis.TC` (Task 1).
- Produces: runtime message `{type: "collect", payload: {dir, metadata, files: [{url, filename}], metaFile}}` (consumed by Task 2).

- [ ] **Step 1: Write `src/buttons.css`**

```css
.tc-collect-post {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 9999;
  background: #d6009a;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  font: 600 12px/1 system-ui, sans-serif;
  cursor: pointer;
  opacity: 0.92;
}
.tc-collect-post:hover { opacity: 1; }

.tc-collect-img {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 9999;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}
.tc-collect-img:hover { background: #d6009a; }

#tc-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: #111;
  color: #fff;
  padding: 10px 16px;
  border-radius: 8px;
  font: 500 13px/1.2 system-ui, sans-serif;
  z-index: 100000;
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s;
  pointer-events: none;
}
#tc-toast.tc-toast-show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
```

- [ ] **Step 2: Write `src/content.js`**

```js
// Injects Collect buttons on Threads posts and builds collect payloads.
// Relies on globalThis.TC (extract.js, loaded first by the manifest).

(() => {
  const TC = globalThis.TC;
  if (!TC) return;

  const POST_MARK = "data-tc-post";
  const IMG_MARK = "data-tc-img";
  const CONTENT_HOST = /cdninstagram|fbcdn/;

  function isContentImg(img) {
    const url = img.currentSrc || img.src || "";
    return (
      CONTENT_HOST.test(url) &&
      (img.naturalWidth > 200 || img.width > 200) &&
      !/profile/i.test(img.alt || "")
    );
  }

  function bestUrl(img) {
    return TC.pickLargestSrcset(img.getAttribute("srcset"), img.currentSrc || img.src);
  }

  function postRootFor(anchor) {
    let el = anchor;
    for (let i = 0; i < 8 && el; i++) {
      if (el.querySelector && [...el.querySelectorAll("img")].some(isContentImg)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function collectImages(root) {
    const seen = new Set();
    const out = [];
    for (const img of root.querySelectorAll("img")) {
      if (!isContentImg(img)) continue;
      const url = bestUrl(img);
      if (!url || TC.looksLikeVideoCover(url)) continue;
      const id = TC.imageId(url);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ url, width: img.naturalWidth, height: img.naturalHeight });
    }
    return out;
  }

  function captionFor(root) {
    let best = "";
    for (const el of root.querySelectorAll("span, div")) {
      const t = (el.innerText || "").trim();
      if (t.length > best.length && t.length < 2000) best = t;
    }
    return best;
  }

  function permaForRoot(root) {
    const a = root.querySelector('a[href*="/post/"]');
    if (!a) return null;
    try {
      return TC.parsePermalink(new URL(a.href).pathname);
    } catch {
      return null;
    }
  }

  function buildPayload(mode, perma, caption, images, filenames) {
    const dir = `art-collect/${perma.handle}__${perma.shortcode}`;
    const metadata = TC.buildMetadata({
      mode,
      handle: perma.handle,
      shortcode: perma.shortcode,
      postUrl: perma.postUrl,
      caption,
      collectedAt: new Date().toISOString(),
      images: images.map((img, i) => ({
        url: img.url,
        width: img.width,
        height: img.height,
        filename: filenames[i],
      })),
    });
    return {
      dir,
      metadata,
      metaFile: `${dir}/metadata.json`,
      files: images.map((img, i) => ({ url: img.url, filename: `${dir}/${filenames[i]}` })),
    };
  }

  function send(payload, note) {
    chrome.runtime.sendMessage({ type: "collect", payload });
    flash(note);
  }

  function collectPost(root, perma) {
    const images = collectImages(root);
    if (!images.length) return flash("No collectable images found");
    const filenames = images.map((img, i) => TC.buildFilename(i + 1, img.url));
    send(buildPayload("post", perma, captionFor(root), images, filenames),
      `Collected ${images.length} image(s) from @${perma.handle}`);
  }

  function collectSingle(img, root, perma, index) {
    const url = bestUrl(img);
    if (!url) return;
    const item = { url, width: img.naturalWidth, height: img.naturalHeight };
    const filenames = [`single_${index}.${TC.extFromUrl(url)}`];
    send(buildPayload("single", perma, captionFor(root), [item], filenames),
      `Collected 1 image from @${perma.handle}`);
  }

  function flash(text) {
    let el = document.getElementById("tc-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "tc-toast";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add("tc-toast-show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("tc-toast-show"), 2500);
  }

  function decorate() {
    const roots = new Set();
    for (const a of document.querySelectorAll('a[href*="/post/"]')) {
      const root = postRootFor(a);
      if (root) roots.add(root);
    }
    for (const root of roots) {
      const perma = permaForRoot(root);
      if (!perma) continue;

      if (!root.hasAttribute(POST_MARK)) {
        root.setAttribute(POST_MARK, "1");
        if (getComputedStyle(root).position === "static") root.style.position = "relative";
        const btn = document.createElement("button");
        btn.className = "tc-collect-post";
        btn.textContent = "⬇ Collect post";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          collectPost(root, perma);
        });
        root.appendChild(btn);
      }

      let idx = 0;
      for (const img of root.querySelectorAll("img")) {
        if (!isContentImg(img)) continue;
        idx++;
        if (img.hasAttribute(IMG_MARK)) continue;
        img.setAttribute(IMG_MARK, "1");
        const wrap = img.parentElement;
        if (!wrap) continue;
        if (getComputedStyle(wrap).position === "static") wrap.style.position = "relative";
        const myIdx = idx;
        const b = document.createElement("button");
        b.className = "tc-collect-img";
        b.textContent = "⬇";
        b.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          collectSingle(img, root, perma, myIdx);
        });
        wrap.appendChild(b);
      }
    }
  }

  let t;
  const debounced = () => {
    clearTimeout(t);
    t = setTimeout(decorate, 400);
  };
  new MutationObserver(debounced).observe(document.documentElement, { childList: true, subtree: true });
  debounced();
})();
```

- [ ] **Step 3: Reload the extension and verify buttons appear on a post**

```bash
agent-browser --cdp 9223 open "chrome://extensions" 2>&1 | tail -1
# Click the reload icon on the extension card, or toggle it off/on, then:
agent-browser --cdp 9223 open "https://www.threads.com/" 2>&1 | tail -1
sleep 3
# navigate into a post via the feed (client-side nav works logged-out)
agent-browser --cdp 9223 snapshot -i 2>&1 | grep -i "post\|collect" | head
```

If the extension was already loaded, reload it so `content.js`/`buttons.css` are picked up (simplest: re-run the launch command from Task 2 Step 3 after `pkill`). Navigate into a real image post from the home feed, then screenshot:

```bash
agent-browser --cdp 9223 screenshot /tmp/tc-buttons.png 2>&1 | tail -1
```

Expected: a fuchsia "⬇ Collect post" button on the post and a small ⬇ on each content image. Read `/tmp/tc-buttons.png` to confirm.

- [ ] **Step 4: Commit**

```bash
git add extensions/threads-collector/src/content.js extensions/threads-collector/src/buttons.css
git commit -m "feat(threads-collector): content script buttons + styles"
```

---

### Task 4: End-to-end verification + README

**Files:**
- Create: `extensions/threads-collector/README.md`

- [ ] **Step 1: Perform a real collect and inspect the output**

With the extension loaded (Task 2/3), open an image post, then trigger a collect from the page and read the result. Drive the button click via agent-browser:

```bash
# On an open post page:
agent-browser --cdp 9223 snapshot -i 2>&1 | grep -i "collect post" | head -1   # find the ref
# click the Collect post button (use the ref from the snapshot, e.g. @e42)
# agent-browser --cdp 9223 click @eNN
sleep 3
ls -R ~/Downloads/art-collect/ 2>/dev/null | head -40
```

Expected: a folder `~/Downloads/art-collect/<handle>__<shortcode>/` containing `metadata.json` + numbered image files.

- [ ] **Step 2: Validate the metadata JSON**

```bash
DIR="$(ls -dt ~/Downloads/art-collect/*/ | head -1)"
cat "$DIR/metadata.json"
node -e "const m=require(process.argv[1]); if(!m.handle||!m.postUrl||!Array.isArray(m.images)||!m.images.length) throw new Error('bad metadata'); console.log('OK', m.handle, m.imageCount, 'images')" "$DIR/metadata.json"
```

Expected: valid JSON with `handle`, `postUrl`, `caption`, and a non-empty `images` array; each downloaded image file present and non-zero size. Verify image sizes:

```bash
DIR="$(ls -dt ~/Downloads/art-collect/*/ | head -1)"; ls -la "$DIR"; file "$DIR"/*.jpg "$DIR"/*.webp 2>/dev/null
```

- [ ] **Step 3: Test single-image collect**

Click a per-image ⬇ button (find its ref via snapshot), wait, and confirm a `single_<n>.<ext>` file appears in the same post folder with a `metadata.json` where `mode` is `single`.

- [ ] **Step 4: Write `README.md`**

```markdown
# ELSEWHERE Collector (Threads POC)

Unpacked MV3 Chrome extension that adds "Collect" buttons to Threads posts and
saves full-res images + post metadata to `~/Downloads/art-collect/`, ready for
creator outreach.

## Load it

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select this folder (`extensions/threads-collector`).
3. Browse Threads (logged in). On any post you'll see:
   - **⬇ Collect post** — saves every image in the post (a carousel = one set).
   - **⬇** on each image — saves just that image.

## Output

```
~/Downloads/art-collect/<handle>__<shortcode>/
    metadata.json   # source, handle, postUrl, caption, images[]
    01.jpg 02.jpg ...
```

`metadata.json` carries the minimum needed to reach out to the creator
(handle, post URL, caption).

## Test the extraction logic

```bash
npm test
```

## Notes / limitations (POC)

- Images only — video posts are detected and skipped.
- Image CDN URLs are signed and expire; the extension downloads bytes immediately.
- Caption capture is best-effort.
- No backend push yet — see `docs/superpowers/specs/2026-07-06-threads-collector-poc-design.md`
  for the intended path into the ELSEWHERE prospects/outreach pipeline.
```

- [ ] **Step 5: Commit**

```bash
git add extensions/threads-collector/README.md
git commit -m "docs(threads-collector): usage README + e2e verification"
```

---

## Self-Review

- **Spec coverage:** Collect post (all images) → Task 3 `collectPost` + Task 4 Step 1. Collect single image → Task 3 `collectSingle` + Task 4 Step 3. Full-res via srcset → `pickLargestSrcset` (Task 1). Carousel enumeration + dedup → `collectImages`/`imageId` (Tasks 1, 3). Video skip → `looksLikeVideoCover` (Tasks 1, 3). Signed-URL-expiry handling → direct `chrome.downloads` (Task 2). Metadata shape → `buildMetadata` (Task 1), matches spec fields. Local inspectable output → Task 4. All spec sections covered.
- **Placeholder scan:** none — every code step contains complete code; the only conditional is the documented placeholder-file fallback in Task 2 Step 3.
- **Type consistency:** payload shape `{dir, metadata, metaFile, files:[{url, filename}]}` is produced in Task 3 `buildPayload` and consumed identically in Task 2 `background.js`. `TC` method names match Task 1 definitions across content.js. Metadata `images[]` field names (`index, url, width, height, filename`) consistent between `buildMetadata` and its test.
