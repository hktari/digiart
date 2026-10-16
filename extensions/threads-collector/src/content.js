// Shows a single floating Collect button whose action depends on the page:
//   post detail  (/@h/post/sc)        -> "Collect post"  (all images in the main post)
//   image detail (/@h/post/sc/media)  -> "Collect image" (the image shown fullscreen)
// Relies on globalThis.TC (extract.js, loaded first by the manifest).

(() => {
  const TC = globalThis.TC;
  if (!TC) return;

  const CONTENT_HOST = /cdninstagram|fbcdn/;
  const ICON_URL = chrome.runtime.getURL("icons/mark.svg");
  const CAPTION_MAX = 600;

  // PrintFeed target. Deployed origin for pitching real users; swap back to
  // http://localhost:3003 while testing the funnel end-to-end.
  const MVP_URL = "https://app.printfeed.btechhub.top";
  const INGEST_ENDPOINT = `${MVP_URL}/api/collect/ingest`;

  // Stable guest token → the hosted collection. Minted once, persisted so every
  // collect from this browser lands in the same collection.
  function getToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["tc_token"], (res) => {
        if (res && res.tc_token) return resolve(res.tc_token);
        const t =
          (crypto.randomUUID && crypto.randomUUID()) ||
          `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        chrome.storage.local.set({ tc_token: t }, () => resolve(t));
      });
    });
  }

  function buildIngest(page, caption, images) {
    return {
      handle: page.handle,
      postUrl: page.postUrl,
      caption,
      images: images.map((img) => ({
        url: img.url,
        imageId: TC.imageId(img.url),
        width: img.width,
        height: img.height,
      })),
    };
  }

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

  function candidateUrls(img) {
    const urls = TC.srcsetUrls(img.getAttribute("srcset")).map((c) => c.url);
    if (img.currentSrc) urls.push(img.currentSrc);
    if (img.src) urls.push(img.src);
    return urls;
  }

  // Threads mounts the same artwork more than once: a resize-tokened carousel
  // thumbnail (`_p320x320`) and the full-size fullscreen img (`_e35_tt6`) share
  // one asset id. Which of them wins on screen area depends on viewport, DPR and
  // how far the carousel has been dragged, so choosing an ELEMENT and trusting
  // its URL is a coin flip — that is how 320px crops of 2958px originals ended
  // up in the collection. Choose the asset, then take the best URL the whole
  // document offers for it.
  function bestUrlForAsset(assetId) {
    let best = null;
    for (const img of document.querySelectorAll("img")) {
      for (const url of candidateUrls(img)) {
        if (TC.imageId(url) !== assetId) continue;
        best = TC.betterUrl(best, url);
      }
    }
    return best;
  }

  // naturalWidth/naturalHeight describe the variant the browser chose to render
  // in the feed, which is usually NOT the largest srcset candidate we collect —
  // in one sample 58 of 84 records understated the file that was downloaded,
  // one of them by a factor of ten. Since those numbers decide whether a piece
  // is printable, measure the URL we actually hand over.
  function measure(url, fallbackImg) {
    return new Promise((resolve) => {
      const probe = new Image();
      const done = () =>
        resolve(
          probe.naturalWidth
            ? { width: probe.naturalWidth, height: probe.naturalHeight }
            : {
                width: fallbackImg.naturalWidth,
                height: fallbackImg.naturalHeight,
              },
        );
      probe.onload = done;
      probe.onerror = done;
      probe.src = url;
    });
  }

  // The main post = the one whose permalink matches the current shortcode. Several
  // anchors can link to it; each climbs to a different image-bearing ancestor, and
  // the loosest ones spill into replies. Pick the TIGHTEST root (fewest content
  // images) so we scope to the main post's own media, not the thread.
  function mainPostRoot(shortcode) {
    const anchors = document.querySelectorAll(`a[href*="/post/${shortcode}"]`);
    let bestRoot = null;
    let bestCount = Infinity;
    for (const a of anchors) {
      let el = a;
      for (let i = 0; i < 10 && el; i++) {
        if (el.querySelector) {
          const n = [...el.querySelectorAll("img")].filter(isContentImg).length;
          if (n) {
            if (n < bestCount) {
              bestCount = n;
              bestRoot = el;
            }
            break;
          }
        }
        el = el.parentElement;
      }
    }
    return bestRoot;
  }

  async function collectImagesFromRoot(root) {
    const seen = new Set();
    const found = [];
    for (const img of root.querySelectorAll("img")) {
      if (!isContentImg(img)) continue;
      const seed = bestUrl(img);
      if (!seed || TC.looksLikeVideoCover(seed)) continue;
      const id = TC.imageId(seed);
      if (seen.has(id)) continue;
      seen.add(id);
      found.push({ url: bestUrlForAsset(id) || seed, img });
    }
    return Promise.all(
      found.map(async ({ url, img }) => ({ url, ...(await measure(url, img)) })),
    );
  }

  // On the fullscreen media page the shown image is the one filling the viewport.
  // Carousel slides all stay mounted at the same rendered size (off-screen ones
  // are just translated away), so raw bounding-box area ties across every slide
  // and always picks slide 1. Score by ON-SCREEN area (rect clipped to the
  // viewport) instead, so the slide currently in view wins.
  function largestVisibleImage() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let best = null;
    let bestArea = 0;
    for (const img of document.querySelectorAll("img")) {
      if (!isContentImg(img)) continue;
      const r = img.getBoundingClientRect();
      const visW = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
      const visH = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      const area = visW * visH;
      if (area > bestArea) {
        bestArea = area;
        best = img;
      }
    }
    return best;
  }

  // Best-effort caption, length-bounded so it can't swallow the comment thread.
  function captionFor(root) {
    let best = "";
    for (const el of root.querySelectorAll("span, div")) {
      const t = (el.innerText || "").trim();
      if (t.length > best.length && t.length <= CAPTION_MAX) best = t;
    }
    return best.trim();
  }

  function buildPayload(mode, page, caption, images, filenames) {
    const dir = `art-collect/${page.handle}__${page.shortcode}`;
    const metadata = TC.buildMetadata({
      mode,
      handle: page.handle,
      shortcode: page.shortcode,
      postUrl: page.postUrl,
      caption,
      collectedAt: new Date().toISOString(),
      images: images.map((img, i) => ({
        url: img.url,
        width: img.width,
        height: img.height,
        filename: filenames[i],
      })),
    });
    // The folder is keyed on the shortcode, so every collect from one post lands
    // in it. A single-image collect writing metadata.json would overwrite the
    // post's own record — that is how a 10-image post ended up on disk described
    // as `{"mode":"single","imageCount":1}`. Singles get their own sidecar.
    const metaFile =
      mode === "single"
        ? `${dir}/${filenames[0].replace(/\.[a-z0-9]+$/i, "")}.json`
        : `${dir}/metadata.json`;
    return {
      dir,
      metadata,
      metaFile,
      files: images.map((img, i) => ({ url: img.url, filename: `${dir}/${filenames[i]}` })),
    };
  }

  async function send(payload, note, ingest) {
    const token = await getToken();
    payload.token = token;
    payload.ingest = ingest;
    payload.endpoint = INGEST_ENDPOINT;
    chrome.runtime.sendMessage({ type: "collect", payload });
    flashCollected(note, token);
  }

  async function collectPost(page) {
    const root = mainPostRoot(page.shortcode) || document.body;
    const images = await collectImagesFromRoot(root);
    if (!images.length) return flash("No images found in this post");

    // A carousel with one unprintable slide should still yield the rest.
    const usable = [];
    let tooSmall = 0;
    for (const img of images) {
      if (TC.printShortfall(img.width, img.height, img.url)) tooSmall++;
      else usable.push(img);
    }
    if (!usable.length) {
      return flash(`Nothing printable here - all ${images.length} image(s) too small`);
    }

    const caption = captionFor(root);
    const filenames = usable.map((img, i) => TC.buildFilename(i + 1, img.url));
    send(
      buildPayload("post", page, caption, usable, filenames),
      `Collected ${usable.length} image(s) from @${page.handle}` +
        (tooSmall ? ` - skipped ${tooSmall} too small` : ""),
      buildIngest(page, caption, usable)
    );
  }

  async function collectImage(page) {
    const el = largestVisibleImage();
    const seed = el && bestUrl(el);
    if (!seed) return flash("No image found on this page");
    const url = bestUrlForAsset(TC.imageId(seed)) || seed;
    const item = { url, ...(await measure(url, el)) };

    // We already know the true size here. Saying so now is the difference
    // between re-collecting in five seconds and discovering at print time,
    // weeks later, that the plate was a 320px thumbnail.
    const shortfall = TC.printShortfall(item.width, item.height, item.url);
    if (shortfall) return flash(`Not collected - ${shortfall}`);

    const idNum = (TC.imageId(url).match(/\d+/) || ["img"])[0];
    const filename = `single_${idNum}.${TC.extFromUrl(url)}`;
    const root = mainPostRoot(page.shortcode) || document.body;
    const caption = captionFor(root);
    send(
      buildPayload("single", page, caption, [item], [filename]),
      `Collected 1 image from @${page.handle}`,
      buildIngest(page, caption, [item])
    );
  }

  function ensureToast() {
    let el = document.getElementById("tc-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "tc-toast";
      document.body.appendChild(el);
    }
    return el;
  }

  function showToast(el, ms) {
    el.classList.add("tc-toast-show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("tc-toast-show"), ms || 2500);
  }

  function flash(text) {
    const el = ensureToast();
    el.style.pointerEvents = "none";
    el.textContent = text;
    showToast(el);
  }

  // Success toast with a live link into the hosted collection.
  function flashCollected(text, token) {
    const el = ensureToast();
    el.textContent = "";
    el.style.pointerEvents = "auto";
    el.append(`${text} · `);
    const a = document.createElement("a");
    a.href = `${MVP_URL}/c/${token}`;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "View collection ↗";
    a.className = "tc-toast-link";
    el.appendChild(a);
    showToast(el, 6000);
  }

  // Ensure exactly one floating button matching the current page type.
  function ensureFab(page) {
    const mode = page.type === "media" ? "image" : page.type === "post" ? "post" : null;
    let fab = document.getElementById("tc-fab");
    if (!mode) {
      if (fab) fab.remove();
      return;
    }
    if (!fab) {
      fab = document.createElement("button");
      fab.id = "tc-fab";
      // Full-color brand mark on a beige chip so its own colors read regardless
      // of the pill color (which signals the feature).
      const chip = document.createElement("span");
      chip.className = "tc-chip";
      const mark = document.createElement("img");
      mark.className = "tc-mark";
      mark.src = ICON_URL;
      mark.alt = "";
      chip.appendChild(mark);
      const label = document.createElement("span");
      label.className = "tc-fab-label";
      fab.append(chip, label);
      document.body.appendChild(fab);
    }
    fab.className = `tc-fab tc-fab--${mode}`;
    fab.querySelector(".tc-fab-label").textContent =
      mode === "image" ? "Collect image" : "Collect post";
    fab.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Both are async now — they probe the chosen URL for its true size — so
      // without this a failure is only an unhandled rejection in the console.
      (mode === "image" ? collectImage : collectPost)(page).catch((err) =>
        flash(`Collect failed: ${(err && err.message) || err}`),
      );
    };
  }

  function refresh() {
    ensureFab(TC.parsePage(location.pathname));
  }

  let t;
  const debounced = () => {
    clearTimeout(t);
    t = setTimeout(refresh, 300);
  };
  new MutationObserver(debounced).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", debounced);
  setInterval(refresh, 1000); // backstop for SPA pushState navigations
  refresh();
})();
