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

  // The caption is best-effort: Threads obfuscates structure, so we pick the
  // longest text block within a bound that keeps us from swallowing the whole
  // comment thread on a permalink page. handle + postUrl are the reliable keys.
  const CAPTION_MAX = 600;

  function captionFor(root) {
    let best = "";
    for (const el of root.querySelectorAll("span, div")) {
      const t = (el.innerText || "").trim();
      if (t.length > best.length && t.length <= CAPTION_MAX) best = t;
    }
    // Drop lines contributed by our own injected buttons (read from live innerText).
    return best
      .split("\n")
      .filter((line) => {
        const l = line.trim();
        return l !== "⬇" && l !== "⬇ Collect post";
      })
      .join("\n")
      .trim();
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
    send(
      buildPayload("post", perma, captionFor(root), images, filenames),
      `Collected ${images.length} image(s) from @${perma.handle}`
    );
  }

  function collectSingle(img, root, perma, index) {
    const url = bestUrl(img);
    if (!url) return;
    const item = { url, width: img.naturalWidth, height: img.naturalHeight };
    const filenames = [`single_${index}.${TC.extFromUrl(url)}`];
    send(
      buildPayload("single", perma, captionFor(root), [item], filenames),
      `Collected 1 image from @${perma.handle}`
    );
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
